
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { logUserFeedback, getRecurringTaskStatus, getTasks } = require('./dist/agent/tools');

const prisma = new PrismaClient();

async function main() {
  console.log('=== Testing Recurring Tasks ===');

  // Get the first user
  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No user found');
  console.log('Using user:', user.email);

  // 1. Create a daily recurring task
  console.log('1. Creating daily recurring task');
  const task = await prisma.task.create({
    data: {
      userId: user.id,
      title: 'Test Daily Habit',
      description: 'Testing recurring task functionality',
      deadline: new Date(Date.now() + 3 * 60 * 60 * 1000),
      estimatedMinutes: 15,
      priority: 'medium',
      status: 'pending',
      isRecurring: true,
      recurrenceRule: 'daily',
      streakCount: 0,
    },
  });
  console.log('Created task:', task);

  // 2. Mark it as completed
  console.log('2. Marking task as completed');
  await logUserFeedback(user.id, {
    task_id: task.id,
    completed_on_time: true,
    reminder_helpful: true,
  });

  // 3. Verify streak and new task was created
  const updatedTask = await prisma.task.findUnique({ where: { id: task.id } });
  console.log('Updated original task:', updatedTask);
  const recurringTasks = await prisma.task.findMany({
    where: { userId: user.id, isRecurring: true },
    orderBy: { createdAt: 'desc' },
    take: 2,
  });
  console.log('Recurring tasks:', recurringTasks);

  // 4. Call getRecurringTaskStatus
  const status = await getRecurringTaskStatus(user.id);
  console.log('getRecurringTaskStatus result:', status);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
