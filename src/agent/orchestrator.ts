import Groq from "groq-sdk";
import prisma from "../db";
import { toolsDeclarations, executeTool, getUserPatterns } from "./tools";

const activeCycles = new Set<number>();

/* ─── Recursively normalize Gemini-style schema types → JSON Schema ── */
function normalizeSchema(schema: any): any {
  if (!schema || typeof schema !== "object") return schema;
  const type = (schema.type ?? "object").toString().toLowerCase();

  if (type === "object") {
    const props: Record<string, any> = {};
    for (const [k, v] of Object.entries(schema.properties || {})) {
      props[k] = normalizeSchema(v);
    }
    return {
      type: "object",
      ...(Object.keys(props).length ? { properties: props } : {}),
      ...(schema.required?.length ? { required: schema.required } : {}),
      ...(schema.description ? { description: schema.description } : {}),
    };
  }

  if (type === "array") {
    return {
      type: "array",
      ...(schema.items ? { items: normalizeSchema(schema.items) } : {}),
      ...(schema.description ? { description: schema.description } : {}),
    };
  }

  // Scalar types: string, integer, number, boolean
  return {
    type,
    ...(schema.description ? { description: schema.description } : {}),
    ...(schema.enum ? { enum: schema.enum } : {}),
  };
}

/* ─── Convert Gemini tool declarations → Groq/OpenAI format ─────────── */
function toGroqTools(declarations: typeof toolsDeclarations): Groq.Chat.ChatCompletionTool[] {
  return declarations.map((d) => ({
    type: "function" as const,
    function: {
      name: d.name,
      description: d.description,
      parameters: normalizeSchema(d.parameters),
    },
  }));
}


/* ─── Helper to parse <function> tags (accidental Gemini output) ───── */
function parseFunctionTags(text: string | null): Array<{ id: string; type: "function"; function: { name: string; arguments: string } }> | null {
  if (!text) return null;
  
  const functionTagRegex = /<function=([a-zA-Z0-9_]+)>([\s\S]*?)<\/function>/g;
  const toolCalls: any[] = [];
  
  let match;
  while ((match = functionTagRegex.exec(text)) !== null) {
    const toolName = match[1];
    let args: Record<string, any> = {};
    try {
      args = JSON.parse(match[2]);
      // Remove null/undefined properties before passing to Groq
      for (const key in args) {
        if (args[key] == null) {
          delete args[key];
        }
      }
    } catch {}
    toolCalls.push({
      id: `call_${Date.now()}`,
      type: "function",
      function: {
        name: toolName,
        arguments: JSON.stringify(args)
      }
    });
  }
  return toolCalls.length > 0 ? [toolCalls[0]] : null;
}

