import type { Feature } from "../types";

export const features: Feature[] = [
  {
    icon: "🛡️",
    title: "Conflict Resolution",
    desc: "Detects calendar conflicts before they become a problem and finds a real alternative — automatically.",
    tags: ["Conflict detection", "Auto-reschedule", "Calendar-aware"],
    dark: false,
  },
  {
    icon: "🤖",
    title: "Rescue Mode",
    desc: "When a deadline is about to slip, the agent builds an immediate, timestamped action plan and notifies you — no more frozen panic.",
    highlight: "RESCUE",
    dark: true,
  },
  {
    icon: "📈",
    title: "Real Calendar Sync",
    desc: "Real Google Calendar integration — not a mockup. Every scheduled task is a real event you can see and trust.",
    dark: false,
  },
  {
    icon: "💼",
    title: "Personalized Patterns",
    desc: "Learns when you actually start tasks and which reminders you respond to, so it can nudge you at the right time, not just on a fixed schedule.",
    dark: false,
  },
  {
    icon: "🔔",
    title: "Smart Escalation",
    desc: "If a task is at risk and nothing's been done, the agent escalates with real urgency — and can suggest deferring something lower priority to make room.",
    dark: false,
  },
];
