"use client";

import React from "react";
import type { CTACallbackProps } from "../types";

const CTASection = ({ onCTA }: CTACallbackProps) => (
  <section className="py-24 px-4 bg-[#beef00] dark:bg-[#beef00]">
    <div className="max-w-4xl mx-auto rounded-3xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 p-14 text-center">
      <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
        Stop missing deadlines today
      </h2>
      <p className="text-neutral-400 dark:text-neutral-500 text-lg mb-10 max-w-md mx-auto">
        Join users who've already transformed their time management with Flare.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={onCTA}
          className="flex items-center gap-2 px-8 py-4 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-bold rounded-full hover:opacity-80 active:scale-95 transition-all text-base"
        >
          Get started for free
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button className="flex items-center gap-2 px-8 py-4 border border-neutral-700 dark:border-neutral-200 text-neutral-300 dark:text-neutral-600 font-semibold rounded-full hover:border-neutral-400 transition-all text-base">
          View demo
        </button>
      </div>
    </div>
  </section>
);

export default CTASection;
