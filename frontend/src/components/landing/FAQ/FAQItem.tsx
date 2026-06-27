import React from "react";
import type { FAQ } from "../types";

interface FAQItemProps {
  faq: FAQ;
  index: number;
  isOpen: boolean;
  onToggle: (index: number) => void;
}

const FAQItem = ({ faq, index, isOpen, onToggle }: FAQItemProps) => (
  <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
    <button
      onClick={() => onToggle(index)}
      className="w-full flex items-center justify-between p-5 text-left"
    >
      <span className="font-semibold text-sm text-neutral-900 dark:text-white">{faq.q}</span>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors text-lg ${isOpen ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"}`}>
        {isOpen ? "−" : "+"}
      </div>
    </button>
    {isOpen && (
      <div className="px-5 pb-5 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed border-t border-neutral-100 dark:border-neutral-800 pt-4">
        {faq.a}
      </div>
    )}
  </div>
);

export default React.memo(FAQItem);
