import type { FAQ } from "../types";

export const faqs: FAQ[] = [
  {
    q: "Does it actually modify my real calendar?",
    a: "Yes — once you connect Google Calendar, the agent creates and moves real events, not placeholders.",
  },
  {
    q: "What happens if a deadline is about to be missed?",
    a: "The agent enters Rescue Mode: it builds an immediate, timestamped plan and sends you a critical notification.",
  },
  {
    q: "Is this just a chatbot wrapper around an LLM?",
    a: "No — it uses real function-calling to check your calendar, schedule tasks, escalate, and notify, with every decision logged and visible.",
  },
  {
    q: "What if the AI hits a rate limit or error?",
    a: "The agent retries automatically and degrades gracefully — it never silently fails or leaves a task unscheduled without telling you.",
  },
  {
    q: "Is my data private?",
    a: "Your tasks and calendar data are used only to power your own agent — nothing is shared or sold.",
  },
];
