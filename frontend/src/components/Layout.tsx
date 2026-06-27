import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAgentRuns } from '../hooks/useAgentRuns';
import { useAgentModal } from '../context/AgentModalContext';
import { GlobalAgentModal } from './GlobalAgentModal';
import {
  Home, Activity, ListTodo, Calendar, BarChart3,
  Settings, ChevronLeft, ChevronRight, CalendarCheck,
  Link2, RefreshCw, LogOut, MoreHorizontal, Zap
} from 'lucide-react';
import { isToday as isDateToday, isYesterday as isDateYesterday } from 'date-fns';

export const Layout: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { openModal } = useAgentModal();

  const { data: googleUrlData } = useQuery({
    queryKey: ['google-auth-url'],
    queryFn: () => apiClient.auth.getGoogleAuthUrl(),
    enabled: !!user && !user.google_calendar_connected,
  });

  const { runsQuery } = useAgentRuns(false);
  const runs = runsQuery.data || [];

  const handleConnectCalendar = () => {
    if (googleUrlData?.url) window.open(googleUrlData.url, '_blank');
  };

  const getRecentRuns = () => {
    const today: typeof runs = [];
    const yesterday: typeof runs = [];
    runs.slice(0, 6).forEach((r) => {
      const d = new Date(r.createdAt);
      if (isDateToday(d)) today.push(r);
      else if (isDateYesterday(d)) yesterday.push(r);
    });
    return { today, yesterday };
  };

  const { today: todayRuns, yesterday: yesterdayRuns } = getRecentRuns();

  const getRunLabel = (run: any) => {
    try {
      const actions = typeof run.actionsTaken === 'string'
        ? JSON.parse(run.actionsTaken) : run.actionsTaken;
      if (Array.isArray(actions)) {
        if (actions.find((a: any) => a.tool_name === 'escalate_task')) return 'Escalated task priorities';
        if (actions.find((a: any) => a.tool_name === 'schedule_task')) return 'Scheduled new slot';
        if (actions.find((a: any) => a.tool_name === 'generate_rescue_plan')) return 'Rescue plan generated';
      }
    } catch {}
    if (run.triggerType === 'rescue_mode') return 'Rescue plan generated';
    if (run.triggerType === 'new_task') return 'Re-prioritized schedule';
    if (run.triggerType === 'manual') return 'Manual sweep done';
    return 'Periodic sweep';
  };

  const navItems = [
    { to: '/',          label: 'Home',           icon: <Home size={15} /> },
    { to: '/tasks',     label: 'Tasks',           icon: <ListTodo size={15} /> },
    { to: '/schedule',  label: 'Schedule',        icon: <Calendar size={15} /> },
    { to: '/insights',  label: 'Insights',        icon: <BarChart3 size={15} /> },
  ];

  return (
    <div className="min-h-screen flex font-sans" style={{ background: 'var(--bg-base)' }}>

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        className="shrink-0 h-screen sticky top-0 flex flex-col z-30 transition-all duration-200"
        style={{
          width: collapsed ? 60 : 252,
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-default)',
        }}
      >
        {/* Profile header */}
        <div
          className="flex items-center gap-3 px-5 py-5 border-b"
          style={{ borderColor: 'var(--border-default)', minHeight: 72 }}
        >
          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-xs select-none"
              style={{ background: 'var(--accent)', color: '#FFFFFF' }}
            >
              {user?.name?.charAt(0) || 'U'}
            </div>
            <span
              className="absolute bottom-0 right-0 w-2 h-2 rounded-full border-2"
              style={{ background: 'var(--success)', borderColor: 'var(--bg-sidebar)' }}
            />
          </div>

          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-text-primary truncate leading-none">
                {user?.name || 'Demo User'}
              </p>
              <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.15em' }}>
                ONLINE
              </p>
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg transition-colors ml-auto shrink-0"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* Nav items */}
        <nav className="px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium transition-all duration-250 ease-out ${
                  collapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'text-white font-semibold'
                    : 'text-gray-500'
                }`
              }
              style={({ isActive }) => ({
                background: isActive ? 'var(--bg-sidebar-selected)' : 'transparent',
                color: isActive ? '#FFFFFF' : 'var(--text-secondary)'
              })}
            >
              {({ isActive }) => (
                <>
                  <span style={{ color: isActive ? '#FFFFFF' : 'var(--text-tertiary)' }}>{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Divider */}
        <div className="mx-4 my-2 border-t" style={{ borderColor: 'var(--border-default)' }} />

        {/* Recent Activity */}
        {!collapsed && (
          <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
            <p
              className="text-[10px] font-bold uppercase mb-4 px-1"
              style={{ color: 'var(--text-tertiary)', letterSpacing: '0.15em' }}
            >
              Recent Activity
            </p>

            {todayRuns.length > 0 && (
              <div className="mb-4">
                <p className="text-[11px] font-semibold mb-3 px-1" style={{ color: 'var(--text-secondary)' }}>TODAY</p>
                <div className="relative border-l ml-2.5 pl-4 space-y-3" style={{ borderColor: 'var(--border-default)' }}>
                  {todayRuns.map((r) => (
                    <div key={r.id} className="relative group">
                      <span className="absolute -left-[19px] top-1.5 w-2 h-2 rounded-full transition-colors" style={{ background: 'var(--text-tertiary)' }} />
                      <button
                        onClick={() => openModal({ action: 'view', runId: r.id })}
                        className="w-full text-left text-[12px] font-medium rounded-lg truncate transition-colors py-1"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {getRunLabel(r)}
                      </button>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {yesterdayRuns.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold mb-3 px-1" style={{ color: 'var(--text-secondary)' }}>YESTERDAY</p>
                <div className="relative border-l ml-2.5 pl-4 space-y-3" style={{ borderColor: 'var(--border-default)' }}>
                  {yesterdayRuns.map((r) => (
                    <div key={r.id} className="relative group">
                      <span className="absolute -left-[19px] top-1.5 w-2 h-2 rounded-full transition-colors" style={{ background: 'var(--text-tertiary)' }} />
                      <button
                        onClick={() => openModal({ action: 'view', runId: r.id })}
                        className="w-full text-left text-[12px] font-medium rounded-lg truncate transition-colors py-1"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {getRunLabel(r)}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {todayRuns.length === 0 && yesterdayRuns.length === 0 && (
              <p className="text-[12px] italic px-1" style={{ color: 'var(--text-tertiary)' }}>No recent runs.</p>
            )}
          </div>
        )}

        {!collapsed && <div className="flex-1" />}

        {/* Bottom section */}
        <div className="p-3 border-t space-y-1.5" style={{ borderColor: 'var(--border-default)' }}>

          {/* Calendar status */}
          {user?.google_calendar_connected ? (
            <div
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[11px] font-medium"
              style={{ background: 'var(--success-bg)', color: 'var(--success)' }}
            >
              <CalendarCheck size={14} className="shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">Calendar Linked</span>
                  <button onClick={() => refreshUser()} className="opacity-60 hover:opacity-100 transition-opacity">
                    <RefreshCw size={11} />
                  </button>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={handleConnectCalendar}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[11px] font-medium transition-all duration-250 ease-out"
              style={{ background: 'var(--accent-bg)', color: 'var(--accent-text-on-bg)' }}
              title={collapsed ? 'Link Google Calendar' : undefined}
            >
              <Link2 size={14} className="shrink-0" />
              {!collapsed && <span>Link GCal</span>}
            </button>
          )}

          {/* Settings */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] font-medium transition-all duration-250 ease-out"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Settings size={14} className="shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">Settings</span>
                  <MoreHorizontal size={13} style={{ color: 'var(--text-tertiary)' }} />
                </>
              )}
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div
                  className="absolute bottom-12 left-0 w-60 rounded-2xl p-4 z-50 animate-slide-down"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  <div className="pb-3 mb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                    <p className="text-[12px] font-bold text-text-primary truncate">{user?.name}</p>
                    <p className="text-[10px] font-mono mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); logout(); }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-[12px] font-medium rounded-xl transition-all duration-250 ease-out"
                    style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                  >
                    <LogOut size={13} />
                    <span>Log Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-y-auto" style={{ background: 'var(--bg-base)' }}>
        <Outlet />
      </main>
      
      <GlobalAgentModal />
    </div>
  );
};
export default Layout;
