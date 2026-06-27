import React from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import DialBeforeSvg from "./DialBeforeSvg";
import DialAfterSvg from "./DialAfterSvg";

interface ComparisonDialProps {
  progress: MotionValue<number>;
}

const ComparisonDial = ({ progress }: ComparisonDialProps) => {
  const rotate = useTransform(progress, [0, 0.25, 0.6, 1], [0, 0, 20, 20]);
  const scale = useTransform(
    progress,
    [0, 0.25, 0.45, 0.55, 0.72, 0.85, 1],
    [1, 1, 1.04, 1.08, 1.08, 1.03, 1]
  );
  const grayOpacity = useTransform(progress, [0, 0.38, 0.52, 1], [1, 1, 0, 0]);
  const greenOpacity = useTransform(progress, [0, 0.38, 0.52, 1], [0, 0, 1, 1]);
  const glowOpacity = useTransform(progress, [0, 0.3, 0.55, 1], [0, 0, 0.9, 1]);
  const glowScale = useTransform(progress, [0, 0.4, 0.6, 1], [0.5, 0.75, 1.25, 1.15]);
  const dialShadow = useTransform(
    progress,
    [0, 0.45, 1],
    [
      "drop-shadow(0 8px 16px rgba(0,0,0,0.12))",
      "drop-shadow(0 12px 28px rgba(0,0,0,0.25))",
      "drop-shadow(0 16px 48px rgba(34,197,94,0.45))",
    ]
  );

  return (
    <motion.div
      className="comparison-dial mx-auto shrink-0"
      style={{ rotate, scale, filter: dialShadow }}
    >
      <motion.div
        className="comparison-dial__glow"
        style={{ opacity: glowOpacity, scale: glowScale }}
        aria-hidden
      />
      <motion.div
        className="comparison-dial__svg"
        style={{ opacity: grayOpacity }}
      >
        <DialBeforeSvg />
      </motion.div>
      <motion.div
        className="comparison-dial__svg"
        style={{ opacity: greenOpacity }}
      >
        <DialAfterSvg />
      </motion.div>
    </motion.div>
  );
};

export default React.memo(ComparisonDial);
