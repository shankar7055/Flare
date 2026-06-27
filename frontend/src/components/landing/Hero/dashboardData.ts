import type { DashboardStat, TrendingAsset } from "../types";

export const dashboardStats: DashboardStat[] = [
  { label: "Portfolio", value: "$58,420", delta: "+12.4%" },
  { label: "Today's P&L", value: "+$1,240", delta: "+2.1%" },
  { label: "Assets", value: "24", delta: "Active" },
  { label: "Risk Score", value: "18/100", delta: "Low" },
];

export const trendingAssets: TrendingAsset[] = [
  { sym: "BTC", price: "$64,231", pct: "+4.2%" },
  { sym: "AAPL", price: "$192.42", pct: "+0.4%" },
  { sym: "TSLA", price: "$178.22", pct: "+1.8%" },
  { sym: "NVDA", price: "$872.10", pct: "+6.5%" },
];
