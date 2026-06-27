import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with demo data...");

  // 1. Create or retrieve demo user
  const email = "demo@lifesaver.ai";
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("Password123", salt);

    user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        name: "Demo User",
        timezone: "UTC",
        preferredChannel: "email"
      }
    });
    console.log(`Created demo user: ${user.email}`);
  } else {
    console.log("Demo user already exists.");
  }

  // Restore Google OAuth token from env if available
  const oauthTokenJson = process.env.GOOGLE_OAUTH_TOKEN_JSON;
  if (oauthTokenJson) {
    await prisma.user.update({
      where: { id: user.id },
      data: { googleOauthToken: oauthTokenJson }
    });
    console.log("Restored Google OAuth token for demo user from GOOGLE_OAUTH_TOKEN_JSON env var.");
  }

  // 2. Clear old tasks for this user (to keep demo clean)
  await prisma.task.deleteMany({
    where: { userId: user.id }
  });

  const now = new Date();

  // 3. Create normal task: deadline in 2 days
  const deadlineNormal = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const taskNormal = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Prepare Status Slide",
      description: "Create the PowerPoint slide for the weekly team check-in.",
      deadline: deadlineNormal,
      estimatedMinutes: 45,
      priority: "medium",
      status: "pending"
    }
  });
  console.log(`Created normal task: '${taskNormal.title}'`);

  // 4. Create urgent task: estimated 120 minutes, deadline in 1 hour
  // Since time remaining is 60 minutes, which is <= max(2 hours, 120 mins) = 120 mins,
  // this task will immediately trigger Rescue Mode sweeps!
  const deadlineUrgent = new Date(now.getTime() + 1 * 60 * 60 * 1000);
  const taskUrgent = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Submit Hackathon Backend Project",
      description: "Final review of codebase, endpoints, and deployment documentation.",
      deadline: deadlineUrgent,
      estimatedMinutes: 120,
      priority: "critical",
      status: "pending"
    }
  });
  console.log(`Created urgent task: '${taskUrgent.title}' (Rescue Mode Trigger)`);

  // 5. Create overlapping scheduled tasks for UI demo purposes
  const overlapStart = new Date(now);
  overlapStart.setHours(14, 0, 0, 0); // 2:00 PM today
  const overlapEnd = new Date(overlapStart.getTime() + 30 * 60000); // 2:30 PM

  const overlapTask1 = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Review Design Assets",
      description: "Check Figma for final marketing assets.",
      deadline: new Date(overlapEnd.getTime() + 2 * 3600000),
      estimatedMinutes: 30,
      priority: "medium",
      status: "in_progress"
    }
  });
  await prisma.scheduleSlot.create({
    data: {
      taskId: overlapTask1.id,
      startTime: overlapStart,
      endTime: overlapEnd,
      source: "agent"
    }
  });

  const overlapTask2 = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Sync with Frontend Team",
      description: "Deliberately overlapping task to demo side-by-side macOS calendar conflict UI.",
      deadline: new Date(overlapEnd.getTime() + 2 * 3600000),
      estimatedMinutes: 30,
      priority: "high",
      status: "in_progress"
    }
  });
  await prisma.scheduleSlot.create({
    data: {
      taskId: overlapTask2.id,
      startTime: overlapStart,
      endTime: overlapEnd,
      source: "agent"
    }
  });
  console.log("Created overlapping tasks (2:00-2:30 PM) for time-grid conflict UI demo.");

  // 6. Create a dummy successful AgentRun
  await prisma.agentRun.create({
    data: {
      userId: user.id,
      triggerType: "manual",
      reasoningTrace: JSON.stringify([{ role: "agent", content: "Successfully resolved schedule conflicts." }]),
      actionsTaken: JSON.stringify([{ tool_name: "schedule_task", status: "success" }]),
      createdAt: now
    }
  });
  console.log("Created a dummy AgentRun to populate the Sidebar activity feed.");

  console.log("Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during database seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
