import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../hooks/useTasks';
import { useAgentRuns } from '../hooks/useAgentRuns';
import { useAgentModal } from '../context/AgentModalContext';
import { isAfter, isToday, format, differenceInMinutes } from 'date-fns';
import {
  Sparkles, Search, RefreshCw, CheckCircle2, ArrowUpRight,
  Zap, Clock, AlertTriangle, ChevronRight, CheckCircle, Flame, Calendar
} from 'lucide-react';
import type { Task } from '../api/client';

/* ── helpers ─────────────────────────────────── */
const isRescueTerritory = (t: Task) => {
  if (t.status === 'completed' || t.status === 'overdue') return false;
  const rem = (new Date(t.deadline).getTime() - Date.now()) / 60000;
  return rem <= Math.max(120, t.estimatedMinutes);
};

/* ── component ───────────────────────────────── */
export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { tasksQuery, updateTask } = useTasks();
  const { runsQuery } = useAgentRuns(false);
  const { openModal } = useAgentModal();
  const [search, setSearch] = useState('');
  const [input, setInput] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'upcoming'>('all');

  const tasks   = tasksQuery.data || [];
  const runs = runsQuery.data || [];
  const firstName = user?.name?.split(' ')[0] || 'there';

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Morning';
    if (hr < 17) return 'Afternoon';
    return 'Evening';
  };

  /* derive task urgency */
  const getUrgency = (t: Task) => {
    const over   = !t.completedAt && isAfter(new Date(), new Date(t.deadline));
    const rescue = isRescueTerritory(t);
    if (t.status === 'completed') return 'done';
    if (over || rescue)           return 'critical';
    if (t.priority === 'critical' || isToday(new Date(t.deadline))) return 'warn';
    return 'normal';
  };

  const BADGE: Record<string, { bg: string; fg: string; label: string }> = {
    done:     { bg: '#E6EFE0', fg: '#4A7C59', label: 'Done'    },
    critical: { bg: '#FEE2E2', fg: '#DC2626', label: 'URGENT'  },
    warn:     { bg: '#FEF3C7', fg: '#D97706', label: 'SOON'    },
    normal:   { bg: '#F3F4F6', fg: '#4B5563', label: format(new Date(), 'MMM d') },
  };

  const getBadge = (t: Task) => {
    const u = getUrgency(t);
    if (u === 'normal') {
      const lbl = format(new Date(t.deadline), 'MMM d');
      return { bg: '#F3F4F6', fg: '#4B5563', label: lbl };
    }
    return BADGE[u];
  };

  const filteredTasks = tasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (activeFilter === 'critical' && getUrgency(t) !== 'critical') return false;
    if (activeFilter === 'upcoming' && getUrgency(t) !== 'normal') return false;
    return true;
  });

  /* ── handlers ─────────────────────────────── */
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const msg = input.trim();
    setInput('');
    openModal({ action: 'parse', payload: msg });
  };

  const onPrioritize = () => {
    openModal({ action: 'prioritize' });
  };

  /* ── stats for mini bar ───────────────────── */
  const total     = tasks.length;
  const done      = tasks.filter(t => t.status === 'completed').length;
  const critical  = tasks.filter(t => getUrgency(t) === 'critical').length;
  const upcoming  = tasks.filter(t => getUrgency(t) === 'normal').length;

  /* ── dynamic data for cards ───────────────── */
  const completedTasks = tasks.filter(t => t.status === 'completed').sort((a, b) => 
    new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
  ).slice(0, 3);

  const latestRun = runs.length > 0 ? runs[0] : null;

  /* ── dynamic suggestions ──────────────────── */
  let suggestions = [];
  const noDescTask = tasks.find(t => !t.description && t.status !== 'completed');
  if (noDescTask) {
    suggestions.push({
      label: `Break down: ${noDescTask.title}`,
      icon: <Sparkles size={13} />,
      action: `Please break down my task "${noDescTask.title}" into subtasks.`
    });
  }
  const overdueTask = tasks.find(t => t.status === 'overdue' || (!t.completedAt && isAfter(new Date(), new Date(t.deadline))));
  if (overdueTask) {
    suggestions.push({
      label: `Reschedule: ${overdueTask.title}`,
      icon: <Clock size={13} />,
      action: `I missed the deadline for "${overdueTask.title}". Please reschedule it for a free slot today.`
    });
  }

  // Fallbacks if not enough signals
  if (suggestions.length < 2) {
    suggestions.push({
      label: 'Review tomorrow\'s schedule',
      icon: <Calendar size={13} />,
      action: 'Can you show me my schedule for tomorrow and flag any tight overlaps?'
    });
  }
  if (suggestions.length < 2) {
    suggestions.push({
      label: 'Optimize my week',
      icon: <Zap size={13} />,
      action: 'Please look at my upcoming tasks for the week and suggest a prioritization strategy.'
    });
  }
  suggestions = suggestions.slice(0, 2);

  return (
    <div className="flex flex-col min-h-screen pb-36 max-w-[1400px] mx-auto" style={{ background: 'var(--bg-base)' }}>

      {/* ── Sticky page header ─────────────────────────────────────── */}
      <header
        className="sticky top-0 z-20 px-8 py-4 flex items-center justify-between"
        style={{
          background: 'rgba(245,244,238,0.88)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <h1 className="text-[22px] font-extrabold font-display leading-none" style={{ color: 'var(--text-primary)' }}>
            Good {getGreeting()}, {firstName} 👋
          </h1>
          <p className="text-[11px] mt-0.5 font-medium" style={{ color: 'var(--text-tertiary)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <button
          onClick={onPrioritize}
          className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-[12px] font-bold transition-all hover:bg-gray-200 active:scale-95"
          style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
        >
          <Zap size={13} className="text-accent" />
          Prioritize Now
        </button>
      </header>

      <div className="flex-1 px-8 py-6 max-w-5xl w-full mx-auto space-y-6">

        {/* ── Mini stats bar ──────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-3">
          <div
            onClick={() => setActiveFilter('all')}
            className={`rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer transition-all ${activeFilter === 'all' ? 'ring-2 ring-gray-400' : 'hover:opacity-80'}`}
            style={{ background: '#EDEBE3', border: '1px solid rgba(31,30,28,0.07)' }}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#6B6A63]" />
            </div>
            <div>
              <p className="text-[20px] font-extrabold leading-none font-display" style={{ color: 'var(--text-primary)' }}>{total}</p>
              <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--text-secondary)' }}>Total Tasks</p>
            </div>
          </div>

          <div
            className="rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{ background: '#E6EFE0', border: '1px solid rgba(31,30,28,0.07)' }}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-200/50 shrink-0 text-success">
              <CheckCircle size={14} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[20px] font-extrabold leading-none font-display" style={{ color: 'var(--text-primary)' }}>{done}</p>
              <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--text-secondary)' }}>Done</p>
            </div>
          </div>

          <div
            onClick={() => setActiveFilter(activeFilter === 'critical' ? 'all' : 'critical')}
            className={`rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer transition-all ${activeFilter === 'critical' ? 'ring-2 ring-danger' : 'hover:opacity-80'}`}
            style={{ background: '#F6E1DC', border: '1px solid rgba(31,30,28,0.07)' }}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-200/50 shrink-0 text-danger">
              <Flame size={14} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[20px] font-extrabold leading-none font-display" style={{ color: 'var(--text-primary)' }}>{critical}</p>
              <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--text-secondary)' }}>Critical</p>
            </div>
          </div>

          <div
            onClick={() => setActiveFilter(activeFilter === 'upcoming' ? 'all' : 'upcoming')}
            className={`rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer transition-all ${activeFilter === 'upcoming' ? 'ring-2 ring-warning' : 'hover:opacity-80'}`}
            style={{ background: '#F5EAD4', border: '1px solid rgba(31,30,28,0.07)' }}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-yellow-200/50 shrink-0 text-warning">
              <Clock size={14} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[20px] font-extrabold leading-none font-display" style={{ color: 'var(--text-primary)' }}>{upcoming}</p>
              <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--text-secondary)' }}>Upcoming</p>
            </div>
          </div>
        </div>

        {/* ── Top cards row ───────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-5">

          {/* Recently Completed Tasks */}
          <div
            className="col-span-12 md:col-span-7 rounded-2xl p-7 flex flex-col gap-5"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}
          >
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-extrabold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                📋 Recently Completed Tasks
              </p>
              <button onClick={() => navigate('/tasks')} className="text-[10px] font-bold text-accent hover:underline">View All</button>
            </div>
            
            <div className="space-y-[14px]">
              {completedTasks.length > 0 ? completedTasks.map(t => (
                <div
                  key={t.id}
                  className="w-full flex items-center gap-3.5 group rounded-xl transition-colors"
                >
                  <span className="w-8 h-8 rounded-[10px] shrink-0 flex items-center justify-center bg-success-bg text-success">
                    <CheckCircle2 size={16} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[12.5px] font-semibold block truncate line-through text-text-tertiary">
                      {t.title}
                    </span>
                    <span className="text-[10px] text-text-secondary mt-0.5 block font-mono">
                      Completed {format(new Date(t.completedAt!), 'MMM d, h:mm a')}
                    </span>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-text-tertiary italic">No tasks completed yet.</p>
              )}
            </div>
          </div>

          {/* Right col */}
          <div className="col-span-12 md:col-span-5 flex flex-col gap-4">

            {/* Latest Agent Sweep */}
            <div
              className="rounded-2xl p-6 flex flex-col gap-4"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}
            >
              <p className="text-[9px] font-extrabold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                ✨ Latest Agent Sweep
              </p>
              
              {latestRun ? (
                <div
                  onClick={() => openModal({ action: 'view', runId: latestRun.id })}
                  className="rounded-xl p-3.5 flex items-center gap-3 cursor-pointer group transition-colors hover:border-accent"
                  style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}
                >
                  <div
                    className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center font-extrabold text-xs"
                    style={{ background: 'var(--accent-bg)', color: 'var(--accent-text-on-bg)' }}
                  >
                    <Sparkles size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                      {latestRun.triggerType.replace('_', ' ').toUpperCase()} RUN
                    </p>
                    <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {format(new Date(latestRun.createdAt), 'MMM d · h:mm a')}
                    </p>
                  </div>
                  <ArrowUpRight size={13} className="shrink-0 opacity-40 group-hover:opacity-80 transition-opacity" />
                </div>
              ) : (
                <div className="rounded-xl p-3.5 flex items-center justify-center text-center text-xs text-text-tertiary border border-dashed border-border">
                  Agent standing by. No recent runs.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Suggested tasks ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suggestions.map(s => (
            <button
              key={s.label}
              onClick={() => {
                setInput(s.action);
                openModal({ action: 'parse', payload: s.action });
              }}
              className="rounded-2xl p-5 text-left group flex flex-col gap-2 transition-all hover:shadow-md active:scale-[0.99] focus:outline-none"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-accent">{s.icon}</span>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-text-tertiary">
                  Suggested Action
                </span>
              </div>
              <p className="text-[13.5px] font-bold font-display leading-tight group-hover:text-accent transition-colors" style={{ color: 'var(--text-primary)' }}>
                {s.label}
              </p>
            </button>
          ))}
        </div>

        {/* ── My Tasks ────────────────────────────────────────────── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}
        >
          {/* Tasks header */}
          <div
            className="flex items-center justify-between gap-4 px-7 py-5 border-b"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-2.5">
              <h3 className="text-[16px] font-extrabold font-display leading-none" style={{ color: 'var(--text-primary)' }}>
                My Tasks
              </h3>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono"
                style={{ background: 'var(--bg-base)', color: 'var(--text-tertiary)', border: '1px solid var(--border-default)' }}
              >
                {filteredTasks.length} {activeFilter !== 'all' ? `(${activeFilter})` : ''}
              </span>
            </div>

            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-48 h-8 rounded-full pl-8 pr-3 text-[11px] font-bold tracking-wide outline-none transition-all focus:w-56"
                style={{
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>

          {/* Task list */}
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {filteredTasks.length > 0 ? filteredTasks.map(t => (
              <div
                key={t.id}
                className="group flex items-center justify-between gap-4 px-7 py-4 transition-colors hover:bg-[rgba(31,30,28,0.02)]"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0 pl-1">
                  {t.status === 'completed' ? (
                    <div
                      className="w-[18px] h-[18px] rounded-full border-[2px] flex items-center justify-center shrink-0 cursor-pointer"
                      style={{ borderColor: 'var(--success)', background: 'var(--success)' }}
                      onClick={() => updateTask({ id: t.id, payload: { status: 'pending' } })}
                    >
                      <CheckCircle2 size={12} color="#fff" />
                    </div>
                  ) : (
                    <div
                      className="w-[18px] h-[18px] rounded-full border-[2px] shrink-0 cursor-pointer transition-colors"
                      style={{ borderColor: 'var(--border-strong)', background: 'transparent' }}
                      onClick={() => updateTask({ id: t.id, payload: { status: 'completed', completed_at: new Date().toISOString() } })}
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className={`text-[13.5px] font-bold truncate transition-colors ${t.status === 'completed' ? 'opacity-40 line-through' : ''}`} style={{ color: 'var(--text-primary)' }}>
                      {t.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-[10.5px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                        {t.estimatedMinutes}m est.
                      </p>
                      <span className="w-1 h-1 rounded-full bg-[rgba(31,30,28,0.15)]" />
                      <p className="text-[10.5px] font-mono truncate" style={{ color: 'var(--text-tertiary)' }}>
                        {t.description || 'No description'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {t.status !== 'completed' && (
                    <div
                      className="px-2.5 py-1 rounded-[6px] text-[10px] font-extrabold uppercase tracking-widest font-mono"
                      style={{ background: getBadge(t).bg, color: getBadge(t).fg }}
                    >
                      {getBadge(t).label}
                    </div>
                  )}
                  <ChevronRight size={14} className="opacity-0 group-hover:opacity-40 transition-opacity" />
                </div>
              </div>
            )) : (
              <div className="px-7 py-10 text-center">
                <p className="text-[13px] font-bold" style={{ color: 'var(--text-secondary)' }}>No tasks found.</p>
                <p className="text-[11px] font-semibold mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  {activeFilter !== 'all' ? 'Try changing your filter.' : 'Create one below or press ⌘K'}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Sticky bottom input bar (Main CTA) ────────────────────────────────── */}
      <div className="fixed bottom-0 left-[252px] right-0 z-30 pointer-events-none">
        {/* Gradient fade above the bar */}
        <div className="h-24 w-full bg-gradient-to-t from-[var(--bg-base)] to-transparent" />
        
        <div className="bg-[var(--bg-base)] pb-6 px-8 pointer-events-auto flex justify-center">
          <form
            onSubmit={onSubmit}
            className="w-full max-w-3xl relative flex items-center"
          >
            <input
              type="text"
              placeholder="e.g. Schedule a 30m team sync this afternoon..."
              value={input}
              onChange={e => setInput(e.target.value)}
              className="w-full h-14 pl-12 pr-32 rounded-2xl text-[14px] font-semibold tracking-wide outline-none transition-all shadow-[0_8px_30px_rgba(31,30,28,0.08)] focus:shadow-[0_8px_30px_rgba(31,30,28,0.14)]"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)'
              }}
            />
            <Sparkles size={18} className="absolute left-5 text-accent" />
            
            <button
              type="submit"
              disabled={!input.trim()}
              className="absolute right-2.5 h-9 px-4 rounded-xl text-[12px] font-extrabold transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              Submit
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
