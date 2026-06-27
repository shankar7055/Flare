"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("Seeding database with demo data...");
    // 1. Create or retrieve demo user
    const email = "demo@lifesaver.ai";
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash("Password123", salt);
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
    }
    else {
        console.log("Demo user already exists.");
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
