import React from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { beforeContent, afterContent } from "./comparisonData";

interface ComparisonStatsProps {
  progress: MotionValue<number>;
}

const ComparisonStats = ({ progress }: ComparisonStatsProps) => {
  const beforeOpacity = useTransform(progress, [0.52, 0.62], [1, 0]);
  const beforeVisibility = useTransform(progress, (p) => (p >= 0.62 ? "hidden" : "visible"));
  const beforePointerEvents = useTransform(progress, (p) => (p >= 0.62 ? "none" : "auto"));

  const afterOpacity = useTransform(progress, [0.62, 0.78], [0, 1]);
  const afterScale = useTransform(progress, [0.62, 0.78], [0.96, 1]);
  const afterY = useTransform(progress, [0.62, 0.78], [12, 0]);
  const afterVisibility = useTransform(progress, (p) => (p <= 0.62 ? "hidden" : "visible"));
  const afterPointerEvents = useTransform(progress, (p) => (p <= 0.62 ? "none" : "auto"));

  return (
    <div className="relative min-h-[220px] lg:min-h-[260px] flex flex-col justify-center">
      <motion.div
        className="absolute inset-0 flex flex-col gap-4 justify-center"
        style={{
          opacity: beforeOpacity,
          visibility: beforeVisibility,
          pointerEvents: beforePointerEvents,
        }}
      >
        {beforeContent.stats.map((stat) => (
          <div
            key={stat.id}
            className="comparison-stat-card comparison-stat-card--before bg-white/20 border border-white/35"
          >
            <div className="text-4xl md:text-[2.75rem] font-black text-white tracking-tight leading-none mb-2">
              {stat.value}
            </div>
            <div className="text-sm md:text-[15px] text-white/85 font-medium leading-snug">
              {stat.label}
            </div>
          </div>
        ))}
      </motion.div>

      <motion.div
        className="absolute inset-0 flex flex-col gap-4 justify-center"
        style={{
          opacity: afterOpacity,
          scale: afterScale,
          y: afterY,
          visibility: afterVisibility,
          pointerEvents: afterPointerEvents,
        }}
      >
        {afterContent.stats.map((stat) => (
          <div
            key={stat.id}
            className="comparison-stat-card comparison-stat-card--after bg-white/15 border border-white/30 backdrop-blur-sm"
          >
            <div className="text-4xl md:text-[2.75rem] font-black text-white tracking-tight leading-none mb-2">
              {stat.value}
            </div>
            <div className="text-sm md:text-[15px] text-white/80 font-medium leading-snug">
              {stat.label}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default React.memo(ComparisonStats);
