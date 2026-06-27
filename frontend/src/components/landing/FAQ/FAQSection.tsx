"use client";

import React, { useState, useCallback } from "react";
import FAQItem from "./FAQItem";
import { faqs } from "./faqs";

const FAQSection = () => {
  const [open, setOpen] = useState<number | null>(0);

  const handleToggle = useCallback((index: number) => {
    setOpen((current) => (current === index ? null : index));
  }, []);

  return (
    <section id="faq" className="py-24 px-4 bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12">
        <div>
          <p className="text-xs font-bold tracking-widest text-indigo-500 uppercase mb-3">FAQ</p>
          <h2 className="text-4xl font-black text-neutral-900 dark:text-white tracking-tighter">
            Frequently asked questions
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 mt-4">Quick answers about how the agent actually works.</p>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <FAQItem
              key={faq.q}
              faq={faq}
              index={i}
              isOpen={open === i}
              onToggle={handleToggle}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
