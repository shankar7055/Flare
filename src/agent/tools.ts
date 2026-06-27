import nodemailer from "nodemailer";
import { google } from "googleapis";
import prisma from "../db";
import { GoogleOAuthHelper } from "../auth/oauth";

// ==========================================
// 1. TOOL IMPLEMENTATIONS
// ==========================================

async function calculateDayCapacity(userId: number, date: Date): Promise<{ availableMinutes: number, committedMinutes: number }> {
  // Get user's working hours
  const user = await prisma.user.findUnique({ where: { id: userId } });
  let workingHoursStart = "09:00";
  let workingHoursEnd = "17:00";
  
  if (user?.workingHoursStart) {
    workingHoursStart = user.workingHoursStart;
  }
  if (user?.workingHoursEnd) {
    workingHoursEnd = user.workingHoursEnd;
  }

  // Parse working hours to minutes since midnight
  const [startHour, startMinute] = workingHoursStart.split(":").map(Number);
  const [endHour, endMinute] = workingHoursEnd.split(":").map(Number);
  let totalAvailableMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);

  // Subtract Google Calendar busy time for that day
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  if (user?.googleOauthToken) {
    try {
      const parsedToken = JSON.parse(user.googleOauthToken);
      const refreshedToken = await GoogleOAuthHelper.refreshUserToken(parsedToken);
      if (refreshedToken) {
        const auth = GoogleOAuthHelper.getClient();
        auth.setCredentials(refreshedToken);
        const calendar = google.calendar({ version: "v3", auth });
        const response = await calendar.events.list({
          calendarId: "primary",
          timeMin: dayStart.toISOString(),
          timeMax: dayEnd.toISOString(),
          singleEvents: true,
          orderBy: "startTime",
        });
        (response.data.items || []).forEach((event) => {
          if (event.start?.dateTime && event.end?.dateTime) {
            const eventStart = new Date(event.start.dateTime);
            const eventEnd = new Date(event.end.dateTime);
            const durationMinutes = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60);
            totalAvailableMinutes -= Math.max(0, durationMinutes);
          }
        });
      }
    } catch (e) {
      console.warn("Failed to get Google Calendar busy time for capacity calculation", e);
    }
  }

  // Get committed time from schedule slots
  const scheduleSlots = await prisma.scheduleSlot.findMany({
    where: {
      task: { userId },
      startTime: { gte: dayStart },
      endTime: { lte: dayEnd }
    },
    include: { task: true }
  });

  let committedMinutes = 0;
  scheduleSlots.forEach(slot => {
    const duration = (slot.endTime.getTime() - slot.startTime.getTime()) / (1000 * 60);
    committedMinutes += duration;
  });

  return { availableMinutes: Math.max(0, totalAvailableMinutes), committedMinutes };
}

export async function checkDayCapacity(
  userId: number,
  args: { date: string }
): Promise<any> {
  const date = new Date(args.date);
  if (isNaN(date.getTime())) {
    return { error: "Invalid date format" };
  }

  const { availableMinutes, committedMinutes } = await calculateDayCapacity(userId, date);
  return {
    available_minutes: availableMinutes,
    committed_minutes: committedMinutes,
    overcommitted: committedMinutes > availableMinutes
  };
}

export async function getTasks(
  userId: number,
  args: { status?: string; deadline_before?: string; priority?: string }
): Promise<any[]> {
  const whereClause: any = { userId };

  if (args?.status) {
    whereClause.status = args.status.toLowerCase();
  }
  if (args?.priority) {
    whereClause.priority = args.priority.toLowerCase();
  }
  if (args?.deadline_before) {
    try {
      whereClause.deadline = {
        lte: new Date(args.deadline_before)
      };
    } catch (e) {
      console.warn(`Invalid date format for deadline_before: ${args.deadline_before}`);
    }
  }

  const tasks = await prisma.task.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" }
  });

  return tasks.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    deadline: t.deadline.toISOString(),
    estimated_minutes: t.estimatedMinutes,
    priority: t.priority,
    status: t.status,
    parent_task_id: t.parentTaskId,
    created_at: t.createdAt.toISOString(),
    started_at: t.startedAt ? t.startedAt.toISOString() : null,
    completed_at: t.completedAt ? t.completedAt.toISOString() : null
  }));
}

