"use client";

import React, { useState, useEffect } from "react";
import NavItem from "./NavItem";
import { navLinks } from "./navLinks";
import type { CTACallbackProps } from "../types";

const Navbar = ({ onCTA }: CTACallbackProps) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${scrolled ? "w-[96vw]" : "w-[90vw]"
        } max-w-5xl`}
    >
      <div className="flex items-center justify-between px-6 py-3 rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 shadow-lg">
        <div className="flex items-center gap-2 font-black text-lg tracking-tight">
          <div className="w-7 h-7 rounded-lg bg-neutral-900 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8L5.5 5.5L8 8L10.5 5.5L13 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 11L5.5 8.5L8 11L10.5 8.5L13 11" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
            </svg>
          </div>
          <span className="text-neutral-900 dark:text-white">Flare</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <NavItem key={l}>{l}</NavItem>
          ))}
        </div>

        <button
          onClick={onCTA}
          className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-bold rounded-full hover:opacity-80 active:scale-95 transition-all"
        >
          Try the live demo
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7H12M12 7L8 3M12 7L8 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
