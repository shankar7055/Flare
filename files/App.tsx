import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AgentRunEntry } from "./components/AgentRunEntry";
import { RescueCard } from "./components/RescueCard";
import "./theme.css";

const queryClient = new QueryClient();

// Mock run matching the real backend's reasoningTrace shape, for local preview without a server.
const mockRun = {
  id: 31,
  triggerType: "manual" as const,
  createdAt: new Date().toISOString(),
  actionsTaken: [],
  reasoningTrace: [
    { role: "model", parts: [{ functionCall: { name: "check_calendar_conflicts", args: { start_time: "2026-06-23T09:00:00Z", end_time: "2026-06-23T09:45:00Z" } } }] },
    { role: "function", parts: [{ functionResponse: { name: "check_calendar_conflicts", response: { result: { conflict: true, conflicts: ["Standup"] } } } }] },
    { role: "model", parts: [{ functionCall: { name: "schedule_task", args: { task_id: 3, start_time: "2026-06-23T10:00:00Z", end_time: "2026-06-23T10:45:00Z" } } }] },
    { role: "function", parts: [{ functionResponse: { name: "schedule_task", response: { result: { success: true, calendar_event_id: "abc123" } } } }] },
    { role: "model", parts: [{ text: "I've scheduled \"Finish report\" for 10:00–10:45 AM after finding a conflict at the original time." }] },
  ],
};

const mockRescuePlan = {
  taskTitle: "Submit hackathon backend project",
  deadline: new Date(Date.now() + 59 * 60_000).toISOString(),
  steps: [
    { start_time: new Date(Date.now() + 2 * 60_000).toISOString(), action: "Analyze logs and reproduce bug locally", duration_minutes: 30 },
    { start_time: new Date(Date.now() + 32 * 60_000).toISOString(), action: "Implement fix and run unit tests", duration_minutes: 20 },
    { start_time: new Date(Date.now() + 52 * 60_000).toISOString(), action: "Prepare submission or escalate", duration_minutes: 9 },
  ],
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ maxWidth: 480, margin: "40px auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <h1 style={{ fontSize: 16, fontWeight: 500, color: "var(--text-secondary)" }}>Component preview</h1>
        <AgentRunEntry run={mockRun} animate defaultOpen />
        <RescueCard plan={mockRescuePlan} />
      </div>
    </QueryClientProvider>
  );
}
