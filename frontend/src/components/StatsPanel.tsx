import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Award, Clock, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

export const StatsPanel: React.FC = () => {
  const { data: patterns, isLoading, error } = useQuery({
    queryKey: ['agent-patterns'],
    queryFn: () => apiClient.agent.getPatterns(),
    refetchInterval: 15000, // Poll every 15 seconds
  });

  if (isLoading) {
    return (
      <div className="rounded-xl p-5 flex items-center justify-center py-12 text-xs font-sans" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <RefreshCw size={14} className="animate-spin mr-2" style={{ color: 'var(--text-tertiary)' }} /> Loading insights...
      </div>
    );
  }

  if (error || !patterns) {
    return (
      <div className="rounded-xl p-5 text-center py-6 text-xs font-sans" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-tertiary)' }}>
        Failed to load productivity insights.
      </div>
    );
  }

  const rates = patterns.channel_response_rates || {};
  const chartData = [
    { name: 'Email', rate: Math.round(rates.email * 100) },
    { name: 'SMS', rate: Math.round(rates.sms * 100) },
    { name: 'Push', rate: Math.round(rates.push * 100) },
  ];

  // Map productivity peak hours to list
  const peakHours = patterns.peak_productivity_hours || [];
  const peakHoursStr = peakHours.slice(0, 3).map((h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}${ampm}`;
  }).join(', ');

  const formatLeadTime = (mins: number) => {
    if (mins < 60) return `${Math.round(mins)}m`;
    const hrs = Math.round(mins / 60);
    return `${hrs}h`;
  };

  return (
    <div className="rounded-xl p-5 relative overflow-hidden flex flex-col gap-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="flex items-center gap-2.5 pb-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
        <Award size={18} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
        <h3 className="text-sm font-bold font-display" style={{ color: 'var(--text-primary)' }}>Productivity Insights</h3>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 gap-4 relative z-10 font-sans">
        {/* Lead time */}
        <div className="rounded-xl p-4" style={{ background: 'var(--info-bg)', border: '1px solid var(--border-default)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ background: 'var(--info)' }}>
            <Clock size={14} strokeWidth={1.75} className="text-white" />
          </div>
          <span className="text-[10px] font-semibold uppercase mb-2 block" style={{ color: 'var(--text-secondary)', letterSpacing: '0.15em' }}>
            Avg Lead Time
          </span>
          <div className="text-xl font-bold font-display" style={{ color: 'var(--text-primary)' }}>
            {formatLeadTime(patterns.avg_lead_time_before_start_minutes || 120)}
          </div>
          <span className="text-[10px] mt-1 block font-medium" style={{ color: 'var(--text-tertiary)' }}>Task creation to start</span>
        </div>

        {/* Peak hour */}
        <div className="rounded-xl p-4" style={{ background: 'var(--warning-bg)', border: '1px solid var(--border-default)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ background: 'var(--warning)' }}>
            <Award size={14} strokeWidth={1.75} className="text-white" />
          </div>
          <span className="text-[10px] font-semibold uppercase mb-2 block" style={{ color: 'var(--text-secondary)', letterSpacing: '0.15em' }}>
            Focus Peak
          </span>
          <div className="text-xl font-bold font-display truncate" style={{ color: 'var(--text-primary)' }}>
            {peakHoursStr || '9AM, 2PM'}
          </div>
          <span className="text-[10px] mt-1 block font-medium" style={{ color: 'var(--text-tertiary)' }}>Top completion hours</span>
        </div>
      </div>

      {/* Response rate chart */}
      <div className="mt-2 relative z-10 font-sans">
        <span className="text-[10px] font-semibold uppercase mb-3 block" style={{ color: 'var(--text-secondary)', letterSpacing: '0.15em' }}>
          Channel Response Rates (%)
        </span>
        
        <div className="h-[120px] w-full rounded-xl p-3" style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
              <XAxis 
                dataKey="name" 
                tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis 
                domain={[0, 100]} 
                tick={{ fill: 'var(--text-tertiary)', fontSize: 9 }}
                axisLine={false} 
                tickLine={false} 
                ticks={[0, 50, 100]}
              />
              <Tooltip 
                cursor={{ fill: 'var(--bg-surface-muted)' }}
                contentStyle={{ 
                  backgroundColor: 'var(--bg-surface)', 
                  borderColor: 'var(--border-default)', 
                  borderRadius: '12px',
                  fontSize: '11px',
                  color: 'var(--text-primary)' 
                }}
              />
              <Bar 
                dataKey="rate" 
                fill="var(--accent)" 
                radius={[4, 4, 0, 0]} 
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
