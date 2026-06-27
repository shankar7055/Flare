"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import ComparisonDial from "./ComparisonDial";
import ComparisonTabs from "./ComparisonTabs";
import ComparisonContent from "./ComparisonContent";
import ComparisonStats from "./ComparisonStats";
import { BEFORE_CARD_RGB, LOGO_LOOP_BLUE_RGB } from "./colors";
import "./ComparisonSection.css";

const ComparisonSection = () => {
  const containerRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const cardBackground = useTransform(
    scrollYProgress,
    [0, 0.4, 0.65, 1],
    [
      `rgb(${BEFORE_CARD_RGB})`,
      `rgb(${BEFORE_CARD_RGB})`,
      `rgb(${LOGO_LOOP_BLUE_RGB})`,
      `rgb(${LOGO_LOOP_BLUE_RGB})`,
    ]
  );

  const cardBorderColor = useTransform(
    scrollYProgress,
    [0, 0.55, 1],
    ["rgba(255, 255, 255, 0.95)", "rgba(255, 255, 255, 0.6)", "rgba(255, 255, 255, 0.2)"]
  );

  const cardShadow = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [
      "0 4px 24px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.06)",
      "0 8px 32px rgba(255, 0, 40, 0.2)",
      "0 12px 40px rgba(20, 0, 198, 0.35)",
    ]
  );

  const headingOpacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [1, 1, 1, 1]);

  return (
    <section id="use-cases" ref={containerRef} className="comparison-section bg-[#beef00]" style={{ height: "400vh" }}>
      <div className="sticky top-0 min-h-screen flex flex-col items-center justify-center py-12 md:py-16 px-4 md:px-6">
        <motion.h2 
          style={{ opacity: headingOpacity }}
          className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-neutral-900 tracking-tight text-center mb-8 md:mb-10 max-w-[900px] leading-tight"
        >
          Reminders don't get things done. Agents do.
        </motion.h2>

        <div className="comparison-card-wrap w-full max-w-[1120px] mx-auto">
          <div className="comparison-dial-row relative z-20">
            <ComparisonTabs progress={scrollYProgress} />
            <div className="comparison-dial-slot">
              <ComparisonDial progress={scrollYProgress} />
            </div>
          </div>

          <motion.div
            className="comparison-card relative w-full border"
            style={{
              backgroundColor: cardBackground,
              borderColor: cardBorderColor,
              boxShadow: cardShadow,
            }}
          >
            <div className="comparison-card__inner relative z-10 grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-8 lg:gap-10 items-center">
              <ComparisonContent progress={scrollYProgress} />
              <ComparisonStats progress={scrollYProgress} />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;
