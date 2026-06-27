"use client";

import React from "react";
import {
  Navbar,
  HeroSection,
  LogoStrip,
  NeoBrutalistCardsSection,
  ComparisonSection,
  StatsSection,
  FeaturesSection,
  PricingSection,
  FAQSection,
  CTASection,
  Footer,
} from "@/components/landing";
import TargetCursor from "@/components/TargetCursor";

export const LandingPage: React.FC<{ onGetStarted: () => void }> = ({
  onGetStarted,
}) => {
  return (
    <div
      className="antialiased bg-[#beef00] dark:bg-[#beef00]"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <TargetCursor
        spinDuration={2}
        hideDefaultCursor={true}
        parallaxOn={true}
      />
      <Navbar onCTA={onGetStarted} />
      <HeroSection onCTA={onGetStarted} />
      <LogoStrip />
      <NeoBrutalistCardsSection />
      <ComparisonSection />
      <FeaturesSection />
      <PricingSection onCTA={onGetStarted} />

      <FAQSection />
      <Footer />
    </div>
  );
};
