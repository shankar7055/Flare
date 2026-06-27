import React from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { beforeContent, afterContent } from "./comparisonData";

interface ComparisonContentProps {
  progress: MotionValue<number>;
}

const XIcon = ({ opacity, scale }: { opacity: MotionValue<number>; scale: MotionValue<number> }) => (
  <motion.span
    className="inline-flex items-center justify-center w-[18px] h-[18px] text-white text-sm font-bold shrink-0 mt-0.5"
    style={{ opacity, scale }}
    aria-hidden
  >
    ✕
  </motion.span>
);

const CheckIcon = ({ opacity, scale }: { opacity: MotionValue<number>; scale: MotionValue<number> }) => (
  <motion.span
    className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-white/20 text-white text-xs font-bold shrink-0 mt-0.5"
    style={{ opacity, scale }}
    aria-hidden
  >
    ✓
  </motion.span>
);

const ComparisonContent = ({ progress }: ComparisonContentProps) => {
  const beforeHeadingOpacity = useTransform(progress, [0.5, 0.62], [1, 0]);
  const beforeHeadingX = useTransform(progress, [0.5, 0.62], [0, -16]);
  const beforeHeadingY = useTransform(progress, [0.5, 0.62], [0, -8]);
  const beforeVisibility = useTransform(progress, (p) => (p >= 0.62 ? "hidden" : "visible"));
  const beforePointerEvents = useTransform(progress, (p) => (p >= 0.62 ? "none" : "auto"));

  const afterHeadingOpacity = useTransform(progress, [0.58, 0.72], [0, 1]);
  const afterHeadingY = useTransform(progress, [0.58, 0.72], [16, 0]);
  const afterVisibility = useTransform(progress, (p) => (p <= 0.58 ? "hidden" : "visible"));
  const afterPointerEvents = useTransform(progress, (p) => (p <= 0.58 ? "none" : "auto"));

  const beforeBulletsOpacity = useTransform(progress, [0.5, 0.62], [1, 0]);
  const afterBulletsOpacity = useTransform(progress, [0.62, 0.78], [0, 1]);

  const iconBeforeOpacity = useTransform(progress, [0.5, 0.6], [1, 0]);
  const iconBeforeScale = useTransform(progress, [0.5, 0.6], [1, 0.85]);
  const iconAfterOpacity = useTransform(progress, [0.64, 0.76], [0, 1]);
  const iconAfterScale = useTransform(progress, [0.64, 0.76], [0.85, 1]);

  return (
    <div className="relative min-h-[220px] lg:min-h-[260px]">
      <motion.div
        className="comparison-heading-layer absolute inset-0"
        style={{
          opacity: beforeHeadingOpacity,
          x: beforeHeadingX,
          y: beforeHeadingY,
          visibility: beforeVisibility,
          pointerEvents: beforePointerEvents,
        }}
      >
        <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-snug mb-5 md:mb-6">
          {beforeContent.heading}
        </h3>
        <motion.ul
          className="space-y-3.5 md:space-y-4"
          style={{ opacity: beforeBulletsOpacity }}
        >
          {beforeContent.bullets.map((bullet) => (
            <li
              key={bullet.id}
              className="comparison-bullet flex items-start gap-2.5 text-sm md:text-[15px] text-white/90 leading-relaxed"
            >
              <XIcon opacity={iconBeforeOpacity} scale={iconBeforeScale} />
              <span>{bullet.text}</span>
            </li>
          ))}
        </motion.ul>
      </motion.div>

      <motion.div
        className="comparison-heading-layer absolute inset-0"
        style={{
          opacity: afterHeadingOpacity,
          y: afterHeadingY,
          visibility: afterVisibility,
          pointerEvents: afterPointerEvents,
        }}
      >
        <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-snug mb-5 md:mb-6">
          {afterContent.heading}
        </h3>
        <motion.ul className="space-y-3.5 md:space-y-4" style={{ opacity: afterBulletsOpacity }}>
          {afterContent.bullets.map((bullet) => (
            <li
              key={bullet.id}
              className="comparison-bullet flex items-start gap-2.5 text-sm md:text-[15px] text-white/85 leading-relaxed"
            >
              <CheckIcon opacity={iconAfterOpacity} scale={iconAfterScale} />
              <span>{bullet.text}</span>
            </li>
          ))}
        </motion.ul>
      </motion.div>
    </div>
  );
};

export default React.memo(ComparisonContent);
