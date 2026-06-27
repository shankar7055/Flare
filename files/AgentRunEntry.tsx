import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Siren, Sparkles } from "lucide-react";
import { parseReasoningTrace } from "../lib/parseTrace";
import { describeToolCall, toneColor } from "../lib/toolDisplay";

export interface AgentRun {
  id: number;
  triggerType: "manual" | "periodic_sweep" | "new_task" | "rescue_mode" | "deadline_proximity" | "calendar_change";
  reasoningTrace: any[];
  actionsTaken: any[];
  createdAt: string;
}

const TRIGGER_LABEL: Record<string, string> = {
  manual: "Manual trigger",
  periodic_sweep: "Routine sweep",
  new_task: "New task review",
  rescue_mode: "Rescue mode",
  deadline_proximity: "Deadline approaching",
  calendar_change: "Calendar changed",
};

/** When true, steps reveal one-by-one with a short delay — used for the live "trigger now" demo. */
export function AgentRunEntry({
  run,
  animate = false,
  defaultOpen = false,
}: {
  run: AgentRun;
  animate?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { steps, finalText } = useMemo(() => parseReasoningTrace(run.reasoningTrace), [run.reasoningTrace]);
  const isRescue = run.triggerType === "rescue_mode";

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: `0.5px solid ${isRescue ? "rgba(232,105,74,0.35)" : "var(--border-subtle)"}`,
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {isRescue ? (
          <Siren size={16} color="var(--coral-400)" />
        ) : (
          <Sparkles size={16} color="var(--text-secondary)" />
        )}
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: isRescue ? "var(--coral-400)" : "var(--text-secondary)",
          }}
        >
          {TRIGGER_LABEL[run.triggerType] ?? run.triggerType}
        </span>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)", marginLeft: "auto" }}>
          {new Date(run.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} color="var(--text-tertiary)" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 14px 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              {steps.map((step, i) => {
                const { icon: Icon, tone, text } = describeToolCall(step.toolName, step.args, step.result);
                return (
                  <motion.div
                    key={i}
                    initial={animate ? { opacity: 0, y: 4 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: animate ? i * 0.45 : 0, duration: 0.3 }}
                    style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13.5 }}
                  >
                    <Icon size={15} color={toneColor(tone)} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ color: "var(--text-primary)" }}>{text}</span>
                  </motion.div>
                );
              })}

              {finalText && (
                <motion.p
                  initial={animate ? { opacity: 0 } : false}
                  animate={{ opacity: 1 }}
                  transition={{ delay: animate ? steps.length * 0.45 + 0.2 : 0 }}
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    margin: "4px 0 0",
                    paddingTop: 8,
                    borderTop: "0.5px solid var(--border-subtle)",
                  }}
                >
                  {finalText}
                </motion.p>
              )}

              {steps.length === 0 && !finalText && (
                <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>
                  No actions were taken this cycle.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
