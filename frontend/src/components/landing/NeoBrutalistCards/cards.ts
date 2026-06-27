export interface NeoBrutalistCardData {
  id: string;
  head: string;
  content: string;
  buttonText: string;
}

export const neoBrutalistCards: NeoBrutalistCardData[] = [
  {
    id: "perceive",
    head: "Step 01 — Perceive",
    content:
      "The agent checks your tasks, deadlines, and real calendar — every cycle, not just when you ask.",
    buttonText: "Details",
  },
  {
    id: "plan",
    head: "Step 02 — Plan",
    content:
      "It reasons through conflicts, priorities, and your own habits, then decides what actually needs to happen next.",
    buttonText: "Details",
  },
  {
    id: "act",
    head: "Step 03 — Act",
    content:
      "It schedules, reschedules, escalates, or builds an emergency plan — and shows you exactly why, in plain language.",
    buttonText: "Details",
  },
];
