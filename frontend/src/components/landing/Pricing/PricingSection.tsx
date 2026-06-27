"use client";

import React from "react";
import type { CTACallbackProps } from "../types";

const PricingSection = ({ onCTA }: CTACallbackProps) => {
  return (
    <section id="pricing" className="py-24 bg-[#1400c6] border-y border-neutral-100 dark:border-neutral-800 text-white text-center">
      <div className="max-w-3xl mx-auto px-4">
        <p className="text-xs font-bold tracking-widest text-[#beef00] uppercase mb-3">AVAILABLE NOW</p>
        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-6">
          Built for the hackathon. Free to try.
        </h2>
        <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
          This is a hackathon project — no plans, no pricing. Just the live agent, working in real time.
        </p>
        <button
          onClick={onCTA}
          className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#1400c6] font-bold rounded-full hover:opacity-80 active:scale-95 transition-all shadow-lg"
        >
          Try the live demo
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </section>
  );
};

export default PricingSection;
