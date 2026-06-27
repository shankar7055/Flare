import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Calendar, Clock, RefreshCw, CheckCircle } from 'lucide-react';
import { format, isToday, parseISO, compareAsc } from 'date-fns';

export const CalendarStrip: React.FC = () => {
  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ['calendar'],
    queryFn: () => apiClient.calendar.getEvents(2), // Fetch events for today and tomorrow
  });

  const sortedTodayEvents = events
    .filter(evt => {
      try {
        return isToday(parseISO(evt.start));
      } catch {
        return false;
      }
    })
    .sort((a, b) => compareAsc(parseISO(a.start), parseISO(b.start)));

  return (
    <div className="rounded-xl p-5 flex flex-col h-full" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
      <div className="flex items-center justify-between pb-4 mb-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
        <div className="flex items-center gap-2.5">
          <Calendar size={18} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
          <h3 className="text-sm font-semibold font-display" style={{ color: 'var(--text-primary)' }}>Today's Schedule Slots</h3>
        </div>
        <span className="text-[10px] font-medium uppercase font-sans" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.15em' }}>
          Agent Commitments
        </span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[220px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-xs font-sans" style={{ color: 'var(--text-tertiary)' }}>
            <RefreshCw size={14} className="animate-spin mr-2" strokeWidth={1.75} style={{ color: 'var(--accent)' }} /> Loading schedule...
          </div>
        ) : error ? (
          <div className="text-xs py-4 text-center font-sans" style={{ color: 'var(--danger)' }}>
            Failed to retrieve schedule. Backend fallback offline.
          </div>
        ) : sortedTodayEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center rounded-xl font-sans" style={{ color: 'var(--text-tertiary)', border: '1px dashed var(--border-default)', background: 'var(--bg-surface-muted)' }}>
            <CheckCircle size={20} className="mb-2" strokeWidth={1.75} style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Schedule is clear</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>No tasks booked by the agent today.</p>
          </div>
        ) : (
          <div className="space-y-2 font-sans">
            {sortedTodayEvents.map((evt) => {
              const startDt = parseISO(evt.start);
              const endDt = parseISO(evt.end);
              const timeStr = `${format(startDt, 'h:mm a')} – ${format(endDt, 'h:mm a')}`;
              
              const isGCal = evt.source === 'google_calendar';

              return (
                <div 
                  key={evt.id} 
                  className="p-3 rounded-lg flex items-center justify-between gap-3 transition-all duration-250 ease-out"
                  style={{
                    background: isGCal ? 'var(--accent-bg)' : 'var(--bg-surface-muted)',
                    border: '1px solid var(--border-default)'
                  }}
                >
                  <div className="min-w-0">
                    <h4 className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{evt.title}</h4>
                    <span className="text-[10px] flex items-center gap-1 mt-0.5 font-mono" style={{ color: 'var(--text-secondary)' }}>
                      <Clock size={10} strokeWidth={1.75} style={{ color: 'var(--text-tertiary)' }} /> {timeStr}
                    </span>
                  </div>

                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase shrink-0" style={{
                    background: isGCal ? 'var(--accent)' : 'var(--bg-surface)',
                    color: isGCal ? '#FFFFFF' : 'var(--text-secondary)',
                    letterSpacing: '0.15em'
                  }}>
                    {isGCal ? 'GCal' : 'Agent'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