export async function createTask(
  userId: number,
  args: {
    title: string;
    deadline: string;
    estimated_minutes?: number;
    priority?: string;
    isRecurring?: boolean;
    recurrenceRule?: string;
  }
): Promise<any> {
  const deadlineDate = new Date(args.deadline);
  if (isNaN(deadlineDate.getTime())) {
    throw new Error(`Invalid deadline ISO string: ${args.deadline}`);
  }

  const task = await prisma.task.create({
    data: {
      userId,
      title: args.title,
      deadline: deadlineDate,
      estimatedMinutes: args.estimated_minutes ?? 60,
      priority: (args.priority ?? "medium").toLowerCase(),
      status: "pending",
      isRecurring: args.isRecurring ?? false,
      recurrenceRule: args.recurrenceRule ?? null,
      streakCount: args.isRecurring ? 0 : undefined
    }
  });

  return {
    id: task.id,
    title: task.title,
    deadline: task.deadline.toISOString(),
    estimated_minutes: task.estimatedMinutes,
    priority: task.priority,
    status: task.status,
    isRecurring: task.isRecurring,
    recurrenceRule: task.recurrenceRule
  };
}

export async function breakDownTask(
  userId: number,
  args: { task_id: number; subtasks: Array<{ title: string; estimated_minutes: number; order?: number }> }
): Promise<any> {
  const parentTaskId = Number(args.task_id);
  const parentTask = await prisma.task.findFirst({
    where: { id: parentTaskId, userId }
  });

  if (!parentTask) {
    return { success: false, error: "Parent task not found" };
  }

  const createdSubtasks = [];
  for (const sub of args.subtasks) {
    const subTask = await prisma.task.create({
      data: {
        userId,
        title: sub.title,
        deadline: parentTask.deadline,
        estimatedMinutes: sub.estimated_minutes ?? 15,
        priority: parentTask.priority,
        status: "pending",
        parentTaskId
      }
    });
    createdSubtasks.push(subTask);
  }

  // Update parent task to in_progress if pending
  if (parentTask.status === "pending") {
    await prisma.task.update({
      where: { id: parentTaskId },
      data: { status: "in_progress" }
    });
  }

  return {
    success: true,
    parent_task_id: parentTaskId,
    subtasks_created: createdSubtasks.map(s => ({
      id: s.id,
      title: s.title,
      estimated_minutes: s.estimatedMinutes
    }))
  };
}

async function getGoogleCalendarClient(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.googleOauthToken) return null;

  try {
    const parsedToken = JSON.parse(user.googleOauthToken);
    const refreshedToken = await GoogleOAuthHelper.refreshUserToken(parsedToken);
    if (!refreshedToken) {
      console.warn(`Could not refresh Google OAuth credentials for user ${userId}.`);
      return null;
    }

    // Save back refreshed credentials if they changed
    if (JSON.stringify(refreshedToken) !== user.googleOauthToken) {
      await prisma.user.update({
        where: { id: userId },
        data: { googleOauthToken: JSON.stringify(refreshedToken) }
      });
    }

    const auth = GoogleOAuthHelper.getClient();
    auth.setCredentials(refreshedToken);
    return google.calendar({ version: "v3", auth });
  } catch (error) {
    console.warn("Failed to configure Google Calendar client:", error);
    return null;
  }
}

async function validateWorkingHours(userId: number, startDt: Date, endDt: Date): Promise<{ success: boolean, error?: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: "User not found" };
  
  const workingHoursStart = user.workingHoursStart || "09:00";
  const workingHoursEnd = user.workingHoursEnd || "17:00";
  const timezone = user.timezone || "UTC";

  const checkInHours = (date: Date) => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const parts = formatter.formatToParts(date);
      const hour = parts.find(p => p.type === 'hour')?.value;
      const minute = parts.find(p => p.type === 'minute')?.value;
      if (!hour || !minute) return false;
      const timeVal = `${hour}:${minute}`;
      return timeVal >= workingHoursStart && timeVal <= workingHoursEnd;
    } catch (e) {
      const hour = String(date.getUTCHours()).padStart(2, '0');
      const minute = String(date.getUTCMinutes()).padStart(2, '0');
      const timeVal = `${hour}:${minute}`;
      return timeVal >= workingHoursStart && timeVal <= workingHoursEnd;
    }
  };

  if (!checkInHours(startDt) || !checkInHours(endDt)) {
    return {
      success: false,
      error: `Proposed time range (${startDt.toISOString()} to ${endDt.toISOString()}) falls outside user working hours (${workingHoursStart}-${workingHoursEnd} ${timezone}).`
    };
  }

  return { success: true };
}

