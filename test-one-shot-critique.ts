
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { runAgentCycle } = require('./dist/agent/orchestrator');

const prisma = new PrismaClient();

async function main() {
  console.log('=== ONE-SHOT SELF-CRITIQUE TEST (NO RETRIES) ===');

  // 1. Clean slate
  console.log('1. Resetting test data...');
  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No user found!');

  // Clear existing tasks/slots for test
  await prisma.scheduleSlot.deleteMany({ where: { task: { userId: user.id } } });
  await prisma.task.deleteMany({ where: { userId: user.id } });
  await prisma.agentRun.deleteMany({ where: { userId: user.id } });

  // 2. Set user working hours to 09:00-17:00
  console.log('2. Setting working hours...');
  await prisma.user.update({
    where: { id: user.id },
    data: {
      workingHoursStart: '09:00',
      workingHoursEnd: '17:00',
      googleOauthToken: null // To force local conflict check
    }
  });

  // 3. Create an EXISTING task occupying exactly 10:00-11:00 TODAY
  console.log('3. Creating conflicting existing task...');
  const conflictTask = await prisma.task.create({
    data: {
      userId: user.id,
      title: 'EXISTING TASK (CONFLICTING)',
      description: 'This is already scheduled at 10:00-11:00',
      deadline: new Date(Date.now() + 12 * 3600 * 1000),
      estimatedMinutes: 60,
      priority: 'high',
      status: 'in_progress'
    }
  });
  const conflictStart = new Date();
  conflictStart.setHours(10, 0, 0, 0);
  const conflictEnd = new Date();
  conflictEnd.setHours(11, 0, 0, 0);
  await prisma.scheduleSlot.create({
    data: {
      taskId: conflictTask.id,
      startTime: conflictStart,
      endTime: conflictEnd,
      source: 'user'
    }
  });

  // 4. Create NEW task that will try to schedule
  console.log('4. Creating new test task...');
  const newTask = await prisma.task.create({
    data: {
      userId: user.id,
      title: 'TEST SELF-CRITIQUE TASK',
      description: 'This should trigger critique and fix conflicts',
      deadline: new Date(Date.now() + 3 * 3600 * 1000),
      estimatedMinutes: 60,
      priority: 'high',
      status: 'pending'
    }
  });

  // 5. Trigger agent cycle
  console.log('5. Triggering agent cycle...');
  const agentRun = await runAgentCycle(user.id, 'new_task');

  // 6. Check ScheduleSlot count for new task
  console.log('\n=== CHECK: CHECKING SCHEDULE SLOTS ===');
  const slots = await prisma.scheduleSlot.findMany({
    where: { taskId: newTask.id },
    include: { task: true }
  });
  console.log(`Number of ScheduleSlots for test task: ${slots.length}`);
  console.log('Slots:', JSON.stringify(slots, null, 2));

  // 7. Output FULL reasoningTrace
  console.log('\n=== FULL AGENT RUN OUTPUT ===');
  console.log('Agent Run ID:', agentRun.id);

  console.log('\n=== FULL RAW reasoningTrace ===');
  const trace = JSON.parse(agentRun.reasoningTrace);
  console.log(JSON.stringify(trace, null, 2));

  console.log('\n=== actionsTaken ===');
  const actions = JSON.parse(agentRun.actionsTaken);
  console.log(JSON.stringify(actions, null, 2));
}

main()
  .catch((err) => {
    console.error('\n=== ERROR DURING TEST ===');
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