/* ─── Groq LLM call with retry ──────────────────────────────────────── */
async function callGroqWithRetry(
  client: Groq,
  messages: Groq.Chat.ChatCompletionMessageParam[],
  tools: Groq.Chat.ChatCompletionTool[],
  systemInstruction: string,
  model: string,
  retries = 5,
  delayMs = 2000
): Promise<Groq.Chat.ChatCompletion> {
  const allMessages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemInstruction },
    ...messages,
  ];

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
        const rawResponse = await client.chat.completions.create({
          model,
          messages: allMessages,
          tools,
          tool_choice: "auto",
          parallel_tool_calls: false,
          temperature: 0.3,
          max_tokens: 1024,
        });

        // Check if model accidentally used <function> tags
        const msg = rawResponse.choices[0].message;
        if (!msg.tool_calls && msg.content) {
          const parsedToolCalls = parseFunctionTags(msg.content);
          if (parsedToolCalls) {
            console.warn("[Groq] Model used <function> tags — auto-converting to tool_calls");
            // Create a new response with the parsed tool calls
            const modifiedResponse = { ...rawResponse };
            modifiedResponse.choices[0].message = {
              ...msg,
              tool_calls: parsedToolCalls as any,
              content: msg.content.replace(/<function=[a-zA-Z0-9_]+>[\s\S]*?<\/function>/g, "").trim() || null,
            };
            return modifiedResponse;
          }
        }

        return rawResponse;
    } catch (error: any) {
      const isRateLimit = error.status === 429 || error.message?.includes("rate limit") || error.message?.includes("quota");
      const isTransient = error.status === 503 || error.status === 502;
      const isToolFailed = error.status === 400 && (error.error?.code === "tool_use_failed" || error.error?.error?.code === "tool_use_failed");
      
      if ((isRateLimit || isTransient || isToolFailed) && attempt < retries) {
        if (isToolFailed) {
          console.warn(`[Groq] Tool use failed (attempt ${attempt}/${retries}). Fixing tool call syntax...`);
          allMessages.push({
            role: "user",
            content: "CRITICAL: Call exactly ONE tool at a time using the correct tool/function call format."
          });
        } else {
          let waitSeconds = 2.5; // fallback
          if (isRateLimit) {
            if (error.headers) {
              const retryHeader = typeof error.headers.get === "function"
                ? error.headers.get("retry-after")
                : error.headers["retry-after"];
              if (retryHeader) {
                waitSeconds = parseFloat(retryHeader) + 0.5;
              }
            } else if (error.message) {
              const match = error.message.match(/try again in ([0-9.]+)(s|ms)/i);
              if (match) {
                const val = parseFloat(match[1]);
                const unit = match[2].toLowerCase();
                waitSeconds = unit === "ms" ? (val / 1000) + 0.5 : val + 0.5;
              }
            }
          }
          const wait = isRateLimit ? Math.min(35000, waitSeconds * 1000) : delayMs;
          console.warn(`[Groq] Rate-limit/transient error (attempt ${attempt}/${retries}). Retrying in ${wait}ms…`);
          await new Promise((r) => setTimeout(r, wait));
          delayMs = Math.max(1000, delayMs * 1.5);
        }
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries exceeded for Groq API.");
}

/* ─── Perceive world state ──────────────────────────────────────────── */
async function perceiveWorldState(userId: number): Promise<any> {
  const now = new Date();

  const tasks = await prisma.task.findMany({
    where: { userId, status: { not: "completed" } },
  });

  const tasksList = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    deadline: t.deadline.toISOString(),
    estimated_minutes: t.estimatedMinutes,
    priority: t.priority,
    status: t.status,
    created_at: t.createdAt.toISOString(),
  }));

  const endPeriod = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const busySlots: any[] = [];

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user && user.googleOauthToken) {
    try {
      const parsedToken = JSON.parse(user.googleOauthToken);
      const refreshedToken = await require("../auth/oauth").GoogleOAuthHelper.refreshUserToken(parsedToken);
      if (refreshedToken) {
        if (JSON.stringify(refreshedToken) !== user.googleOauthToken) {
          await prisma.user.update({ where: { id: userId }, data: { googleOauthToken: JSON.stringify(refreshedToken) } });
        }
        const { google } = require("googleapis");
        const auth = require("../auth/oauth").GoogleOAuthHelper.getClient();
        auth.setCredentials(refreshedToken);
        const calendar = google.calendar({ version: "v3", auth });
        const response = await calendar.events.list({
          calendarId: "primary",
          timeMin: now.toISOString(),
          timeMax: endPeriod.toISOString(),
          singleEvents: true,
          orderBy: "startTime",
        });
        (response.data.items || []).forEach((item: any) => {
          busySlots.push({
            summary: item.summary || "Busy",
            start: item.start?.dateTime || item.start?.date,
            end: item.end?.dateTime || item.end?.date,
            source: "google_calendar",
          });
        });
      }
    } catch (e) {
      console.warn("[Groq] Failed to retrieve Google Calendar slots:", e);
    }
  }

  if (busySlots.length === 0) {
    const slots = await prisma.scheduleSlot.findMany({
      where: { task: { userId }, startTime: { gte: now }, endTime: { lte: endPeriod } },
      include: { task: true },
    });
    slots.forEach((s) => {
      busySlots.push({
        summary: s.task.title,
        start: s.startTime.toISOString(),
        end: s.endTime.toISOString(),
        source: "database",
      });
    });
  }

  const patterns = await getUserPatterns(userId);
  return {
    current_time: now.toISOString(),
    tasks: tasksList,
    calendar_busy_slots: busySlots,
    user_patterns: patterns,
    user: {
      working_hours_start: user?.workingHoursStart,
      working_hours_end: user?.workingHoursEnd
    }
  };
}

