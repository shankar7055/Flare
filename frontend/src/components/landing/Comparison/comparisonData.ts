export interface ComparisonBullet {
  id: string;
  text: string;
}

export interface ComparisonStat {
  id: string;
  value: string;
  label: string;
}

export const beforeContent = {
  heading: "The problem with passive reminders",
  bullets: [
    {
      id: "b1",
      text: "A notification fires, and it's easy to ignore",
    },
    {
      id: "b2",
      text: "Deadlines get missed even when you \"knew\" about them",
    },
    {
      id: "b3",
      text: "Nothing actually happens until you take action yourself",
    },
  ] satisfies ComparisonBullet[],
  stats: [
    { id: "s1", value: "Passive", label: "Most reminders just notify, they don't help" },
    { id: "s2", value: "Manual", label: "You're still the one doing all the planning" },
  ] satisfies ComparisonStat[],
};

export const afterContent = {
  heading: "An agent that actually intervenes",
  bullets: [
    { id: "a1", text: "Reschedules around real conflicts automatically" },
    { id: "a2", text: "Builds a minute-by-minute rescue plan when time is short" },
    { id: "a3", text: "Escalates and notifies you with real urgency, not noise" },
  ] satisfies ComparisonBullet[],
  stats: [
    { id: "s1", value: "Autonomous", label: "Plans and acts without being asked" },
    { id: "s2", value: "Transparent", label: "Every decision is visible, not a black box" },
  ] satisfies ComparisonStat[],
};
