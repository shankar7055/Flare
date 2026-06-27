import React from "react";
import type { PricingPlan } from "../types";

interface PricingCardProps {
  plan: PricingPlan;
  yearly: boolean;
  onCTA: () => void;
}

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 7L5 10L12 3" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PricingCard = ({ plan, yearly, onCTA }: PricingCardProps) => {
  const isPro = plan.id === "pro";
  const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;

  return (
    <div
      className={`rounded-3xl p-8 border ${isPro
        ? "bg-neutral-900 dark:bg-white border-neutral-800 dark:border-neutral-200"
        : "bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
        }`}
    >
      <div className={`flex items-start justify-between ${isPro ? "mb-1" : ""}`}>
        <h3 className={`text-xl font-bold ${isPro ? "text-white dark:text-neutral-900" : "text-neutral-900 dark:text-white"}`}>
          {plan.name}
        </h3>
        {plan.popular && (
          <span className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full">Popular</span>
        )}
      </div>
      <p className={`text-sm mb-4 ${isPro ? "text-neutral-400 dark:text-neutral-500" : "text-neutral-500 dark:text-neutral-400"}`}>
        {plan.description}
      </p>
      <div className="mb-6">
        <span className={`text-5xl font-black ${isPro ? "text-white dark:text-neutral-900" : "text-neutral-900 dark:text-white"}`}>
          ${price}
        </span>
        <span className="text-sm text-neutral-400 ml-1">/month</span>
      </div>
      <button
        onClick={onCTA}
        className={`w-full py-3.5 rounded-2xl font-bold hover:opacity-90 transition-all mb-6 ${isPro
          ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
          : "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
          }`}
      >
        Get started
      </button>
      <ul className={`space-y-2 text-sm ${isPro ? "text-neutral-300 dark:text-neutral-600" : "text-neutral-600 dark:text-neutral-300"}`}>
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <CheckIcon />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default React.memo(PricingCard);