export async function checkCalendarConflicts(
  userId: number,
  args: { start_time: string; end_time: string; exclude_task_id?: number }
): Promise<any> {
  const startDt = new Date(args.start_time);
  const endDt = new Date(args.end_time);

  if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) {
    return { conflict: true, error: "Invalid start or end time format" };
  }

  if (startDt >= endDt) {
    return { conflict: true, error: "Invalid time range: start_time must be before end_time" };
  }

  // Validate working hours
  const workingHoursCheck = await validateWorkingHours(userId, startDt, endDt);
  if (!workingHoursCheck.success) {
    return { conflict: true, error: workingHoursCheck.error };
  }

  // Handle null/undefined exclude_task_id
  let excludeTaskId: number | undefined = undefined;
  if (args.exclude_task_id != null) { // checks both null and undefined
    const parsed = Number(args.exclude_task_id);
    if (!isNaN(parsed) && Number.isInteger(parsed)) {
      excludeTaskId = parsed;
    }
  }

  // Attempt Google Calendar
  const calendar = await getGoogleCalendarClient(userId);
  if (calendar) {
    try {
      const response = await calendar.events.list({
        calendarId: "primary",
        timeMin: startDt.toISOString(),
        timeMax: endDt.toISOString(),
        singleEvents: true,
        orderBy: "startTime"
      });
      const events = response.data.items || [];
      if (events.length > 0) {
        return {
          conflict: true,
          source: "google_calendar",
          conflicts: events.map(e => e.summary || "Busy")
        };
      }
      return { conflict: false, source: "google_calendar", conflicts: [] };
    } catch (e) {
      console.warn("Google Calendar conflict check failed, falling back to local DB check:", e);
    }
  }

  // Database Fallback
  console.log("Using local database fallback to check conflicts.");
  const whereClause: any = {
    task: { userId },
    OR: [
      {
        startTime: { lte: startDt },
        endTime: { gt: startDt }
      },
      {
        startTime: { lt: endDt },
        endTime: { gte: endDt }
      },
      {
        startTime: { gte: startDt },
        endTime: { lte: endDt }
      }
    ]
  };
  if (excludeTaskId) {
    whereClause.taskId = { not: excludeTaskId };
  }

  const overlappingSlots = await prisma.scheduleSlot.findMany({
    where: whereClause,
    include: { task: true }
  });

  if (overlappingSlots.length > 0) {
    return {
      conflict: true,
      source: "database_fallback",
      conflicts: overlappingSlots.map(s => s.task.title)
    };
  }

  return { conflict: false, source: "database_fallback", conflicts: [] };
}

// Add cancel_schedule_slot tool
export async function cancelScheduleSlot(
  userId: number,
  args: { slot_id?: number; task_id?: number }
): Promise<any> {
  if (!args.slot_id && !args.task_id) {
    return { success: false, error: "Must provide either slot_id or task_id" };
  }

  const deleteWhere: any = { task: { userId } };
  if (args.slot_id) {
    deleteWhere.id = Number(args.slot_id);
  } else if (args.task_id) {
    deleteWhere.taskId = Number(args.task_id);
  }

  const deleted = await prisma.scheduleSlot.deleteMany({
    where: deleteWhere
  });

  return {
    success: true,
    deleted_count: deleted.count
  };
}

