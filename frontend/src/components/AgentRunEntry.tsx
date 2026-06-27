import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Siren, Sparkles } from "lucide-react";
import { parseReasoningTrace } from "../lib/parseTrace";
import { describeToolCall, toneColor } from "../lib/toolDisplay";
import type { AgentRun } from '../api/client';

const TRIGGER_LABEL: Record<string, string> = {
  manual: "Manual trigger",
  periodic_sweep: "Routine sweep",
  new_task: "New task review",
  rescue_mode: "Rescue mode",
  deadline_proximity: "Deadline approaching",
  calendar_change: "Calendar changed",
};

export const AgentRunEntry: React.FC<{
  run: AgentRun;
  animate?: boolean;
  defaultOpen?: boolean;
}> = ({
  run,
  animate = false,
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const { steps, finalText } = useMemo(() => parseReasoningTrace(run.reasoningTrace), [run.reasoningTrace]);
  const isRescue = run.triggerType === "rescue_mode";

  return (
    <div
      className="w-full transition-all duration-300 overflow-hidden border border-border-subtle/40 rounded-xl"
      style={{
        background: "var(--bg-surface)",
        border: `0.5px solid ${isRescue ? "rgba(232,105,74,0.35)" : "var(--border-subtle)"}`,
        borderRadius: "12px",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3.5 py-3 bg-transparent border-0 cursor-pointer text-left focus:outline-none"
      >
        {isRescue ? (
          <Siren size={16} className="text-danger animate-bounce shrink-0" />
        ) : (
          <Sparkles size={16} className="text-accent shrink-0" />
        )}
        <span
          className="text-xs font-bold font-sans uppercase tracking-wider"
          style={{
            color: isRescue ? "var(--danger)" : "var(--accent)",
          }}
        >
          {TRIGGER_LABEL[run.triggerType] ?? run.triggerType}
        </span>
        <span className="text-[10px] font-mono text-text-tertiary ml-auto select-none">
          {new Date(run.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0 flex items-center justify-center">
          <ChevronDown size={14} className="text-text-tertiary" />
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
            <div className="px-4 pb-4 flex flex-col gap-2">
              {steps.map((step, i) => {
                const { icon: Icon, tone, text } = describeToolCall(step.toolName, step.args, step.result);
                return (
                  <motion.div
                    key={i}
                    initial={animate ? { opacity: 0, y: 4 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: animate ? i * 0.45 : 0, duration: 0.3 }}
                    className="flex items-start gap-2.5 text-xs text-text-primary font-sans leading-relaxed"
                  >
                    <Icon size={14} color={toneColor(tone)} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span>{text}</span>
                  </motion.div>
                );
              })}

              {finalText && (
                <motion.p
                  initial={animate ? { opacity: 0 } : false}
                  animate={{ opacity: 1 }}
                  transition={{ delay: animate ? steps.length * 0.45 + 0.2 : 0 }}
                  className="text-xs text-text-secondary mt-1 pt-2 border-t border-border-subtle/50 font-sans leading-relaxed"
                >
                  {finalText}
                </motion.p>
              )}

              {steps.length === 0 && !finalText && (
                <p className="text-xs text-text-tertiary italic font-sans m-0">
                  No actions were taken this cycle.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default AgentRunEntry;
