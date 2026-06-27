import * as chrono from "chrono-node";
import Groq from "groq-sdk";

export async function parseNaturalLanguageTask(
  text: string,
  userId: number
): Promise<{
  title: string;
  description?: string;
  deadline: Date;
  priority: string;
  estimated_minutes: number;
}> {
  const now = new Date();
  let title = text.trim();
  let deadline: Date | null = null;
  let priority = "medium";
  let estimated_minutes = 60;
  let description: string | undefined = undefined;

  // 1. Keyword-based priority extraction
  const lower = text.toLowerCase();
  if (lower.includes("urgent") || lower.includes("critical") || lower.includes("asap")) {
    priority = "critical";
  } else if (lower.includes("high") || lower.includes("important") || lower.includes("soon")) {
    priority = "high";
  } else if (lower.includes("low") || lower.includes("nice to have") || lower.includes("later")) {
    priority = "low";
  }

  // 2. Primary: chrono-node local date parsing
  try {
    const parsedResults = chrono.parse(text);
    if (parsedResults.length > 0) {
      deadline = parsedResults[0].date();
      const matchedText = parsedResults[0].text;
      title = text.replace(matchedText, "");
      title = title.replace(/\b(by|at|on)\b/gi, "");
    }
  } catch (err) {
    console.warn("Chrono date parser error:", err);
  }

  // Clean command prefixes from title
  title = title
    .replace(/^(remind me to|create a task to|create task|schedule|remind me|add task to|add task)\s+/i, "")
    .replace(/^[\s,:-]+|[\s,:-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // 3. Fallback: Groq for genuinely ambiguous input
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const isAmbiguous = !deadline || !title || title.length < 3;

  if (isAmbiguous && GROQ_API_KEY) {
    console.log("Task parsing ambiguous — falling back to Groq...");
    try {
      const client = new Groq({ apiKey: GROQ_API_KEY });
      const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

      const prompt =
        `You are a task parsing assistant. Parse the following natural language task request into JSON.\n` +
        `Current time: ${now.toISOString()}\n` +
        `Input: "${text}"\n\n` +
        `Return ONLY a raw JSON object (no markdown, no code blocks):\n` +
        `{\n` +
        `  "title": "concise task title",\n` +
        `  "description": "extra context or null",\n` +
        `  "deadline": "ISO-8601 datetime calculated from current time",\n` +
        `  "priority": "low|medium|high|critical",\n` +
        `  "estimated_minutes": <number>\n` +
        `}`;

      const response = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 300,
      });

      const respText = response.choices[0]?.message?.content?.trim() || "";
      const cleaned = respText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (parsed.title && parsed.deadline) {
        return {
          title: parsed.title,
          description: parsed.description || undefined,
          deadline: new Date(parsed.deadline),
          priority: parsed.priority || priority,
          estimated_minutes: parsed.estimated_minutes || estimated_minutes,
        };
      }
    } catch (error) {
      console.error("Groq fallback parsing failed:", error);
    }
  }

  // Default deadline: tomorrow 5 PM
  if (!deadline) {
    deadline = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 17, 0, 0);
  }
  if (!title) {
    title = `Task entered at ${now.toLocaleTimeString()}`;
  }

  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    description,
    deadline,
    priority,
    estimated_minutes,
  };
}
