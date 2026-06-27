import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Loader2 } from "lucide-react";
import { AgentRunEntry, type AgentRun } from "./AgentRunEntry";

async function fetchRuns(): Promise<AgentRun[]> {
  const res = await fetch("/api/agent/runs", { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load agent runs");
  return res.json();
}

function authHeaders(): HeadersInit {
  const token = sessionStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function AgentActivityFeed() {
  const queryClient = useQueryClient();
  const [triggering, setTriggering] = useState(false);
  // The id of the run we just triggered manually — only this one gets the staggered reveal animation.
  const [justTriggeredId, setJustTriggeredId] = useState<number | null>(null);

  const { data: runs, isLoading, isError } = useQuery({
    queryKey: ["agent-runs"],
    queryFn: fetchRuns,
    refetchInterval: 6000,
  });

  async function handleTrigger() {
    setTriggering(true);
    try {
      const res = await fetch("/api/agent/run", { method: "POST", headers: authHeaders() });
      const newRun: AgentRun = await res.json();
      setJustTriggeredId(newRun.id);
      await queryClient.invalidateQueries({ queryKey: ["agent-runs"] });
    } catch {
      // Swallow — the feed will simply show no new entry; a calmer failure than a crash.
    } finally {
      setTriggering(false);
    }
  }

  return (
    <div
      style={{
        background: "var(--bg-surface-raised)",
        border: "0.5px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Activity size={16} color="var(--text-secondary)" />
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>Agent activity</span>
        <button
          onClick={handleTrigger}
          disabled={triggering}
          style={{
            marginLeft: "auto",
            fontSize: 12.5,
            padding: "6px 12px",
            borderRadius: "var(--radius-md)",
            border: "0.5px solid var(--border-default)",
            background: "transparent",
            color: "var(--text-primary)",
            cursor: triggering ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {triggering && <Loader2 size={12} className="spin" />}
          {triggering ? "Thinking…" : "Trigger agent now"}
        </button>
      </div>

      {isLoading && <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Loading activity…</p>}
      {isError && <p style={{ fontSize: 13, color: "var(--coral-400)" }}>Couldn't reach the agent right now.</p>}
      {!isLoading && !isError && runs?.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
          No activity yet — add a task or wait for the next routine sweep.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {runs
          ?.slice()
          .sort((a, b) => b.id - a.id)
          .slice(0, 12)
          .map((run) => (
            <AgentRunEntry
              key={run.id}
              run={run}
              animate={run.id === justTriggeredId}
              defaultOpen={run.id === justTriggeredId}
            />
          ))}
      </div>
    </div>
  );
}
