import React from "react";
import type { Stat } from "../types";

interface StatCardProps {
  stat: Stat;
}

const StatCard = ({ stat }: StatCardProps) => (
  <div className="text-center p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
    <div className="text-3xl mb-2">{stat.icon}</div>
    <div className="text-3xl font-black text-neutral-900 dark:text-white mb-1">{stat.value}</div>
    <div className="text-sm text-neutral-500 dark:text-neutral-400">{stat.label}</div>
  </div>
);

export default React.memo(StatCard);
