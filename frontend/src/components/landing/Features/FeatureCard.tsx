import React from "react";
import type { Feature } from "../types";

interface FeatureCardProps {
  feature: Feature;
  index: number;
}

const FeatureCard = ({ feature, index }: FeatureCardProps) => (
  <div
    className={`rounded-3xl p-6 flex flex-col gap-4 hover:scale-[1.02] transition-transform cursor-default cursor-target ${feature.dark
      ? "bg-neutral-900 border border-neutral-800"
      : "bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800"
      } ${index === 0 ? "md:col-span-2" : ""}`}
  >
    <div
      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${feature.dark ? "bg-neutral-800" : "bg-neutral-100 dark:bg-neutral-800"
        }`}
    >
      {feature.icon}
    </div>
    <h3
      className={`text-lg font-bold ${feature.dark ? "text-white" : "text-neutral-900 dark:text-white"
        }`}
    >
      {feature.title}
    </h3>
    {feature.highlight && (
      <div className="text-6xl font-black text-emerald-400 leading-none py-2" style={{ textShadow: "0 0 40px #22c55e60" }}>
        {feature.highlight}
      </div>
    )}
    <p
      className={`text-sm leading-relaxed ${feature.dark ? "text-neutral-400" : "text-neutral-500 dark:text-neutral-400"
        }`}
    >
      {feature.desc}
    </p>
    {feature.tags && (
      <div className="flex flex-wrap gap-2">
        {feature.tags.map((tag) => (
          <span
            key={tag}
            className="text-xs px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700"
          >
            {tag}
          </span>
        ))}
      </div>
    )}
  </div>
);

export default React.memo(FeatureCard);
