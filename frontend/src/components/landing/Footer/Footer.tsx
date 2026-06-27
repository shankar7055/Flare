import React from "react";
import { footerColumns, footerSocialLinks } from "./footerLinks";

const Footer = () => (
  <footer className="py-12 px-4 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800">
    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
      <div className="md:col-span-1">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8L5.5 5.5L8 8L10.5 5.5L13 8" stroke="white" className="dark:stroke-neutral-900" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-bold text-neutral-900 dark:text-white text-lg">Flare</span>
        </div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Flare — An AI agent that actually gets things done before the deadline.</p>
      </div>
      {footerColumns.map((col) => (
        <div key={col.title}>
          <h4 className="font-bold text-neutral-900 dark:text-white mb-4 text-sm">{col.title}</h4>
          <ul className="space-y-2">
            {col.links.map((l) => (
              <li key={l}><a href="#" className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">{l}</a></li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <div className="max-w-5xl mx-auto mt-10 pt-6 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-sm text-neutral-400">© 2026 Flare. All rights reserved.</p>
      <div className="flex items-center gap-3">
        {footerSocialLinks.map((s) => (
          <button key={s} className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors font-medium">{s}</button>
        ))}
      </div>
    </div>
  </footer>
);

export default Footer;
