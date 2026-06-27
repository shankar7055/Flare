import { describeToolCall } from './toolDisplay';

export interface ParsedStep {
  toolName: string;
  args: Record<string, any>;
  result?: Record<string, any>;
  retryGroup?: ParsedStep[]; // sub-steps to display indented
}

export interface ParsedRun {
  steps: ParsedStep[];
  finalText: string | null;
}

export function parseReasoningTrace(trace: any[]): ParsedRun {
  const rawSteps: ParsedStep[] = [];
  let finalText: string | null = null;

  for (const turn of trace ?? []) {
    for (const part of turn?.parts ?? []) {
      if (part.functionCall) {
        rawSteps.push({ toolName: part.functionCall.name, args: part.functionCall.args ?? {} });
      } else if (part.functionResponse) {
        const last = rawSteps[rawSteps.length - 1];
        const result = part.functionResponse.response?.result ?? part.functionResponse.response;
        if (last && last.toolName === part.functionResponse.name && !last.result) {
          last.result = result;
        }
      } else if (part.text) {
        if (part.text === "Double-checking the plan") {
          rawSteps.push({ toolName: "critique_plan", args: {} });
        } else {
          finalText = part.text;
        }
      }
    }
  }

  // Pass 2: Group retries and deduplicate globals
  const processedSteps: ParsedStep[] = [];
  const seenSignatures = new Set<string>();

  let currentRetryGroup: ParsedStep[] = [];

  for (let i = 0; i < rawSteps.length; i++) {
    const step = rawSteps[i];
    const { text } = describeToolCall(step.toolName, step.args, step.result);
    const signature = `${step.toolName}::${text}`;

    // Is it a critique step? Always add, no deduplication
    if (step.toolName === "critique_plan") {
      processedSteps.push(step);
      continue;
    }

    // Is it part of a calendar retry sequence?
    if (step.toolName === 'check_calendar_conflicts') {
      currentRetryGroup.push(step);
      continue;
    } else if (step.toolName === 'schedule_task' && currentRetryGroup.length > 0) {
      step.retryGroup = [...currentRetryGroup];
      processedSteps.push(step);
      seenSignatures.add(signature);
      currentRetryGroup = [];
      continue;
    } else {
      // If we had a retry group but the sequence broke without schedule_task
      if (currentRetryGroup.length > 0) {
        // Just flush the retry group as normal steps (or as a group under the last check)
        const lastCheck = currentRetryGroup.pop()!;
        lastCheck.retryGroup = [...currentRetryGroup];
        processedSteps.push(lastCheck);
        currentRetryGroup = [];
      }

      // Global Deduplication Check (only if not part of a retry group)
      if (seenSignatures.has(signature)) {
        continue;
      }
      seenSignatures.add(signature);
      processedSteps.push(step);
    }
  }

  // Flush any remaining
  if (currentRetryGroup.length > 0) {
    const lastCheck = currentRetryGroup.pop()!;
    lastCheck.retryGroup = [...currentRetryGroup];
    processedSteps.push(lastCheck);
  }

  return { steps: processedSteps, finalText };
}