export async function scheduleTask(
  userId: number,
  args: { task_id: number; start_time: string; end_time: string }
): Promise<any> {
  const taskId = Number(args.task_id);
  const startDt = new Date(args.start_time);
  const endDt = new Date(args.end_time);

  if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) {
    return { success: false, error: "Invalid slot duration dates" };
  }

  if (startDt >= endDt) {
    return { success: false, error: "Invalid time range: start_time must be before end_time" };
  }

  // Validate working hours
  const workingHoursCheck = await validateWorkingHours(userId, startDt, endDt);
  if (!workingHoursCheck.success) {
    return { success: false, error: workingHoursCheck.error };
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId }
  });
  if (!task) {
    return { success: false, error: "Task not found" };
  }

  let calendarEventId: string | null = null;

  // Cancel any existing schedule slots for this task first (prevent duplicates)
  const existingSlots = await prisma.scheduleSlot.findMany({
    where: { taskId, task: { userId } }
  });
  if (existingSlots.length > 0) {
    console.log(`Found ${existingSlots.length} existing slots for task ${taskId}; deleting them first.`);
    const calendar = await getGoogleCalendarClient(userId);
    for (const slot of existingSlots) {
      // Delete from Google Calendar if exists
      if (slot.calendarEventId && calendar) {
        try {
          await calendar.events.delete({
            calendarId: "primary",
            eventId: slot.calendarEventId
          });
        } catch (e) {
          console.warn(`Failed to delete Google Calendar event ${slot.calendarEventId} for task ${taskId}:`, e);
        }
      }
      // Delete from DB
      await prisma.scheduleSlot.delete({ where: { id: slot.id } });
    }
  }

  // Google Calendar Insertion
  const calendar = await getGoogleCalendarClient(userId);
  if (calendar) {
    try {
      const response = await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: task.title,
          description: task.description || "Scheduled by Agentic Life Saver Node",
          start: { dateTime: startDt.toISOString() },
          end: { dateTime: endDt.toISOString() }
        }
      });
      calendarEventId = response.data.id || null;
      console.log(`Scheduled Google Calendar Event: ${calendarEventId}`);
    } catch (e) {
      console.warn("Failed to create Google Calendar event, creating local DB slot only:", e);
    }
  }

  if (!calendarEventId) {
    console.log(`No Google Calendar integration, slot saved in DB only.`);
  }

  // Create Schedule Slot
  const slot = await prisma.scheduleSlot.create({
    data: {
      taskId,
      startTime: startDt,
      endTime: endDt,
      source: "agent",
      calendarEventId
    }
  });

  // Set Task to in_progress if pending
  if (task.status === "pending") {
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "in_progress" }
    });
  }

  return {
    success: true,
    schedule_slot_id: slot.id,
    calendar_event_id: slot.calendarEventId,
    start_time: slot.startTime.toISOString(),
    end_time: slot.endTime.toISOString()
  };
}

export async function sendNotification(
  userId: number,
  args: { task_id: number; message: string; urgency: string; channel?: string; bypass_cooldown?: boolean }
): Promise<any> {
  const taskId = Number(args.task_id);
  const now = new Date();

  // 30 minute cooldown check per task
  if (!args.bypass_cooldown) {
    const cooldownCutoff = new Date(now.getTime() - 30 * 60 * 1000);
    const recentLog = await prisma.notificationLog.findFirst({
      where: {
        taskId,
        sentAt: { gte: cooldownCutoff }
      }
    });

    if (recentLog) {
      console.warn(`Duplicate notification cooldown active for task ${taskId}. Skiped.`);
      return {
        success: false,
        reason: "cooldown",
        message: "Notification cooldown active. Must wait 30 minutes between notifications for the same task."
      };
    }
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { success: false, error: "User not found" };
  }

  const deliveryChannel = args.channel ?? user.preferredChannel ?? "email";
  let deliverySuccess = false;

  if (deliveryChannel === "email") {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const userEmail = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const fromAddress = process.env.SMTP_FROM || userEmail;

    if (host && userEmail && pass) {
      try {
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user: userEmail, pass }
        });

        await transporter.sendMail({
          from: fromAddress,
          to: user.email,
          subject: `[${args.urgency.toUpperCase()}] Life Saver Alert: Task Action Required`,
          text: args.message
        });

        deliverySuccess = true;
        console.log(`SMTP notification successfully sent to ${user.email}`);
      } catch (err) {
        console.warn("SMTP email notification delivery failed:", err);
        deliverySuccess = false;
      }
    } else {
      console.log(`SMTP not fully configured. Cannot send email to ${user.email}`);
      deliverySuccess = true;
    }
  } else {
    // SMS / Push notifications stubs
    console.warn(`Delivery channel [${deliveryChannel}] is not implemented yet. Failed to send: ${args.message}`);
    deliverySuccess = false;
  }

  // Create Log
  const log = await prisma.notificationLog.create({
    data: {
      taskId,
      userId,
      channel: deliveryChannel,
      urgency: args.urgency,
      message: args.message
    }
  });

  return {
    success: deliverySuccess,
    notification_log_id: log.id,
    channel: deliveryChannel,
    urgency: args.urgency
  };
}

