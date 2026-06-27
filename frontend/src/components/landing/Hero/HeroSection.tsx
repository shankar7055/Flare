"use client";

import React from "react";
import PixelTrail from "@/components/ui/PixelTrail";
import { Globe } from "@/components/ui/globe";
import type { CTACallbackProps } from "../types";

const HeroSection = ({ onCTA: _onCTA }: CTACallbackProps) => {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#beef00]">
      <div
        className="absolute inset-0 z-0"
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            pointerEvents: "auto",
          }}
        >
          <PixelTrail
            gridSize={45}
            trailSize={0.12}
            maxAge={300}
            interpolate={5}
            color="#6366f1"
            gooeyFilter={{
              id: "hero-goo-filter",
              strength: 2.5,
            }}
          />
        </div>
      </div>

      <div className="relative min-h-screen bg-[#baff00] pt-24">
        <Globe />
      </div>
    </section>
  );
};

export default HeroSection;