/* ─── Shared agentic loop (normal + rescue) ─────────────────────────── */
async function runAgentLoop(
  client: Groq,
  model: string,
  systemInstruction: string,
  initialUserMessage: string,
  userId: number,
  maxIterations: number,
  enableCritique: boolean = true,
  targetTaskId?: number
): Promise<{ reasoningTrace: any[]; actionsTaken: any[] }> {
  const groqTools = toGroqTools(toolsDeclarations);
  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: "user", content: initialUserMessage },
  ];

  const reasoningTrace: any[] = [];
  const actionsTaken: any[] = [];
  let hasDoneCritique = false;
  let conflictCounter = 0;

  for (let iter = 0; iter < maxIterations; iter++) {
    const response = await callGroqWithRetry(client, messages, groqTools, systemInstruction, model);
    const choice = response.choices[0];
    if (!choice?.message) break;

    const msg = choice.message;

    /* Build Gemini-compatible trace entry for the frontend */
    const modelParts: any[] = [];
    if (msg.content) modelParts.push({ text: msg.content });
    (msg.tool_calls || []).forEach((tc) => {
      modelParts.push({
        functionCall: {
          name: tc.function.name,
          args: (() => { try { return JSON.parse(tc.function.arguments || "{}"); } catch { return {}; } })(),
        },
      });
    });
    reasoningTrace.push({ role: "model", parts: modelParts });

    /* Append assistant turn to conversation */
    messages.push({
      role: "assistant",
      content: msg.content || null,
      tool_calls: msg.tool_calls,
    });

    // Check if we just called schedule_task or generate_rescue_plan
    const justCalledPlanTool = msg.tool_calls?.some(tc => 
      tc.function.name === "schedule_task" || tc.function.name === "generate_rescue_plan"
    ) ?? false;

    if (enableCritique && justCalledPlanTool && !hasDoneCritique && iter < maxIterations - 2) {
      hasDoneCritique = true;

      // First execute tools to get results
      const functionResponseParts: any[] = [];
      if (msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          const toolName = tc.function.name;
          const args = (() => { try { return JSON.parse(tc.function.arguments || "{}"); } catch { return {}; } })();
        
          console.log(`[Groq] Calling tool: ${toolName}`, args);
          const result = await executeTool(toolName, args, userId);
          if (toolName === "check_calendar_conflicts" && result.conflict) {
            conflictCounter++;
          }
          actionsTaken.push({ tool_name: toolName, args, result });

          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          } as Groq.Chat.ChatCompletionToolMessageParam);

          functionResponseParts.push({ functionResponse: { name: toolName, response: { result } } });
        }
      }

      reasoningTrace.push({ role: "function", parts: functionResponseParts });

      // Now send critique instruction
      const critiqueMessage = "Review the plan you just proposed. Check specifically for: (1) does it fall within the user's working hours (working_hours_start/end on User)? (2) does it overlap with any other already-scheduled task? (3) is the time allotted realistic for the task's estimated_minutes? When checking conflicts for an already-scheduled task, use exclude_task_id in check_calendar_conflicts to avoid checking against itself! If you find a problem, cancel the existing schedule slot (call cancel_schedule_slot) first, then correct it before finalizing. If everything checks out, confirm explicitly that you reviewed it. Note: If you cannot find a conflict-free slot after 3 attempts, you MUST call escalate_task to alert the user.";
      messages.push({ role: "user", content: critiqueMessage });

      // Add critique marker to trace
      reasoningTrace.push({ role: "model", parts: [{ text: "Double-checking the plan" }] });
      
      continue;
    }

    /* Stop if no tool calls */
    if (!msg.tool_calls?.length || choice.finish_reason === "stop") break;

    /* Execute tools & collect results */
    const functionResponseParts: any[] = [];
    for (const tc of msg.tool_calls) {
      const toolName = tc.function.name;
      const args = (() => { try { return JSON.parse(tc.function.arguments || "{}"); } catch { return {}; } })();
      
      console.log(`[Groq] Calling tool: ${toolName}`, args);
      const result = await executeTool(toolName, args, userId);
      if (toolName === "check_calendar_conflicts" && result.conflict) {
        conflictCounter++;
      }
      actionsTaken.push({ tool_name: toolName, args, result });

      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      } as Groq.Chat.ChatCompletionToolMessageParam);

      functionResponseParts.push({ functionResponse: { name: toolName, response: { result } } });
    }

    reasoningTrace.push({ role: "function", parts: functionResponseParts });

    // If 3 or more conflicts are hit, nudge the model to escalate
    const hasEscalated = actionsTaken.some(a => a.tool_name === "escalate_task" || a.tool_name === "send_notification");
    if (conflictCounter >= 3 && !hasEscalated && iter < maxIterations - 1) {
      const scheduleAttempt = actionsTaken.find(a => a.tool_name === "schedule_task");
      const taskId = targetTaskId || (scheduleAttempt ? Number(scheduleAttempt.args.task_id) : null);
      const targetStr = taskId ? ` for task ID ${taskId}` : "";
      messages.push({
        role: "user",
        content: `CRITICAL: You have encountered multiple calendar conflicts. Since scheduling has failed repeatedly, you must immediately call escalate_task${targetStr} to notify the user.`
      });
      reasoningTrace.push({ role: "model", parts: [{ text: "Prompting escalation due to repeated conflicts" }] });
    }
  }

  // Programmatic Fallback Escalation
  const finalHasEscalated = actionsTaken.some(a => a.tool_name === "escalate_task" || a.tool_name === "send_notification");
  if (conflictCounter >= 3 && !finalHasEscalated) {
    const scheduleAttempt = actionsTaken.find(a => a.tool_name === "schedule_task");
    const taskId = targetTaskId || (scheduleAttempt ? Number(scheduleAttempt.args.task_id) : null);
    if (taskId) {
      console.log(`[Fallback] Enforcing programmatic escalation for task ${taskId} after 3 failed schedule attempts.`);
      const result = await executeTool("escalate_task", { task_id: taskId }, userId);
      actionsTaken.push({ tool_name: "escalate_task", args: { task_id: taskId }, result });
      reasoningTrace.push({ role: "function", parts: [{ functionResponse: { name: "escalate_task", response: { result } } }] });
    }
  }

  return { reasoningTrace, actionsTaken };
}

