import React from "react";

interface FloatingBadgeProps {
  children: React.ReactNode;
  className?: string;
}

const FloatingBadge = ({ children, className }: FloatingBadgeProps) => (
  <div
    className={`absolute z-20 rounded-xl bg-white dark:bg-neutral-800 shadow-2xl border border-neutral-100 dark:border-neutral-700 px-4 py-3 text-sm font-semibold text-neutral-800 dark:text-white ${className}`}
  >
    {children}
  </div>
);

export default React.memo(FloatingBadge);
