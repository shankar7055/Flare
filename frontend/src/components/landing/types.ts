export interface Stat {
  value: string;
  label: string;
  icon: string;
}

export interface Feature {
  icon: string;
  title: string;
  desc: string;
  dark: boolean;
  tags?: string[];
  highlight?: string;
}

export interface FAQ {
  q: string;
  a: string;
}

export interface PricingPlan {
  id: "starter" | "pro";
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  popular?: boolean;
}

export interface DashboardStat {
  label: string;
  value: string;
  delta: string;
}

export interface TrendingAsset {
  sym: string;
  price: string;
  pct: string;
}

export interface FooterColumn {
  title: string;
  links: string[];
}

export interface CTACallbackProps {
  onCTA: () => void;
}
