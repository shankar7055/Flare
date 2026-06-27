import { Router, Response } from "express";
import prisma from "../db";
import { authenticateJWT, AuthenticatedRequest } from "../middleware/auth";
import { logUserFeedback } from "../agent/tools";
import { runAgentCycle } from "../agent/orchestrator";
import { parseNaturalLanguageTask } from "../agent/parser";

const router = Router();

// Apply authentication to all task routes
router.use(authenticateJWT as any);

// POST /tasks
router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  const { title, description, deadline, estimated_minutes, priority, is_recurring, recurrence_rule } = req.body;

  if (!title || !deadline) {
    return res.status(400).json({ error: "Missing task title or deadline" });
  }

  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime())) {
    return res.status(400).json({ error: "Invalid ISO deadline string" });
  }

  // Validate recurrence_rule if is_recurring is true
  const validRecurrenceRules = ["daily", "weekdays", "weekly"];
  if (is_recurring && recurrence_rule && !validRecurrenceRules.includes(recurrence_rule)) {
    return res.status(400).json({ error: "Invalid recurrence_rule. Must be 'daily', 'weekdays', or 'weekly'." });
  }

  try {
    const task = await prisma.task.create({
      data: {
        userId: req.user!.id,
        title,
        description: description || null,
        deadline: deadlineDate,
        estimatedMinutes: estimated_minutes ?? 60,
        priority: (priority ?? "medium").toLowerCase(),
        status: "pending",
        isRecurring: Boolean(is_recurring),
        recurrenceRule: is_recurring ? recurrence_rule : null
      }
    });

    // Asynchronously trigger re-prioritization/scheduling cycle
    runAgentCycle(req.user!.id, "new_task").catch(err => {
      console.error(`Error running new_task agent cycle for user ${req.user!.id}:`, err);
    });

    return res.status(201).json(task);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to create task" });
  }
});


// GET /tasks
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  const statusFilter = req.query.status as string;
  const whereClause: any = { userId: req.user!.id };

  if (statusFilter) {
    whereClause.status = statusFilter.toLowerCase();
  }

  try {
    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        rescuePlans: {
          orderBy: { generatedAt: "desc" },
          take: 1
        },
        scheduleSlots: true
      },
      orderBy: { createdAt: "desc" }
    });
    return res.status(200).json(tasks);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to retrieve tasks" });
  }
});

// GET /tasks/:id
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  const taskId = Number(req.params.id);
  if (isNaN(taskId)) {
    return res.status(400).json({ error: "Invalid task ID" });
  }

  try {
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId: req.user!.id },
      include: {
        rescuePlans: {
          orderBy: { generatedAt: "desc" },
          take: 1
        },
        scheduleSlots: true
      }
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    return res.status(200).json(task);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to retrieve task details" });
  }
});

// PATCH /tasks/:id
router.patch("/:id", async (req: AuthenticatedRequest, res: Response) => {
  const taskId = Number(req.params.id);
  if (isNaN(taskId)) {
    return res.status(400).json({ error: "Invalid task ID" });
  }

  try {
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId: req.user!.id }
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const { 
      title, description, deadline, estimated_minutes, priority, status, started_at, completed_at,
      is_recurring, recurrence_rule
    } = req.body;
    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (estimated_minutes !== undefined) updateData.estimatedMinutes = estimated_minutes;
    if (priority !== undefined) updateData.priority = priority.toLowerCase();
    if (status !== undefined) updateData.status = status.toLowerCase();

    if (deadline !== undefined) {
      const parsedDeadline = new Date(deadline);
      if (isNaN(parsedDeadline.getTime())) {
        return res.status(400).json({ error: "Invalid ISO deadline date" });
      }
      updateData.deadline = parsedDeadline;
    }

    if (started_at !== undefined) {
      updateData.startedAt = started_at ? new Date(started_at) : null;
    }
    if (completed_at !== undefined) {
      updateData.completedAt = completed_at ? new Date(completed_at) : null;
    }
    if (is_recurring !== undefined) {
      updateData.isRecurring = Boolean(is_recurring);
    }
    if (recurrence_rule !== undefined) {
      const validRecurrenceRules = ["daily", "weekdays", "weekly", null];
      if (recurrence_rule && !validRecurrenceRules.includes(recurrence_rule)) {
        return res.status(400).json({ error: "Invalid recurrence_rule. Must be 'daily', 'weekdays', or 'weekly'." });
      }
      updateData.recurrenceRule = recurrence_rule;
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData
    });

    return res.status(200).json(updatedTask);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to update task" });
  }
});

// DELETE /tasks/:id
router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  const taskId = Number(req.params.id);
  if (isNaN(taskId)) {
    return res.status(400).json({ error: "Invalid task ID" });
  }

  try {
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId: req.user!.id }
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    await prisma.task.delete({ where: { id: taskId } });
    return res.status(204).send();
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to delete task" });
  }
});

// POST /tasks/:id/feedback
router.post("/:id/feedback", async (req: AuthenticatedRequest, res: Response) => {
  const taskId = Number(req.params.id);
  if (isNaN(taskId)) {
    return res.status(400).json({ error: "Invalid task ID" });
  }

  const { completed_on_time, reminder_helpful } = req.body;
  if (completed_on_time === undefined || reminder_helpful === undefined) {
    return res.status(400).json({ error: "Missing feedback parameter fields" });
  }

  try {
    const response = await logUserFeedback(req.user!.id, {
      task_id: taskId,
      completed_on_time: Boolean(completed_on_time),
      reminder_helpful: Boolean(reminder_helpful)
    });

    if (!response.success) {
      return res.status(404).json({ error: response.error || "Failed to log feedback" });
    }

    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to log feedback" });
  }
});

// POST /tasks/parse
router.post("/parse", async (req: AuthenticatedRequest, res: Response) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Missing text input" });
  }

  try {
    const parsed = await parseNaturalLanguageTask(text, req.user!.id);
    
    const task = await prisma.task.create({
      data: {
        userId: req.user!.id,
        title: parsed.title,
        description: parsed.description || null,
        deadline: parsed.deadline,
        estimatedMinutes: parsed.estimated_minutes,
        priority: parsed.priority.toLowerCase(),
        status: "pending"
      }
    });

    // Run the agent cycle synchronously
    const agentRun = await runAgentCycle(req.user!.id, "new_task");

    return res.status(201).json({
      task,
      agentRun: agentRun ? {
        ...agentRun,
        reasoningTrace: JSON.parse(agentRun.reasoningTrace),
        actionsTaken: JSON.parse(agentRun.actionsTaken)
      } : {
        id: -1,
        userId: req.user!.id,
        triggerType: "new_task",
        reasoningTrace: [{ role: "model", parts: [{ text: "An agent cycle is already running for you. Your task has been created, and scheduling is queued." }] }],
        actionsTaken: [],
        createdAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to parse and create task" });
  }
});

export default router;
