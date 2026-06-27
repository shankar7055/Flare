
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { checkDayCapacity } = require("./dist/agent/tools");
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) return;

  console.log("=== Check Day Capacity for today ===");
  const res = await checkDayCapacity(user.id, {
    date: new Date().toISOString(),
  });
  console.log("Result:", JSON.stringify(res, null, 2));
  console.log("\n=== Check that check_day_capacity is in toolsDeclarations ===");
  const toolsDeclarations = require("./dist/agent/tools").toolsDeclarations;
  console.log("Has check_day_capacity?", Boolean(toolsDeclarations.find(t => t.name === "check_day_capacity")));
  console.log("Total tools declared:", toolsDeclarations.length);
  console.log("All tool names:", toolsDeclarations.map(t => t.name));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
