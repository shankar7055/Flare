import cron from "node-cron";
import prisma from "./db";
import { runAgentCycle, runRescueCycle } from "./agent/orchestrator";

let cronJob: cron.ScheduledTask | null = null;

export async function periodicAgentTick() {
  console.log("Starting periodic agent tick sweep...");
  try {
    const users = await prisma.user.findMany();
    const now = new Date();

    for (const user of users) {
      // Find all uncompleted tasks
      const tasks = await prisma.task.findMany({
        where: {
          userId: user.id,
          status: { not: "completed" }
        }
      });

      if (tasks.length === 0) continue;

      const rescueTaskIds: number[] = [];

      for (const task of tasks) {
        // Check rescue-mode conditions:
        // status == 'pending', no ScheduleSlot, startedAt null
        // AND (deadline - now) <= max(2 hours, estimatedMinutes)
        if (task.status === "pending" && !task.startedAt) {
          const slot = await prisma.scheduleSlot.findFirst({
            where: { taskId: task.id }
          });

          if (!slot) {
            const timeRemainingMs = task.deadline.getTime() - now.getTime();
            const estimatedMs = task.estimatedMinutes * 60 * 1000;
            const twoHoursMs = 2 * 60 * 60 * 1000;
            const triggerWindowMs = Math.max(twoHoursMs, estimatedMs);

            if (timeRemainingMs <= triggerWindowMs) {
              rescueTaskIds.push(task.id);
            }
          }
        }
      }

      // Trigger Rescue cycles
      for (const tId of rescueTaskIds) {
        try {
          console.log(`Task ${tId} is in Rescue Mode trigger window. Running rescue cycle.`);
          await runRescueCycle(user.id, tId);
        } catch (error) {
          console.error(`Error running rescue cycle for task ${tId}:`, error);
        }
      }

      // Run normal agent sweep cycle for general organization
      try {
        console.log(`Running standard sweep cycle for user ${user.id}`);
        await runAgentCycle(user.id, "periodic_sweep");
      } catch (error) {
        console.error(`Error running normal agent cycle for user ${user.id}:`, error);
      }
    }
  } catch (error) {
    console.error("Error in periodicAgentTick execution:", error);
  }
}

export function startScheduler() {
  // Tick every 15 minutes: '*/15 * * * *'
  cronJob = cron.schedule("*/15 * * * *", async () => {
    await periodicAgentTick();
  });
  console.log("Background agent scheduler initialized (cron every 15 mins).");
}

export function stopScheduler() {
  if (cronJob) {
    cronJob.stop();
    console.log("Background agent scheduler stopped.");
  }
}