/* ─── runAgentCycle ─────────────────────────────────────────────────── */
export async function runAgentCycle(userId: number, triggerType: string): Promise<any> {
  if (activeCycles.has(userId)) {
    console.warn(`[Groq] Agent cycle already running for user ${userId}. Skipping this trigger (${triggerType}).`);
    return null;
  }
  activeCycles.add(userId);
  try {
    console.log(`[Groq] Starting agent cycle for user ${userId} via ${triggerType}`);

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      throw new Error("[Groq] GROQ_API_KEY not set. Cannot run agent cycle.");
    }

    const worldState = await perceiveWorldState(userId);
    const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
    const client = new Groq({ apiKey: GROQ_API_KEY });

    let systemInstruction =
      "You are a proactive productivity agent. Given this user's tasks, deadlines, " +
      "calendar state, and behavior history, decide what needs attention right now " +
      "and act using the available tools. Be decisive — call tools rather than just " +
      "describing what should happen.\n" +
      "CRITICAL NON-NEGOTIABLE RULES:\n" +
      "1. YOU MUST CALL EXACTLY ONE (1) TOOL PER STEP, NO MORE. NEVER CALL TWO OR MORE TOOLS IN A SINGLE RESPONSE.\n" +
      "2. IF check_calendar_conflicts REPORTS A CONFLICT, DO NOT GIVE UP — PROPOSE A DIFFERENT start_time, CALL check_calendar_conflicts AGAIN, AND REPEAT UNTIL YOU FIND A FREE SLOT OR DETERMINE NO SLOT EXISTS, IN WHICH CASE CALL escalate_task.";

    let targetTaskId: number | undefined = undefined;
    if (triggerType === "new_task") {
      const latestTask = await prisma.task.findFirst({
        where: { userId, status: "pending" },
        orderBy: { createdAt: "desc" },
      });
      if (latestTask) {
        targetTaskId = latestTask.id;
      }
      const taskDetails = latestTask
        ? `A new task was created: "${latestTask.title}" (ID: ${latestTask.id}, Priority: ${latestTask.priority}, Deadline: ${latestTask.deadline.toISOString()}, Est: ${latestTask.estimatedMinutes} mins).`
        : "A new task was just created.";
      systemInstruction +=
        `\n3. [URGENT] ${taskDetails}\n` +
        `You already have the full list of tasks and calendar state in your World State prompt. Use that information directly instead of calling get_tasks. If this task is higher priority than an existing one ` +
        `and there isn't room for both, reschedule or escalate the lower-priority task first.`;
    }

    const initialUserMessage = `Current time: ${new Date().toISOString()}\nWorld State: ${JSON.stringify(worldState)}`;

    let reasoningTrace: any[] = [];
    let actionsTaken: any[] = [];

    try {
      ({ reasoningTrace, actionsTaken } = await runAgentLoop(
        client, model, systemInstruction, initialUserMessage, userId, 10, false, targetTaskId
      ));
    } catch (e: any) {
      console.error("[Groq] Agent cycle error:", e);
      reasoningTrace.push({ role: "system", parts: [{ text: `Error calling Groq: ${e.message || String(e)}` }] });
    }

    return await prisma.agentRun.create({
      data: {
        userId,
        triggerType,
        reasoningTrace: JSON.stringify(reasoningTrace),
        actionsTaken: JSON.stringify(actionsTaken),
      },
    });
  } finally {
    activeCycles.delete(userId);
  }
}