export async function escalateTask(
  userId: number,
  args: { task_id: number; suggested_deferred_task_id?: number }
): Promise<any> {
  const taskId = Number(args.task_id);
  const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
  if (!task) {
    return { success: false, error: "Main task not found" };
  }

  let message = `CRITICAL: Task '${task.title}' is close to its deadline (${task.deadline.toISOString()}) and is not completed!`;

  if (args.suggested_deferred_task_id) {
    const deferredId = Number(args.suggested_deferred_task_id);
    const deferredTask = await prisma.task.findFirst({ where: { id: deferredId, userId } });
    if (deferredTask) {
      message += `\nRecommendation: Defer task '${deferredTask.title}' to free up required working hours.`;
    }
  }

  const response = await sendNotification(userId, {
    task_id: taskId,
    message,
    urgency: "critical",
    bypass_cooldown: true
  });

  return {
    success: response.success,
    escalation_sent: response.success,
    message,
    notification: response
  };
}

export async function generateRescuePlan(
  userId: number,
  args: { task_id: number; time_remaining_minutes: number; plan: Array<{ start_time: string; action: string; duration_minutes: number }> }
): Promise<any> {
  const taskId = Number(args.task_id);
  const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
  if (!task) {
    return { success: false, error: "Task not found" };
  }

  // Defensively calculate actual time remaining since LLMs frequently hallucinate this math
  const calculatedMins = Math.max(0, Math.floor((task.deadline.getTime() - Date.now()) / 60000));
  args.time_remaining_minutes = calculatedMins;

  // Persist RescuePlan
  const rescuePlan = await prisma.rescuePlan.create({
    data: {
      taskId,
      steps: JSON.stringify(args.plan),
      notified: true
    }
  });

  // Construct message
  let planTxt = "";
  args.plan.forEach((step, idx) => {
    planTxt += `\n${idx + 1}. [${step.start_time}] ${step.action} (${step.duration_minutes} mins)`;
  });

  const message = `🚨 EMERGENCY RESCUE PLAN FOR TASK: ${task.title}\nDeadline is in ${args.time_remaining_minutes} minutes. Complete these steps NOW:${planTxt}`;

  // Notify user
  const notifRes = await sendNotification(userId, {
    task_id: taskId,
    message,
    urgency: "critical"
  });

  return {
    success: true,
    rescue_plan_id: rescuePlan.id,
    notification: notifRes
  };
}

export async function getUserPatterns(userId: number): Promise<any> {
  // 1. Avg Lead Time: Created -> Started
  const tasks = await prisma.task.findMany({
    where: { userId, startedAt: { not: null } }
  });

  let avgLead = 120.0;
  if (tasks.length > 0) {
    const leads = tasks.map(t => {
      const start = t.startedAt ? t.startedAt.getTime() : 0;
      const created = t.createdAt.getTime();
      return (start - created) / (60 * 1000);
    });
    avgLead = leads.reduce((a, b) => a + b, 0) / leads.length;
  }

  // 2. Channel Response Rates
  const logs = await prisma.notificationLog.findMany({
    where: { userId }
  });

  const counts: Record<string, number> = {};
  const responses: Record<string, number> = {};
  logs.forEach(log => {
    counts[log.channel] = (counts[log.channel] || 0) + 1;
    if (log.userResponse) {
      responses[log.channel] = (responses[log.channel] || 0) + 1;
    }
  });

  const rates: Record<string, number> = {};
  ["email", "sms", "push"].forEach(ch => {
    const total = counts[ch] || 0;
    const resp = responses[ch] || 0;
    rates[ch] = total > 0 ? resp / total : 0.5;
  });

  // 3. Peak Productivity Hours (Tasks completed hour)
  const completedTasks = await prisma.task.findMany({
    where: { userId, status: "completed", completedAt: { not: null } }
  });

  const hoursMap: Record<number, number> = {};
  completedTasks.forEach(t => {
    if (t.completedAt) {
      const hr = t.completedAt.getHours();
      hoursMap[hr] = (hoursMap[hr] || 0) + 1;
    }
  });

  const sortedHours = Object.keys(hoursMap)
    .map(Number)
    .sort((a, b) => hoursMap[b] - hoursMap[a]);

  return {
    avg_lead_time_before_start_minutes: avgLead,
    channel_response_rates: rates,
    peak_productivity_hours: sortedHours.length > 0 ? sortedHours : [9, 10, 11, 14, 15, 16]
  };
}

