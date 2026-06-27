import React from "react";
import StatCard from "./StatCard";
import { stats } from "./stats";

const StatsSection = () => (
  <section className="py-20 px-4 bg-[#beef00] dark:bg-[#beef00]">
    <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
      {stats.map((s) => (
        <StatCard key={s.label} stat={s} />
      ))}
    </div>
  </section>
);

export default StatsSection;
