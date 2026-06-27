
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { runAgentCycle } = require('./dist/agent/orchestrator');
const { checkDayCapacity } = require('./dist/agent/tools');

const prisma = new PrismaClient();

async function main() {
  console.log('=== Testing Self-Critique and Capacity Edge Cases ===');

  // Get demo user
  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No user found');

  // 1. Set user working hours to 09:00-17:00
  await prisma.user.update({
    where: { id: user.id },
    data: { workingHoursStart: '09:00', workingHoursEnd: '17:00' }
  });

  // 2. Create a task that will be scheduled, plus a conflicting scheduled slot
  console.log('=== Seeding Conflicting Slot ===');
  const taskToConflict = await prisma.task.create({
    data: {
      userId: user.id,
      title: 'Pre-existing Task (Conflicting)',
      deadline: new Date(Date.now() + 6 * 3600 * 1000),
      estimatedMinutes: 60,
      priority: 'high',
      status: 'in_progress'
    }
  });
  const conflictSlotStart = new Date();
  conflictSlotStart.setHours(10, 0, 0, 0);
  const conflictSlotEnd = new Date();
  conflictSlotEnd.setHours(11, 0, 0, 0);
  await prisma.scheduleSlot.create({
    data: {
      taskId: taskToConflict.id,
      startTime: conflictSlotStart,
      endTime: conflictSlotEnd,
      source: 'user'
    }
  });

  // 3. Create test task that we want to schedule
  console.log('=== Creating Test Task ===');
  const testTask = await prisma.task.create({
    data: {
      userId: user.id,
      title: 'Test Critique Task',
      description: 'Test that self-critique catches bad schedules',
      deadline: new Date(Date.now() + 4 * 3600 * 1000),
      estimatedMinutes: 60,
      priority: 'high',
      status: 'pending'
    }
  });

  // 4. Check current capacity
  const todayCapacity = await checkDayCapacity(user.id, {
    date: new Date().toISOString()
  });
  console.log('=== Today\'s Capacity Before ===', JSON.stringify(todayCapacity, null, 2));

  // 5. Schedule a bunch of tasks to fill the day
  console.log('=== Filling Day for Capacity Test ===');
  let totalCommitted = todayCapacity.committed_minutes;
  const fillTasks = [];
  for (let i = 0; i < 4; i++) {
    const t = await prisma.task.create({
      data: {
        userId: user.id,
        title: `Fill Slot ${i + 1}`,
        deadline: new Date(Date.now() + 4 * 3600 * 1000),
        estimatedMinutes: 60,
        priority: 'medium',
        status: 'in_progress'
      }
    });
    const slotStart = new Date();
    slotStart.setHours(12 + i, 0, 0, 0);
    const slotEnd = new Date();
    slotEnd.setHours(13 + i, 0, 0, 0);
    await prisma.scheduleSlot.create({
      data: {
        taskId: t.id,
        startTime: slotStart,
        endTime: slotEnd,
        source: 'user'
      }
    });
    totalCommitted += 60;
    fillTasks.push(t);
  }

  const afterFillCapacity = await checkDayCapacity(user.id, {
    date: new Date().toISOString()
  });
  console.log('=== Today\'s Capacity After Filling ===', JSON.stringify(afterFillCapacity, null, 2));

  // 6. Now run agent cycle for this new test task
  console.log('=== Triggering Agent Cycle ===');
  const agentRun = await runAgentCycle(user.id, 'new_task');
  console.log('=== Agent Run ID ===', agentRun.id);

  // 7. Parse reasoning trace
  const trace = JSON.parse(agentRun.reasoningTrace);
  console.log('=== Reasoning Trace Captured ===', JSON.stringify(trace, null, 2));
  console.log('=== Actions Taken ===', JSON.parse(agentRun.actionsTaken));

  // 8. Get user patterns for recommendations card test
  console.log('=== Testing get_user_patterns ===');
  const patterns = await require('./dist/agent/tools').getUserPatterns(user.id);
  console.log('get_user_patterns() result:', JSON.stringify(patterns, null, 2));

}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
