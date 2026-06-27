import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../hooks/useTasks';
import { TaskCard } from '../components/TaskCard';
import { RescueCard } from '../components/RescueCard';
import { QuickAddTask } from '../components/QuickAddTask';
import { AgentActivityFeed } from '../components/AgentActivityFeed';
import { CalendarStrip } from '../components/CalendarStrip';
import { StatsPanel } from '../components/StatsPanel';
import { NotificationList } from '../components/NotificationList';
import { apiClient } from '../api/client';
import { useQuery } from '@tanstack/react-query';
import { 
  Bot, Calendar, ShieldAlert, LogOut, CheckCircle, Clock, 
  Sparkles, CalendarCheck, HelpCircle, Link2, RefreshCw 
} from 'lucide-react';
import { isToday, parseISO, isAfter } from 'date-fns';

export const Dashboard: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const { tasksQuery } = useTasks();

  // Fetch GCal redirect URL
  const { data: googleUrlData } = useQuery({
    queryKey: ['google-auth-url'],
    queryFn: () => apiClient.auth.getGoogleAuthUrl(),
    enabled: !!user && !user.google_calendar_connected,
  });

  // Fetch user patterns
  const { data: userPatterns } = useQuery({
    queryKey: ['user-patterns'],
    queryFn: () => apiClient.agent.getPatterns(),
    enabled: !!user,
  });

  const handleConnectCalendar = () => {
    if (googleUrlData?.url) {
      // Open in a new tab/window to prevent losing the in-memory JWT authentication token on redirect!
      window.open(googleUrlData.url, '_blank');
    }
  };

  const handleRefreshConnection = async () => {
    await refreshUser();
  };

  const tasks = tasksQuery.data || [];
  const isLoadingTasks = tasksQuery.isLoading;

  // Streaks: get unique recurring tasks (latest occurrence) sorted by streak count descending, top 3
  const uniqueRecurring: Record<string, typeof tasks[0]> = {};
  tasks
    .filter(t => t.isRecurring)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) // Latest first
    .forEach(t => {
      // Key by title + recurrence to group same habits
      const key = `${t.title}-${t.recurrenceRule}`;
      if (!uniqueRecurring[key]) {
        uniqueRecurring[key] = t;
      }
    });
  const recurringTasks = Object.values(uniqueRecurring)
    .sort((a, b) => b.streakCount - a.streakCount)
    .slice(0, 3);

  const isRescueTerritory = (task: typeof tasks[0]) => {
    if (task.status === 'completed' || task.status === 'overdue') return false;
    const remMins = (new Date(task.deadline).getTime() - Date.now()) / (60 * 1000);
    const limit = Math.max(120, task.estimatedMinutes);
    return remMins <= limit;
  };

  // Group tasks
  const overdueRescueTasks = tasks.filter(
    (t) => t.status === 'overdue' || (t.status !== 'completed' && isRescueTerritory(t))
  );

  const todayTasks = tasks.filter(
    (t) => t.status !== 'completed' && !isRescueTerritory(t) && isToday(parseISO(t.deadline))
  );

  const upcomingTasks = tasks.filter(
    (t) =>
      t.status !== 'completed' &&
      !isRescueTerritory(t) &&
      !isToday(parseISO(t.deadline)) &&
      !isAfter(new Date(), parseISO(t.deadline))
  );

  const completedTasks = tasks.filter((t) => t.status === 'completed');

  // Identify if there is an active rescue plan to showcase at the top
  const rescuePlanTasks = tasks.filter(
    (t) => t.rescuePlans && t.rescuePlans.length > 0 && t.status !== 'completed'
  );

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col font-sans" style={{ background: 'var(--bg-base)' }}>
      
      {/* Top Navigation Header */}
      <header className="px-6 py-5 flex items-center justify-between sticky top-0 z-40" style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border-default)' }}>
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--accent)' }}>
            <Bot size={22} className="text-white" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>The Last-Minute Life Saver</h1>
            <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.15em' }}>AI AGENTIC MISSION CONTROL</p>
          </div>
        </div>

        {/* User Stats and controls */}
        <div className="flex items-center gap-3">
          
          {/* Connection status badge */}
          {user?.google_calendar_connected ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
              <CalendarCheck size={14} strokeWidth={1.75} />
              <span className="hidden sm:inline">Calendar Linked</span>
              <button 
                onClick={handleRefreshConnection} 
                className="opacity-60 hover:opacity-100 transition-opacity ml-1"
                title="Refresh calendar connection status"
              >
                <RefreshCw size={11} strokeWidth={1.75} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectCalendar}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-250 ease-out"
              style={{ background: 'var(--accent-bg)', color: 'var(--accent-text-on-bg)' }}
            >
              <Link2 size={13} strokeWidth={1.75} />
              <span>Link Calendar</span>
            </button>
          )}

          {/* User profile */}
          <div className="flex items-center gap-3 pl-4" style={{ borderLeft: '1px solid var(--border-default)' }}>
            <div className="text-right hidden md:block">
              <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
              <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-xl transition-all duration-250 ease-out"
              style={{ background: 'var(--bg-surface-muted)', color: 'var(--text-secondary)' }}
              title="Logout"
            >
              <LogOut size={16} strokeWidth={1.75} />
            </button>
          </div>

        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 lg:p-8 grid grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Tasks, Add Task, and active Rescue Plans */}
        <section className="col-span-12 lg:col-span-5 space-y-6">
          
          {/* Active Rescue Plan (Unmissable visual alert at the very top of Dashboard) */}
          {rescuePlanTasks.length > 0 && (
            <div className="animate-fade-in">
              {rescuePlanTasks.map((t) => (
                <RescueCard key={t.id} task={t} />
              ))}
            </div>
          )}

          {/* Quick Add Form */}
          <QuickAddTask />

          {/* Tasks Grid */}
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <CheckCircle size={14} className="text-accent-teal" /> Tasks Registry
              </h2>
              <span className="text-[10px] text-slate-400 font-mono font-semibold">
                Total: {tasks.length} tasks
              </span>
            </div>

            {isLoadingTasks && tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <RefreshCw size={24} className="animate-spin text-accent-teal mb-3" />
                <p className="text-xs">Accessing Tasks Registry...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-panel/10">
                <Sparkles size={28} className="text-slate-700 mb-2" />
                <p className="text-sm font-semibold text-slate-400">Registry is empty</p>
                <p className="text-xs text-slate-600 mt-1 max-w-[200px] text-center">
                  Create a task above to see the agent begin scheduling actions.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* 1. Overdue & Rescue Tasks */}
                {overdueRescueTasks.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-accent-red flex items-center gap-1">
                      <ShieldAlert size={12} /> Overdue & Rescue Mode ({overdueRescueTasks.length})
                    </h3>
                    <div className="space-y-3">
                      {overdueRescueTasks.map((task) => (
                        <TaskCard key={task.id} task={task} isRescueTerritory={true} />
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Today's Tasks */}
                {todayTasks.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-accent-teal flex items-center gap-1">
                      <Clock size={12} /> Due Today ({todayTasks.length})
                    </h3>
                    <div className="space-y-3">
                      {todayTasks.map((task) => (
                        <TaskCard key={task.id} task={task} isRescueTerritory={isRescueTerritory(task)} />
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Upcoming Tasks */}
                {upcomingTasks.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                      <Calendar size={12} className="text-slate-500" /> Upcoming ({upcomingTasks.length})
                    </h3>
                    <div className="space-y-3">
                      {upcomingTasks.map((task) => (
                        <TaskCard key={task.id} task={task} isRescueTerritory={isRescueTerritory(task)} />
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Completed Tasks */}
                {completedTasks.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1">
                      <CheckCircle size={12} className="text-slate-600" /> Completed ({completedTasks.length})
                    </h3>
                    <div className="space-y-3">
                      {completedTasks.map((task) => (
                        <TaskCard key={task.id} task={task} isRescueTerritory={false} />
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>

        </section>

        {/* Right Column: Agent Execution Activity Loop and Calendar Commitments */}
        <section className="col-span-12 lg:col-span-7 space-y-6">
          
          {/* Agent reasoning activity feed panel */}
          <AgentActivityFeed />

          {/* Grid for Streaks, Personalized Recommendations, Calendar strip & Stats panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Streaks Card */}
            <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <h3 className="text-xs font-bold uppercase mb-4 flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.15em' }}>
                <Sparkles size={14} style={{ color: 'var(--accent)' }} /> Streaks
              </h3>
              {recurringTasks.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Create a repeating task to start building streaks!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recurringTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-surface-muted)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
                          <span className="text-xs font-bold">{task.streakCount}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
                          <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{task.recurrenceRule}</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                        🔥 {task.streakCount} days
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Personalized Recommendations Card */}
            <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <h3 className="text-xs font-bold uppercase mb-4 flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.15em' }}>
                <Bot size={14} style={{ color: 'var(--accent)' }} /> Personalized
              </h3>
              {!userPatterns ? (
                <div className="text-center py-4">
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Loading your patterns...
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg" style={{ background: 'var(--bg-surface-muted)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      You tend to start tasks about <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{Math.round(userPatterns.avg_lead_time_before_start_minutes / 60)} hours</span> before deadline!
                    </p>
                  </div>
                  {userPatterns.peak_productivity_hours && userPatterns.peak_productivity_hours.length > 0 && (
                    <div className="p-3 rounded-lg" style={{ background: 'var(--bg-surface-muted)' }}>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Your peak productivity hours are around <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{userPatterns.peak_productivity_hours.slice(0, 2).map(h => `${h}:00`).join(' & ')}</span>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <CalendarStrip />
            <StatsPanel />
          </div>

          {/* Simple alert notifications list */}
          <NotificationList />

        </section>

      </main>

    </div>
  );
};
