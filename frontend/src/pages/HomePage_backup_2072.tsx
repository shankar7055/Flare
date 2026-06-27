export interface ParsedStep {
  toolName: string;
  args: Record<string, any>;
  result?: Record<string, any>;
}

export interface ParsedRun {
  steps: ParsedStep[];
  finalText: string | null;
}

/**
 * The backend stores reasoningTrace as the raw turn-by-turn Gemini history:
 * [{ role: "model", parts: [{ functionCall: { name, args } }] },
 *  { role: "function", parts: [{ functionResponse: { name, response: { result } } }] },
 *  ...
 *  { role: "model", parts: [{ text: "..." }] }]
 *
 * This collapses that into a flat list of { toolName, args, result } the UI can render,
 * plus the agent's final natural-language summary if one exists.
 */
export function parseReasoningTrace(trace: any[]): ParsedRun {
  const steps: ParsedStep[] = [];
  let finalText: string | null = null;

  for (const turn of trace ?? []) {
    for (const part of turn?.parts ?? []) {
      if (part.functionCall) {
        steps.push({ toolName: part.functionCall.name, args: part.functionCall.args ?? {} });
      } else if (part.functionResponse) {
        const last = steps[steps.length - 1];
        const result = part.functionResponse.response?.result ?? part.functionResponse.response;
        if (last && last.toolName === part.functionResponse.name && !last.result) {
          last.result = result;
        } else {
          steps.push({ toolName: part.functionResponse.name, args: {}, result });
        }
      } else if (part.text) {
        finalText = part.text;
      } else if (turn.role === "system" && part.text === undefined) {
        // defensive no-op
      }
    }
  }

  return { steps, finalText };
}
