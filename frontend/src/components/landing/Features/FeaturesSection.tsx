import React from "react";
import FeatureCard from "./FeatureCard";
import { features } from "./features";

const FeaturesSection = () => (
  <section
    id="features"
    className="py-24 px-4"
  >
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-14">
        <p className="text-xs font-bold tracking-widest text-indigo-500 uppercase mb-3">Core features</p>
        <h2 className="text-4xl md:text-5xl font-black text-neutral-900 dark:text-white tracking-tighter">
          Everything you need to actually finish on time
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {features.map((f, i) => (
          <FeatureCard key={f.title} feature={f} index={i} />
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
