import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Mail, MessageSquare, AlertCircle, RefreshCw, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const NotificationList: React.FC = () => {
  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: apiClient.notifications.getLogs,
    refetchInterval: 8000, // Poll every 8 seconds
  });

  const getUrgencyStyle = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'text-danger bg-danger-bg border-danger/10';
      case 'high':
        return 'text-warning bg-warning-bg border-warning/10';
      case 'medium':
        return 'text-accent-text bg-accent-bg border-accent/10';
      default:
        return 'text-text-secondary bg-panel-muted border-border-subtle';
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail size={12} className="text-accent" />;
      case 'sms':
        return <MessageSquare size={12} className="text-warning" />;
      default:
        return <Send size={12} className="text-success" />;
    }
  };

  return (
    <div className="rounded-xl bg-panel p-4 flex flex-col h-full shadow-sm text-text-primary">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-3">
        <div className="flex items-center gap-2">
          <AlertCircle size={18} className="text-accent" />
          <h3 className="text-sm font-bold font-display text-text-primary">Notification Alert Log</h3>
        </div>
        <span className="text-[10px] text-text-tertiary uppercase tracking-widest font-sans font-bold">
          System Dispatch
        </span>
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto max-h-[220px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-text-tertiary text-xs font-sans">
            <RefreshCw size={14} className="animate-spin text-accent mr-2" /> Fetching alerts...
          </div>
        ) : error ? (
          <div className="text-xs text-danger py-4 text-center font-sans">
            Failed to fetch logs. Fallback server offline.
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-text-tertiary text-center border border-dashed border-border rounded-xl bg-panel-muted/20 font-sans">
            <Mail size={20} className="text-text-tertiary mb-2" />
            <p className="text-xs font-semibold text-text-secondary">Log is empty</p>
            <p className="text-[10px] text-text-tertiary mt-0.5">No notifications dispatched yet.</p>
          </div>
        ) : (
          <div className="space-y-2 font-sans">
            {logs.slice(0, 15).map((log) => {
              const sentDt = new Date(log.sentAt);
              return (
                <div 
                  key={log.id} 
                  className="p-3 rounded-lg bg-panel-muted/50 hover:bg-panel-muted/85 border border-border-subtle/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="p-1 rounded bg-panel border border-border-subtle">
                        {getChannelIcon(log.channel)}
                      </span>
                      <span className="text-[10px] text-text-secondary capitalize font-mono font-medium">{log.channel}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold tracking-wider uppercase border px-2.5 py-0.5 rounded-full ${getUrgencyStyle(log.urgency)}`}>
                        {log.urgency}
                      </span>
                      <span className="text-[10px] text-text-tertiary font-mono font-medium">
                        {formatDistanceToNow(sentDt, { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-text-primary leading-relaxed font-mono">
                    {log.message}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