export async function logUserFeedback(
  userId: number,
  args: { task_id: number; completed_on_time: boolean; reminder_helpful: boolean }
): Promise<any> {
  const taskId = Number(args.task_id);
  const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
  if (!task) {
    return { success: false, error: "Task not found" };
  }

  const now = new Date();

  // Handle recurring tasks: streak and next occurrence
  let streakUpdated = { streakCount: task.streakCount, lastCompletedDate: task.lastCompletedDate };
  if (task.isRecurring && task.recurrenceRule) {
    let shouldIncrementStreak = false;

    if (task.lastCompletedDate) {
      const last = new Date(task.lastCompletedDate);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastDate = new Date(last.getFullYear(), last.getMonth(), last.getDate());

      if (task.recurrenceRule === "daily") {
        const diffDays = (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
        shouldIncrementStreak = diffDays <= 1;
      } else if (task.recurrenceRule === "weekdays") {
        const diffDays = (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays === 1) {
          const day = today.getDay();
          shouldIncrementStreak = day >= 1 && day <= 5;
        } else if (diffDays <= 3) {
          shouldIncrementStreak = true;
        }
      } else if (task.recurrenceRule === "weekly") {
        const diffDays = (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
        shouldIncrementStreak = diffDays <= 7;
      }
    } else {
      shouldIncrementStreak = true;
    }

    streakUpdated.streakCount = shouldIncrementStreak ? task.streakCount + 1 : 0;
    streakUpdated.lastCompletedDate = now;

    // Calculate next deadline
    let nextDeadline = new Date(task.deadline);
    if (task.recurrenceRule === "daily") {
      nextDeadline.setDate(nextDeadline.getDate() + 1);
    } else if (task.recurrenceRule === "weekdays") {
      let day = nextDeadline.getDay();
      let addDays = 1;
      if (day === 5) addDays = 3; // Friday → Monday
      if (day === 6) addDays = 2; // Saturday → Monday
      nextDeadline.setDate(nextDeadline.getDate() + addDays);
    } else if (task.recurrenceRule === "weekly") {
      nextDeadline.setDate(nextDeadline.getDate() + 7);
    }

    // Create next occurrence
    await prisma.task.create({
      data: {
        userId,
        title: task.title,
        description: task.description,
        deadline: nextDeadline,
        estimatedMinutes: task.estimatedMinutes,
        priority: task.priority,
        status: "pending",
        isRecurring: true,
        recurrenceRule: task.recurrenceRule,
        streakCount: streakUpdated.streakCount,
        lastCompletedDate: streakUpdated.lastCompletedDate
      }
    });
  }

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: "completed",
      completedAt: now,
      ...(task.isRecurring && {
        streakCount: streakUpdated.streakCount,
        lastCompletedDate: streakUpdated.lastCompletedDate
      })
    }
  });

  // Bind response action to latest notification log
  const latestNotif = await prisma.notificationLog.findFirst({
    where: { taskId, userId },
    orderBy: { sentAt: "desc" }
  });

  if (latestNotif) {
    await prisma.notificationLog.update({
      where: { id: latestNotif.id },
      data: {
        userResponse: args.completed_on_time ? "completed_after" : "ignored"
      }
    });
  }

  return {
    success: true,
    task_id: taskId,
    completed_at: now.toISOString(),
    feedback_logged: true,
    streak_count: task.isRecurring ? streakUpdated.streakCount : undefined
  };
}

