
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const Groq = require("groq-sdk").default;
const {
  runAgentCycle,
  runRescueCycle,
} = require("./dist/agent/orchestrator");
const {
  checkDayCapacity,
  checkCalendarConflicts,
} = require("./dist/agent/tools");
const prisma = new PrismaClient();

async function main() {
  console.log("=== Testing Last Minute Life Saver Parts B & C ===\n");

  // Get the demo user
  const demoUser = await prisma.user.findFirst({
    where: { email: "demo@lifesaver.ai" },
  });

  if (!demoUser) {
    console.log("Demo user not found! Please run `npm run prisma:seed`!");
    return;
  }

  console.log(`Testing with user ID: ${demoUser.id}`);

  // --- Part B Test ---
  console.log("\n=== Testing Part B: Self-Critique Step ===");
  console.log("Creating a test task, then scheduling it...");

  const now = new Date();

  // 1. Create a test task with a deadline in 3 hours
  const testTaskB = await prisma.task.create({
    data: {
      userId: demoUser.id,
      title: "Self-Critique Test Task",
      description: "Test that self-critique step works!",
      deadline: new Date(now.getTime() + 3 * 3600 * 1000),
      estimatedMinutes: 60,
      priority: "high",
      status: "pending",
    },
  });

  console.log(`Created task (ID: ${testTaskB.id})`);

  // 2. First, let's manually test check_day_capacity for Part C
  console.log("\n=== Part C Pre-Test: Check Day Capacity ===");
  const capacityRes = await checkDayCapacity(demoUser.id, {
    date: now.toISOString(),
  });
  console.log("check_day_capacity result:", JSON.stringify(capacityRes, null, 2));

  // 3. Run an agent cycle (triggered via new_task)
  console.log("\n=== Triggering Agent Cycle ===");
  const agentRun = await runAgentCycle(demoUser.id, "new_task");

  // 4. Show the reasoning trace and actions taken!
  console.log("\n=== Reasoning Trace ===");
  const reasoningTrace = JSON.parse(agentRun.reasoningTrace);
  console.log(JSON.stringify(reasoningTrace, null, 2));

  console.log("\n=== Actions Taken ===");
  const actionsTaken = JSON.parse(agentRun.actionsTaken);
  console.log(JSON.stringify(actionsTaken, null, 2));

  console.log("\n--- Part B & C test complete! ---");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
