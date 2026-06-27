
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { checkDayCapacity, getUserPatterns, getRecurringTaskStatus } = require('./dist/agent/tools');

const prisma = new PrismaClient();

async function main() {
  console.log('=== Verifying Test Data ===');
  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No user found');

  // 1. Check streaks
  console.log('=== Checking Recurring Tasks ===');
  const tasks = await prisma.task.findMany({
    where: { userId: user.id, isRecurring: true },
    orderBy: { streakCount: 'desc' },
  });
  console.log('Tasks:', JSON.stringify(tasks, null, 2));
  const recStatus = await getRecurringTaskStatus(user.id);
  console.log('getRecurringTaskStatus result:', JSON.stringify(recStatus, null, 2));

  // 2. Check capacity
  console.log('=== Checking Day Capacity ===');
  const today = new Date();
  const capacity = await checkDayCapacity(user.id, { date: today.toISOString() });
  console.log('checkDayCapacity:', JSON.stringify(capacity, null, 2));

  // 3. Check patterns
  console.log('=== Checking User Patterns ===');
  const patterns = await getUserPatterns(user.id);
  console.log('getUserPatterns:', JSON.stringify(patterns, null, 2));

  // 4. Check working hours
  console.log('=== Checking User Working Hours ===');
  const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
  console.log('User working_hours_start:', updatedUser.workingHoursStart);
  console.log('User working_hours_end:', updatedUser.workingHoursEnd);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
