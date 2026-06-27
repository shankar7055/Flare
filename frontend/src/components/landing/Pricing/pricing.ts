import type { PricingPlan } from "../types";

export const pricingPlans: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter plan",
    description: "Best for individual investors",
    monthlyPrice: 19,
    yearlyPrice: 15,
    features: [
      "Connect up to 5 accounts",
      "Portfolio tracking",
      "Basic AI insights",
      "Market alerts",
      "Real-time prices",
    ],
  },
  {
    id: "pro",
    name: "Pro plan",
    description: "Best for active investors",
    monthlyPrice: 39,
    yearlyPrice: 31,
    popular: true,
    features: [
      "Unlimited account connections",
      "Advanced AI insights",
      "Portfolio risk analysis",
      "Smart alerts & automation",
      "Historical analytics",
      "Priority support",
    ],
  },
];

export const pricingTrialNotes = [
  "✓ 7-day free trial",
  "✓ No credit card required",
  "✓ Cancel anytime",
];
