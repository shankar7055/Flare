import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useTasks } from '../hooks/useTasks';
import { useAgentRuns } from '../hooks/useAgentRuns';
import { Award, Clock, RefreshCw, TrendingUp, CheckCircle2, Zap, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { isAfter } from 'date-fns';

export const InsightsPage: React.FC = () => {
  const { data: patterns, isLoading } = useQuery({
    queryKey: ['agent-patterns'],
    queryFn: () => apiClient.agent.getPatterns(),
    refetchInterval: 30000,
  });
  const { tasksQuery } = useTasks();
  const { runsQuery } = useAgentRuns(false);

  const tasks = tasksQuery.data || [];
  const runs  = runsQuery.data || [];

  /* derived stats */
  const total     = tasks.length;
  const done      = tasks.filter(t => t.status === 'completed').length;
  const overdue   = tasks.filter(t => !t.completedAt && isAfter(new Date(), new Date(t.deadline))).length;
  const pending   = total - done;
  const doneRate  = total > 0 ? Math.round((done / total) * 100) : 0;

  const totalRuns    = runs.length;
  const successRuns  = runs.filter(r => {
    try {
      const tr = Array.isArray(r.reasoningTrace) ? r.reasoningTrace : JSON.parse(r.reasoningTrace as any);
      return !tr.some((t: any) => t.role === 'system');
    } catch { return true; }
  }).length;

  /* dynamic stats based on tasks */
  const priorityDistribution = [
    { name: 'Critical', count: tasks.filter(t => t.priority === 'critical').length, color: '#B23B2E' },
    { name: 'High',     count: tasks.filter(t => t.priority === 'high').length,     color: '#A87828' },
    { name: 'Medium',   count: tasks.filter(t => t.priority === 'medium').length,   color: '#4A7C59' },
    { name: 'Low',      count: tasks.filter(t => t.priority === 'low').length,      color: '#6B6A63' },
  ];

  let calculatedPeakHours = [9, 14, 16];
  const completedTasks = tasks.filter(t => t.status === 'completed' && t.completedAt);
  if (completedTasks.length > 0) {
    const hoursCount: Record<number, number> = {};
    completedTasks.forEach(t => {
      const h = new Date(t.completedAt!).getHours();
      hoursCount[h] = (hoursCount[h] || 0) + 1;
    });
    calculatedPeakHours = Object.entries(hoursCount)
      .sort((a, b) => b[1] - a[1])
      .map(entry => Number(entry[0]))
      .slice(0, 3);
  }

  const peakStr = calculatedPeakHours.slice(0, 3).map(h => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}${ampm}`;
  }).join('  ·  ');

  let avgLeadTimeMins = 120;
  if (completedTasks.length > 0) {
    let totalMins = 0;
    let count = 0;
    completedTasks.forEach(t => {
      if (t.createdAt && t.completedAt) {
        totalMins += (new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()) / 60000;
        count++;
      }
    });
    if (count > 0) avgLeadTimeMins = totalMins / count;
  }

  const formatLead = (m: number) => m < 60 ? `${Math.round(m)}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;

  const statCards = [
    { label: 'Total Tasks',    value: total,    sub: 'All time',              bg: '#EDEBE3', fg: '#6B6A63' },
    { label: 'Completed',      value: done,     sub: `${doneRate}% done rate`, bg: '#E6EFE0', fg: '#4A7C59' },
    { label: 'Overdue',        value: overdue,  sub: 'Need attention',        bg: '#F6E1DC', fg: '#B23B2E' },
    { label: 'Agent Runs',     value: totalRuns, sub: `${successRuns} success`, bg: '#F3E4DB', fg: '#8A4226' },
  ];

  return (
    <div className="px-8 py-7 max-w-5xl mx-auto space-y-6" style={{ color: 'var(--text-primary)' }}>

      {/* Header */}
      <div>
        <h2 className="text-[22px] font-extrabold font-display leading-none" style={{ color: 'var(--text-primary)' }}>
          Insights
        </h2>
        <p className="text-[11px] font-semibold mt-1 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          Productivity analytics & agent performance
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div
            key={s.label}
            className="rounded-2xl px-5 py-4"
            style={{ background: s.bg, border: '1px solid rgba(31,30,28,0.07)' }}
          >
            <p className="text-[28px] font-extrabold font-display leading-none" style={{ color: s.fg }}>{s.value}</p>
            <p className="text-[11px] font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{s.label}</p>
            <p className="text-[9px] font-mono mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Task Priority Distribution chart */}
        <div
          className="lg:col-span-7 rounded-2xl p-6"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 size={14} style={{ color: 'var(--accent)' }} />
            <span className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>Task Priority Distribution</span>
          </div>

          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityDistribution} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: '#9B9A91', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#9B9A91', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(31,30,28,0.03)' }}
                  contentStyle={{ background: '#fff', border: '1px solid rgba(31,30,28,0.10)', borderRadius: 10, fontSize: 11 }}
                  formatter={(v: any) => [`${v} Tasks`, 'Count']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {priorityDistribution.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-5 space-y-4">

          {/* Peak hours card */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Zap size={13} style={{ color: 'var(--warning)' }} />
              <span className="text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>Focus Peak Hours</span>
            </div>
            <p className="text-[18px] font-extrabold font-mono tracking-wide" style={{ color: 'var(--text-primary)' }}>
              {isLoading ? '—' : peakStr}
            </p>
            <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Top completion windows
            </p>
          </div>

          {/* Lead time card */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Clock size={13} style={{ color: 'var(--accent)' }} />
              <span className="text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>Avg Lead Time</span>
            </div>
            <p className="text-[28px] font-extrabold font-display" style={{ color: 'var(--text-primary)' }}>
              {formatLead(avgLeadTimeMins)}
            </p>
            <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Average time from task creation to completion
            </p>
          </div>

          {/* Completion progress */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} style={{ color: 'var(--success)' }} />
                <span className="text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>Done Rate</span>
              </div>
              <span className="text-[18px] font-extrabold font-display" style={{ color: 'var(--success)' }}>{doneRate}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-muted)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${doneRate}%`, background: 'var(--success)' }}
              />
            </div>
            <p className="text-[10px] font-mono mt-2" style={{ color: 'var(--text-tertiary)' }}>
              {done} of {total} tasks completed
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
