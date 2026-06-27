
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up test data...');
  
  // Find test user (demo@lifesaver.ai)
  const user = await prisma.user.findFirst({ where: { email: "demo@lifesaver.ai" } });
  if (!user) {
    console.log("No demo user found.");
    return;
  }

  // Delete all tasks created after 2026-06-27T03:00:00Z (the test tasks)
  const testStart = new Date("2026-06-27T03:00:00Z");
  const deletedTasks = await prisma.task.deleteMany({
    where: {
      userId: user.id,
      createdAt: { gte: testStart }
    }
  });
  console.log(`Deleted ${deletedTasks.count} test tasks.`);

  // Delete all agent runs created after test start
  const deletedRuns = await prisma.agentRun.deleteMany({
    where: {
      userId: user.id,
      createdAt: { gte: testStart }
    }
  });
  console.log(`Deleted ${deletedRuns.count} test agent runs.`);

  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

