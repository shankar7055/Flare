import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Siren } from "lucide-react";

export interface RescueStep {
  start_time: string;
  action: string;
  duration_minutes: number;
}

export interface RescuePlanData {
  taskTitle: string;
  deadline: string; // ISO
  steps: RescueStep[];
}

function useCountdown(deadline: string) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    function tick() {
      const ms = new Date(deadline).getTime() - Date.now();
      if (ms <= 0) {
        setLabel("Overdue");
        return;
      }
      const totalMin = Math.floor(ms / 60000);
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      setLabel(h > 0 ? `${h}h ${m}m left` : `${m}m left`);
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [deadline]);

  return label;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export function RescueCard({ plan }: { plan: RescuePlanData }) {
  const countdown = useCountdown(plan.deadline);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        background: "var(--coral-bg)",
        border: "1px solid rgba(232,105,74,0.4)",
        borderRadius: "var(--radius-lg)",
        padding: "14px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Siren size={16} color="var(--coral-400)" />
        <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--coral-400)", letterSpacing: 0.2 }}>
          Rescue mode
        </span>
        <span style={{ fontSize: 12.5, color: "var(--text-secondary)", marginLeft: "auto" }}>{countdown}</span>
      </div>

      <p style={{ fontSize: 15, fontWeight: 500, margin: "0 0 12px", color: "var(--text-primary)" }}>
        {plan.taskTitle}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {plan.steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.12 }}
            style={{ display: "flex", gap: 10, fontSize: 13 }}
          >
            <span style={{ color: "var(--text-secondary)", minWidth: 48 }}>{formatTime(step.start_time)}</span>
            <span style={{ flex: 1, color: "var(--text-primary)" }}>{step.action}</span>
            <span style={{ color: "var(--text-tertiary)" }}>{step.duration_minutes} min</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