// New tool: get_recurring_task_status
export async function getRecurringTaskStatus(userId: number): Promise<any> {
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      isRecurring: true
    },
    orderBy: {
      streakCount: "desc"
    }
  });

  return tasks.map(t => ({
    id: t.id,
    title: t.title,
    recurrenceRule: t.recurrenceRule,
    streakCount: t.streakCount,
    lastCompletedDate: t.lastCompletedDate?.toISOString()
  }));
}

// ==========================================
// 2. SCHEMA DECLARATIONS FOR GEMINI
// ==========================================

export const toolsDeclarations = [
  {
    name: "check_day_capacity",
    description: "Check the user's available capacity for a specific date. Returns available minutes, committed minutes, and whether the day is overcommitted.",
    parameters: {
      type: "OBJECT",
      properties: {
        date: { type: "STRING", description: "ISO-8601 string: date to check capacity for (YYYY-MM-DD or full timestamp)" }
      },
      required: ["date"]
    }
  },
  {
    name: "get_recurring_task_status",
    description: "Get the status of all recurring tasks, including current streak counts",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  },
  {
    name: "get_tasks",
    description: "Query the database for the user's tasks with optional status, priority, and deadline filters.",
    parameters: {
      type: "OBJECT",
      properties: {
        status: {
          type: "STRING",
          description: "Filter by task status: pending, in_progress, completed, overdue",
          enum: ["pending", "in_progress", "completed", "overdue"]
        },
        priority: {
          type: "STRING",
          description: "Filter by task priority: low, medium, high, critical",
          enum: ["low", "medium", "high", "critical"]
        },
        deadline_before: {
          type: "STRING",
          description: "ISO-8601 string: filter tasks with a deadline before this time."
        }
      }
    }
  },
  {
    name: "create_task",
    description: "Create a new task in the database for the user.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", description: "Task title" },
        deadline: { type: "STRING", description: "ISO-8601 string: task deadline date and time" },
        estimated_minutes: { type: "INTEGER", description: "Estimated duration in minutes (default is 60)" },
        priority: {
          type: "STRING",
          description: "Task priority: low, medium, high, critical",
          enum: ["low", "medium", "high", "critical"]
        }
      },
      required: ["title", "deadline"]
    }
  },
  {
    name: "break_down_task",
    description: "Break a complex task down into multiple smaller subtasks linked to the parent task.",
    parameters: {
      type: "OBJECT",
      properties: {
        task_id: { type: "INTEGER", description: "ID of the parent task" },
        subtasks: {
          type: "ARRAY",
          description: "List of subtasks to create",
          items: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING", description: "Subtask title" },
              estimated_minutes: { type: "INTEGER", description: "Estimated duration" },
              order: { type: "INTEGER", description: "Sequence order of the subtask" }
            },
            required: ["title", "estimated_minutes"]
          }
        }
      },
      required: ["task_id", "subtasks"]
    }
  },
  {
    name: "check_calendar_conflicts",
    description: "Check if a specific time slot conflicts with existing events on the user's calendar.",
    parameters: {
      type: "OBJECT",
      properties: {
        start_time: { type: "STRING", description: "ISO-8601 string: start time of slot to check" },
        end_time: { type: "STRING", description: "ISO-8601 string: end time of slot to check" },
        exclude_task_id: { type: "INTEGER", description: "Optional ID of a task whose slots to exclude from conflict check" }
      },
      required: ["start_time", "end_time"]
    }
  },
  {
    name: "cancel_schedule_slot",
    description: "Cancel (delete) an existing schedule slot for a task. Can cancel by slot_id or all slots for a task.",
    parameters: {
      type: "OBJECT",
      properties: {
        slot_id: { type: "INTEGER", description: "ID of the specific slot to cancel" },
        task_id: { type: "INTEGER", description: "ID of the task whose slots to cancel (cancels all slots if provided)" }
      }
    }
  },
  {
    name: "schedule_task",
    description: "Schedule a task at a specific start and end time. Creates a slot in the database and a Google Calendar event.",
    parameters: {
      type: "OBJECT",
      properties: {
        task_id: { type: "INTEGER", description: "ID of the task to schedule" },
        start_time: { type: "STRING", description: "ISO-8601 string: event start time" },
        end_time: { type: "STRING", description: "ISO-8601 string: event end time" }
      },
      required: ["task_id", "start_time", "end_time"]
    }
  },
  {
    name: "send_notification",
    description: "Send a notification alert to the user. Enforces a 30-minute cooldown per task.",
    parameters: {
      type: "OBJECT",
      properties: {
        task_id: { type: "INTEGER", description: "ID of the task triggering this notification" },
        message: { type: "STRING", description: "Body content of the notification message" },
        urgency: {
          type: "STRING",
          description: "Urgency scale: low, medium, high, critical",
          enum: ["low", "medium", "high", "critical"]
        },
        channel: {
          type: "STRING",
          description: "Optional delivery channel: email, sms, push",
          enum: ["email", "sms", "push"]
        }
      },
      required: ["task_id", "message", "urgency"]
    }
  },
  {
    name: "escalate_task",
    description: "Escalate an uncompleted task close to its deadline, triggering an urgent message and suggesting another task to defer.",
    parameters: {
      type: "OBJECT",
      properties: {
        task_id: { type: "INTEGER", description: "ID of the task to escalate" },
        suggested_deferred_task_id: { type: "INTEGER", description: "Optional ID of another task to suggest deferring" }
      },
      required: ["task_id"]
    }
  },
  {
    name: "generate_rescue_plan",
    description: "Generate a sequential, immediate step-by-step rescue plan for an urgent task, persisting it and notifying the user.",
    parameters: {
      type: "OBJECT",
      properties: {
        task_id: { type: "INTEGER", description: "ID of the task to rescue" },
        time_remaining_minutes: { type: "INTEGER", description: "Time remaining in minutes until the deadline" },
        plan: {
          type: "ARRAY",
          description: "The ordered steps of the plan",
          items: {
            type: "OBJECT",
            properties: {
              start_time: { type: "STRING", description: "Start time (e.g. HH:MM or ISO timestamp)" },
              action: { type: "STRING", description: "Detailed action to take" },
              duration_minutes: { type: "INTEGER", description: "Duration in minutes" }
            },
            required: ["start_time", "action", "duration_minutes"]
          }
        }
      },
      required: ["task_id", "time_remaining_minutes", "plan"]
    }
  },
  {
    name: "get_user_patterns",
    description: "Fetch calculated history patterns for the user including average task lead time, preferred channel response rates, and peak hours.",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  },
  {
    name: "log_user_feedback",
    description: "Log feedback for a completed task (helpful reminder or completed on time). Marks the task as completed.",
    parameters: {
      type: "OBJECT",
      properties: {
        task_id: { type: "INTEGER", description: "ID of the completed task" },
        completed_on_time: { type: "BOOLEAN", description: "Did the user complete the task on time?" },
        reminder_helpful: { type: "BOOLEAN", description: "Was the agent's reminders/coaching helpful?" }
      },
      required: ["task_id", "completed_on_time", "reminder_helpful"]
    }
  }
];

