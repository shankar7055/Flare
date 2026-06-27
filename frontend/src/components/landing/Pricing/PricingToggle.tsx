import React from "react";
import "./PricingToggle.css";

interface PricingToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}

const PricingToggle = ({ checked, onChange, id = "pricing-billing-toggle" }: PricingToggleProps) => (
  <div className="pricing-toggle-border">
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      aria-label="Toggle yearly billing"
    />
    <label htmlFor={id}>
      <div className="pricing-toggle-handle" />
    </label>
  </div>
);

export default React.memo(PricingToggle);
