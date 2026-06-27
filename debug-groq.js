
require("dotenv").config();
const Groq = require("groq-sdk").default;
const prisma = new (require("@prisma/client").PrismaClient)();
const { toGroqTools, normalizeSchema } = require("./dist/agent/orchestrator");
const toolsDeclarations = require("./dist/agent/tools").toolsDeclarations;

async function main() {
  console.log("=== Debugging Groq call ===");
  console.log("GROQ_MODEL:", process.env.GROQ_MODEL);
  console.log("toGroqTools returns:", toGroqTools(toolsDeclarations));

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const systemInstruction =
    "You are a proactive productivity agent. Given this user's tasks, deadlines, calendar state, and behavior history, decide what needs attention right now and act using the available tools. Be decisive — call tools rather than just describing what should happen. CRITICAL RULE: You must NEVER call more than ONE tool at a time. Do NOT output multiple tool calls in a single response. Wait for the result of the first tool before calling the next one. 1. Before scheduling a new task, call check_day_capacity for its target date. If overcommitted would become true after adding this task, do NOT silently schedule it — instead either propose scheduling it on a different day before its deadline, or call escalate_task to flag that the day is full and ask whether something else should move. 2. If check_calendar_conflicts reports a conflict, do not give up. Propose a different start_time, call check_calendar_conflicts again, and repeat until you find a free slot or determine no slot exists — in which case call escalate_task.";

  const userMessage = "Current time: 2026-06-26T11:29:00Z\nWorld State: {}";

  try {
    const groqTools = toGroqTools(toolsDeclarations);
    console.log("groqTools:", JSON.stringify(groqTools, null, 2));
    const response = await client.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userMessage },
      ],
      tools: groqTools,
      tool_choice: "auto",
      parallel_tool_calls: false,
      temperature: 0.3,
      max_tokens: 1024,
    });
    console.log("Groq response:", JSON.stringify(response, null, 2));
  } catch (e) {
    console.error("Error calling Groq directly:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