// ==========================================
// 3. EXECUTION ROUTER MAPPER
// ==========================================

export async function executeTool(
  name: string,
  args: any,
  userId: number
): Promise<any> {
  console.log(`Executing tool: ${name} for user ${userId} with args:`, args);

  try {
    switch (name) {
      case "check_day_capacity":
        return await checkDayCapacity(userId, args);
      case "get_recurring_task_status":
        return await getRecurringTaskStatus(userId);
      case "get_tasks":
        return await getTasks(userId, args);
      case "create_task":
        return await createTask(userId, args);
      case "break_down_task":
        return await breakDownTask(userId, args);
      case "check_calendar_conflicts":
        return await checkCalendarConflicts(userId, args);
      case "cancel_schedule_slot":
        return await cancelScheduleSlot(userId, args);
      case "schedule_task":
        return await scheduleTask(userId, args);
      case "send_notification":
        return await sendNotification(userId, args);
      case "escalate_task":
        return await escalateTask(userId, args);
      case "generate_rescue_plan":
        return await generateRescuePlan(userId, args);
      case "get_user_patterns":
        return await getUserPatterns(userId);
      case "log_user_feedback":
        return await logUserFeedback(userId, args);
      default:
        return { error: `Tool ${name} is not implemented.` };
    }
  } catch (error: any) {
    console.error(`Error in tool execution of ${name}:`, error);
    return { error: error.message || String(error) };
  }
}
