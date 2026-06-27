import React from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";

interface ComparisonTabsProps {
  progress: MotionValue<number>;
}

const ComparisonTabs = ({ progress }: ComparisonTabsProps) => {
  const beforeOpacity = useTransform(progress, [0, 0.2, 0.75, 1], [1, 1, 0.35, 0.35]);
  const afterOpacity = useTransform(progress, [0, 0.2, 0.75, 1], [0.35, 0.35, 1, 1]);
  const beforeWeight = useTransform(progress, (p) => (p < 0.55 ? 600 : 400));
  const afterWeight = useTransform(progress, (p) => (p >= 0.55 ? 600 : 400));
  const beforeUnderlineScale = useTransform(progress, [0, 0.55, 0.75], [1, 1, 0]);
  const afterUnderlineScale = useTransform(progress, [0, 0.55, 0.75], [0, 0, 1]);
  const afterColor = useTransform(
    progress,
    [0, 0.55, 1],
    ["rgb(115, 115, 115)", "rgb(115, 115, 115)", "rgb(23, 23, 23)"]
  );

  return (
    <>
      <motion.div
        className="comparison-tab comparison-tab--before text-left hidden sm:block"
        style={{ opacity: beforeOpacity, color: "rgb(23, 23, 23)", fontWeight: beforeWeight }}
      >
        <span className="text-sm md:text-base tracking-tight">Before Flare</span>
        <motion.div
          className="comparison-tab__underline bg-neutral-900"
          style={{ scaleX: beforeUnderlineScale }}
        />
      </motion.div>

      <motion.div
        className="comparison-tab comparison-tab--after text-right hidden sm:block"
        style={{ opacity: afterOpacity, color: afterColor, fontWeight: afterWeight }}
      >
        <span className="text-sm md:text-base tracking-tight">After Flare</span>
        <motion.div
          className="comparison-tab__underline bg-[#1400c6] ml-auto"
          style={{ scaleX: afterUnderlineScale }}
        />
      </motion.div>

      <div className="flex sm:hidden justify-between w-full px-4 absolute bottom-2 inset-x-0 gap-4">
        <motion.div
          className="comparison-tab text-left flex-1"
          style={{ opacity: beforeOpacity, fontWeight: beforeWeight, color: "rgb(23, 23, 23)" }}
        >
          <span className="text-xs">Before Flare</span>
          <motion.div className="comparison-tab__underline bg-neutral-900" style={{ scaleX: beforeUnderlineScale }} />
        </motion.div>
        <motion.div
          className="comparison-tab text-right flex-1"
          style={{ opacity: afterOpacity, fontWeight: afterWeight, color: afterColor }}
        >
          <span className="text-xs">After Flare</span>
          <motion.div className="comparison-tab__underline bg-[#1400c6] ml-auto" style={{ scaleX: afterUnderlineScale }} />
        </motion.div>
      </div>
    </>
  );
};

export default React.memo(ComparisonTabs);
