import React from "react";
import { dashboardStats, trendingAssets } from "./dashboardData";

const DashboardScreenshot = () => (
  <div className="h-full w-full bg-[#0f172a] flex flex-col text-white overflow-hidden">
    <div className="flex items-center justify-between px-4 py-2 bg-[#1e293b] border-b border-white/10">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded bg-indigo-500 flex items-center justify-center text-xs font-bold">F</div>
        <span className="text-xs font-semibold">Flare</span>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-slate-400">
        <span>Dashboard</span>
        <span>Portfolio</span>
        <span>AI Advisor</span>
        <div className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[8px] flex items-center justify-center font-bold">A</div>
      </div>
    </div>
    <div className="flex-1 p-3 grid grid-cols-3 gap-2 overflow-hidden">
      <div className="col-span-3 grid grid-cols-4 gap-2">
        {dashboardStats.map((s) => (
          <div key={s.label} className="bg-[#1e293b] rounded-lg p-2">
            <p className="text-[8px] text-slate-400">{s.label}</p>
            <p className="text-sm font-bold text-white">{s.value}</p>
            <p className="text-[8px] text-emerald-400">{s.delta}</p>
          </div>
        ))}
      </div>
      <div className="col-span-2 bg-[#1e293b] rounded-lg p-2">
        <p className="text-[8px] text-slate-400 mb-1">Portfolio Performance</p>
        <svg viewBox="0 0 200 60" className="w-full h-12">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,50 C20,40 40,30 60,35 S100,15 120,20 S160,8 180,12 L200,10" stroke="#6366f1" strokeWidth="2" fill="none" />
          <path d="M0,50 C20,40 40,30 60,35 S100,15 120,20 S160,8 180,12 L200,10 L200,60 L0,60Z" fill="url(#g)" />
        </svg>
      </div>
      <div className="col-span-1 bg-[#1e293b] rounded-lg p-2 flex flex-col items-center justify-center">
        <p className="text-[8px] text-slate-400 mb-2">Allocation</p>
        <svg viewBox="0 0 60 60" className="w-12 h-12">
          <circle cx="30" cy="30" r="20" fill="none" stroke="#6366f1" strokeWidth="8" strokeDasharray="75 50" />
          <circle cx="30" cy="30" r="20" fill="none" stroke="#f97316" strokeWidth="8" strokeDasharray="30 95" strokeDashoffset="-75" />
          <circle cx="30" cy="30" r="20" fill="none" stroke="#22c55e" strokeWidth="8" strokeDasharray="20 105" strokeDashoffset="-105" />
          <text x="30" y="33" textAnchor="middle" fontSize="7" fontWeight="bold" fill="white">$58k</text>
        </svg>
      </div>
      <div className="col-span-3 bg-[#1e293b] rounded-lg p-2">
        <p className="text-[8px] text-slate-400 mb-1">Trending Assets</p>
        <div className="grid grid-cols-4 gap-1">
          {trendingAssets.map((a) => (
            <div key={a.sym} className="bg-[#0f172a] rounded p-1">
              <p className="text-[8px] font-bold text-white">{a.sym}</p>
              <p className="text-[7px] text-slate-400">{a.price}</p>
              <p className="text-[7px] text-emerald-400">{a.pct}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default React.memo(DashboardScreenshot);
