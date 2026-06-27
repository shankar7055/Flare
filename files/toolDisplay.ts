import {
  ListChecks,
  CalendarSearch,
  CalendarCheck,
  CalendarClock,
  Mail,
  AlertTriangle,
  Siren,
  Scissors,
  TrendingUp,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

export type ToolTone = "neutral" | "warning" | "success" | "danger";

export interface ToolDisplayConfig {
  icon: LucideIcon;
  tone: ToolTone;
  /** Render a human-readable line for this tool call. Falls back to a generic label. */
  describe: (args: Record<string, any>, result?: Record<string, any>) => string;
}

const toneTextColor: Record<ToolTone, string> = {
  neutral: "var(--text-secondary)",
  warning: "var(--amber-600)",
  success: "var(--teal-600)",
  danger: "var(--coral-600)",
};

export function toneColor(tone: ToolTone) {
  return toneTextColor[tone];
}

function time(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export const TOOL_DISPLAY: Record<string, ToolDisplayConfig> = {
  get_tasks: {
    icon: ListChecks,
    tone: "neutral",
    describe: () => "Reviewing your tasks and calendar",
  },
  get_user_patterns: {
    icon: TrendingUp,
    tone: "neutral",
    describe: () => "Checking your usual habits and response patterns",
  },
  break_down_task: {
    icon: Scissors,
    tone: "neutral",
    describe: (args) =>
      `Breaking "${args.title ?? "this task"}" into ${args.subtasks?.length ?? "smaller"} steps`,
  },
  check_calendar_conflicts: {
    icon: CalendarSearch,
    tone: "neutral",
    describe: (args, result) => {
      const t = `${time(args.start_time)}–${time(args.end_time)}`;
      if (result?.conflict) return `Conflict found at ${t}`;
      if (result && result.conflict === false) return `${t} is free`;
      return `Checking calendar ${t}`;
    },
  },
  schedule_task: {
    icon: CalendarCheck,
    tone: "success",
    describe: (args) => `Scheduled for ${time(args.start_time)}–${time(args.end_time)}`,
  },
  escalate_task: {
    icon: AlertTriangle,
    tone: "warning",
    describe: () => "Escalating an at-risk task",
  },
  generate_rescue_plan: {
    icon: Siren,
    tone: "danger",
    describe: (args) => `Building an emergency plan — ${args.time_remaining_minutes ?? "?"} min left`,
  },
  send_notification: {
    icon: Mail,
    tone: "neutral",
    describe: (args) => `Sent a ${args.urgency ?? ""} reminder`.replace(/\s+/g, " ").trim(),
  },
  log_user_feedback: {
    icon: CheckCircle2,
    tone: "success",
    describe: () => "Recorded the outcome for next time",
  },
  create_task: {
    icon: CalendarClock,
    tone: "neutral",
    describe: (args) => `Created task "${args.title ?? ""}"`,
  },
};

export function describeToolCall(toolName: string, args: Record<string, any> = {}, result?: Record<string, any>) {
  const cfg = TOOL_DISPLAY[toolName];
  if (!cfg) return { icon: ListChecks, tone: "neutral" as ToolTone, text: toolName };
  return { icon: cfg.icon, tone: cfg.tone, text: cfg.describe(args, result) };
}
