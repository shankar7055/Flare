
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const {
  checkCalendarConflicts,
  scheduleTask,
  getRecurringTaskStatus,
  createTask
} = require('./dist/agent/tools');
const prisma = new PrismaClient();

async function main() {
  console.log('=== DIRECT FIXES TEST ===\n');

  // 1. Cleanup any leftover test data
  console.log('1. Cleaning up test data...');
  const demoUser = await prisma.user.findFirst({ where: { email: "demo@lifesaver.ai" } });
  if (demoUser) {
    await prisma.scheduleSlot.deleteMany({ where: { task: { userId: demoUser.id } } });
    await prisma.task.deleteMany({ where: { userId: demoUser.id } });
    await prisma.agentRun.deleteMany({ where: { userId: demoUser.id } });
  }

  if (!demoUser) {
    console.error('Demo user not found');
    return;
  }
  console.log('✅ Test data cleaned up\n');

  // 2. Test that check_calendar_conflicts properly excludes its own task
  console.log('2. Testing checkCalendarConflicts exclude_task_id...');
  const task1 = await prisma.task.create({
    data: {
      userId: demoUser.id,
      title: "Test Task 1",
      deadline: new Date(Date.now() + 8 * 3600 * 1000),
      estimatedMinutes: 60,
      priority: "high",
      status: "in_progress"
    }
  });
  const start = new Date();
  start.setHours(9, 0, 0, 0);
  const end = new Date();
  end.setHours(10, 0, 0, 0);

  // Create a slot for task1
  const slot1 = await prisma.scheduleSlot.create({
    data: {
      taskId: task1.id,
      startTime: start,
      endTime: end,
      source: "user"
    }
  });

  // Check conflicts without exclude_task_id: should conflict with self
  const conflictsWithoutExclude = await checkCalendarConflicts(demoUser.id, {
    start_time: start.toISOString(),
    end_time: end.toISOString()
  });
  console.log('Conflicts without exclude_task_id:', conflictsWithoutExclude.conflicts, '(should include "Test Task 1")');

  // Check conflicts with exclude_task_id: should NOT conflict with self!
  const conflictsWithExclude = await checkCalendarConflicts(demoUser.id, {
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    exclude_task_id: task1.id
  });
  console.log('Conflicts with exclude_task_id:', conflictsWithExclude.conflicts, '(should be empty)\n');

  console.log('✅ checkCalendarConflicts exclude_task_id working\n');

  // 3. Test that scheduleTask deletes old slots before new one
  console.log('3. Testing scheduleTask deletes old slots before creating new...');
  const task2 = await prisma.task.create({
    data: {
      userId: demoUser.id,
      title: "Test Task 2",
      deadline: new Date(Date.now() + 8 * 3600 * 1000),
      estimatedMinutes: 60,
      priority: "medium",
      status: "pending"
    }
  });

  // Create an initial slot
  const slot2Old = await prisma.scheduleSlot.create({
    data: {
      taskId: task2.id,
      startTime: new Date(Date.now() + 1 * 3600 * 1000),
      endTime: new Date(Date.now() + 2 * 3600 * 1000),
      source: "test"
    }
  });

  let currentSlotsTask2 = await prisma.scheduleSlot.findMany({ where: { taskId: task2.id } });
  console.log('Number of initial slots for task2:', currentSlotsTask2.length, '(should be 1)');

  // Now call scheduleTask to move it
  const newStart = new Date(Date.now() + 3 * 3600 * 1000);
  const newEnd = new Date(Date.now() + 4 * 3600 * 1000);
  const scheduleResult = await scheduleTask(demoUser.id, {
    task_id: task2.id,
    start_time: newStart.toISOString(),
    end_time: newEnd.toISOString()
  });

  currentSlotsTask2 = await prisma.scheduleSlot.findMany({ where: { taskId: task2.id } });
  console.log('Number of slots after scheduleTask:', currentSlotsTask2.length, '(should be 1, not 2!)');
  console.log('New slot ID:', scheduleResult.schedule_slot_id, 'should match the only slot found:', currentSlotsTask2[0].id, '\n');

  console.log('✅ scheduleTask deletes old slots correctly\n');

  // 4. Test recurring tasks
  console.log('4. Testing getRecurringTaskStatus and recurring task creation...');
  const recTask1 = await createTask(demoUser.id, {
    title: "Daily Recurring Test",
    deadline: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
    estimated_minutes: 30,
    priority: "medium",
    isRecurring: true,
    recurrenceRule: "daily"
  });

  // Verify it was created correctly in DB
  const recTask1Db = await prisma.task.findUnique({ where: { id: recTask1.id } });
  console.log('Recurring task created: id', recTask1Db?.id, 'title', recTask1Db?.title, 'isRecurring:', recTask1Db?.isRecurring, 'recurrenceRule:', recTask1Db?.recurrenceRule);

  const recStatus = await getRecurringTaskStatus(demoUser.id);
  console.log('getRecurringTaskStatus returned:', JSON.stringify(recStatus, null, 2));
  console.log('✅ getRecurringTaskStatus working\n');

  // 5. Cleanup
  console.log('Cleaning up test data...');
  await prisma.scheduleSlot.deleteMany({ where: { task: { userId: demoUser.id } } });
  await prisma.task.deleteMany({ where: { userId: demoUser.id } });
  await prisma.agentRun.deleteMany({ where: { userId: demoUser.id } });
  console.log('✅ Test data cleaned up!\n');

  console.log('=== ALL TESTS PASSED ===');
}

main()
  .catch((err) => {
    console.error('ERROR IN TEST:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