/* ─── runRescueCycle ────────────────────────────────────────────────── */
export async function runRescueCycle(userId: number, taskId: number): Promise<any> {
  if (activeCycles.has(userId)) {
    console.warn(`[Groq] Agent cycle already running for user ${userId}. Skipping runRescueCycle for task ${taskId}.`);
    return null;
  }
  activeCycles.add(userId);
  try {
    console.log(`[Groq] Starting Rescue Mode for user ${userId}, task ${taskId}`);

    const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
    if (!task) throw new Error(`Task ${taskId} not found for user ${userId}`);

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      throw new Error("[Groq] GROQ_API_KEY not set. Cannot run rescue cycle.");
    }

    const now = new Date();
    const timeRemainingMinutes = Math.max(0, Math.floor((task.deadline.getTime() - now.getTime()) / 60000));
    const worldState = await perceiveWorldState(userId);
    worldState.task_to_rescue = {
      id: task.id,
      title: task.title,
      description: task.description,
      deadline: task.deadline.toISOString(),
      estimated_minutes: task.estimatedMinutes,
      priority: task.priority,
      time_remaining_minutes: timeRemainingMinutes,
    };

    const systemInstruction =
      `This task is in RESCUE MODE — ${timeRemainingMinutes} minutes remain and nothing has started. ` +
      `Do NOT schedule normally. Call generate_rescue_plan with an immediate, sequential, timestamped plan ` +
      `starting now, then call send_notification with the full plan as the message.\n` +
      `CRITICAL RULE: You must NEVER call more than ONE tool at a time. Do NOT output multiple tool calls in a single response. Wait for the result of the first tool before calling the next one.`;

    const initialUserMessage = `Current time: ${now.toISOString()}\nRescue World State: ${JSON.stringify(worldState)}`;
    const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
    const client = new Groq({ apiKey: GROQ_API_KEY });

    let reasoningTrace: any[] = [];
    let actionsTaken: any[] = [];

    try {
      ({ reasoningTrace, actionsTaken } = await runAgentLoop(
        client, model, systemInstruction, initialUserMessage, userId, 8, false, taskId
      ));
    } catch (e: any) {
      console.error("[Groq] Rescue cycle error:", e);
      reasoningTrace.push({ role: "system", parts: [{ text: `Error calling Groq rescue: ${e.message || String(e)}` }] });
    }

    return await prisma.agentRun.create({
      data: {
        userId,
        triggerType: "rescue_mode",
        reasoningTrace: JSON.stringify(reasoningTrace),
        actionsTaken: JSON.stringify(actionsTaken),
      },
    });
  } finally {
    activeCycles.delete(userId);
  }
}
