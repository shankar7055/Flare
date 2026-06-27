"use client";

import React, { useMemo } from "react";
import LogoLoop, { type LogoItem } from "@/components/LogoLoop";
import { logos } from "./logos";

const LogoStrip = () => {
  const partnerLogos: LogoItem[] = useMemo(
    () =>
      logos.map((name) => ({
        node: (
          <span className="text-neutral-400 dark:text-neutral-500 font-bold tracking-wide whitespace-nowrap">
            {name}
          </span>
        ),
        title: name,
      })),
    []
  );

  return (
    <section className="py-12 bg-[#1400c6] border-y border-neutral-100 dark:border-neutral-800 overflow-hidden">
      <p className="text-center text-sm text-neutral-400 dark:text-neutral-500 mb-8 font-medium tracking-widest uppercase px-4">
        BUILT WITH
      </p>
      <LogoLoop
        logos={partnerLogos}
        speed={80}
        direction="left"
        logoHeight={28}
        gap={64}
        hoverSpeed={0}
        scaleOnHover
        fadeOut
        fadeOutColor="#1400c6"
        ariaLabel="Partner financial institutions"
      />
    </section>
  );
};

export default LogoStrip;
