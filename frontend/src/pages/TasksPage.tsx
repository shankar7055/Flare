import React, { useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import { TaskCard } from '../components/TaskCard';
import { RescueCard } from '../components/RescueCard';
import { QuickAddTask } from '../components/QuickAddTask';
import { 
  CheckCircle, ShieldAlert, Clock, Calendar, Sparkles, RefreshCw, ChevronDown, ChevronRight, Activity, Target
} from 'lucide-react';
import { isToday, parseISO, isAfter, isThisWeek } from 'date-fns';

export const TasksPage: React.FC = () => {
  const { tasksQuery } = useTasks();

  const tasks = tasksQuery.data || [];
  const isLoadingTasks = tasksQuery.isLoading;

  // Collapsible section states
  const [isOverdueExpanded, setIsOverdueExpanded] = useState(true);
  const [isTodayExpanded, setIsTodayExpanded] = useState(true);
  const [isUpcomingExpanded, setIsUpcomingExpanded] = useState(false);
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);

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

  // Stats computation
  const activeCount = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
  const completedThisWeekCount = completedTasks.filter(t => t.completedAt && isThisWeek(new Date(t.completedAt))).length;
  
  // Identify if there is an active rescue plan to showcase at the top
  const rescuePlanTasks = tasks.filter(
    (t) => t.rescuePlans && t.rescuePlans.length > 0 && t.status !== 'completed'
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 font-sans" style={{ color: 'var(--text-primary)' }}>
      
      {/* Header */}
      <div className="flex items-center justify-between pb-5" style={{ borderBottom: '1px solid var(--border-default)' }}>
        <div>
          <h2 className="text-2xl font-semibold font-display tracking-tight" style={{ color: 'var(--text-primary)' }}>Tasks Registry</h2>
          <p className="text-xs font-medium mt-1 uppercase" style={{ color: 'var(--text-secondary)', letterSpacing: '0.15em' }}>Manage & Submit Tasks to AI Scheduler</p>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
        <div className="rounded-xl p-4 flex flex-col justify-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
            <Activity size={14} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
            <span className="text-[10px] font-semibold uppercase" style={{ letterSpacing: '0.15em' }}>Active</span>
          </div>
          <span className="text-2xl font-display font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>{activeCount}</span>
        </div>
        
        <div className="rounded-xl p-4 flex flex-col justify-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
            <Clock size={14} strokeWidth={1.75} style={{ color: 'var(--success)' }} />
            <span className="text-[10px] font-semibold uppercase" style={{ letterSpacing: '0.15em' }}>Due Today</span>
          </div>
          <span className="text-2xl font-display font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>{todayTasks.length}</span>
        </div>

        <div className="rounded-xl p-4 flex flex-col justify-center" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)' }}>
          <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--danger)' }}>
            <ShieldAlert size={14} strokeWidth={1.75} />
            <span className="text-[10px] font-semibold uppercase" style={{ letterSpacing: '0.15em' }}>At Risk</span>
          </div>
          <span className="text-2xl font-display font-semibold leading-none" style={{ color: 'var(--danger)' }}>{overdueRescueTasks.length}</span>
        </div>

        <div className="rounded-xl p-4 flex flex-col justify-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
            <Target size={14} strokeWidth={1.75} style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-[10px] font-semibold uppercase" style={{ letterSpacing: '0.15em' }}>Completed Wk</span>
          </div>
          <span className="text-2xl font-display font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>{completedThisWeekCount}</span>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left/Sidebar form area (Sticky) */}
        <div className="col-span-12 lg:col-span-4 lg:sticky lg:top-6">
          <QuickAddTask />
        </div>

        {/* Right/List content area */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* Active Rescue Plan */}
          {rescuePlanTasks.length > 0 && (
            <div className="animate-fade-in space-y-4">
              {rescuePlanTasks.map((t) => (
                <RescueCard key={t.id} task={t} />
              ))}
            </div>
          )}

          {/* Tasks List */}
          <div className="space-y-4">
            
            {isLoadingTasks && tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--text-tertiary)' }}>
                <RefreshCw size={24} className="animate-spin mb-3" strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
                <p className="text-xs font-sans">Accessing Tasks Registry...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 rounded-2xl" style={{ color: 'var(--text-tertiary)', border: '1px dashed var(--border-default)', background: 'var(--bg-surface-muted)' }}>
                <Sparkles size={28} className="mb-2" strokeWidth={1.75} style={{ color: 'var(--text-tertiary)' }} />
                <p className="text-sm font-medium font-sans" style={{ color: 'var(--text-secondary)' }}>Registry is empty</p>
                <p className="text-xs mt-1 max-w-[200px] text-center font-sans" style={{ color: 'var(--text-tertiary)' }}>
                  Create a task to see the agent begin scheduling actions.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                
                {/* 1. Overdue & Rescue Tasks */}
                <div className="space-y-2">
                  <button 
                    onClick={() => setIsOverdueExpanded(!isOverdueExpanded)}
                    className="w-full flex items-center justify-between group py-1"
                  >
                    <h3 className="text-[11px] font-semibold uppercase flex items-center gap-1.5 font-sans group-hover:opacity-80 transition-opacity" style={{ color: 'var(--danger)', letterSpacing: '0.15em' }}>
                      <ShieldAlert size={14} strokeWidth={1.75} /> Overdue & Rescue <span className="px-1.5 py-0.5 rounded-md ml-1" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{overdueRescueTasks.length}</span>
                    </h3>
                    {isOverdueExpanded ? <ChevronDown size={14} strokeWidth={1.75} className="opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--danger)' }} /> : <ChevronRight size={14} strokeWidth={1.75} className="opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--danger)' }} />}
                  </button>
                  
                  {isOverdueExpanded && (
                    <div className="space-y-2 pl-2 ml-[7px]" style={{ borderLeft: '2px solid var(--danger)' }}>
                      {overdueRescueTasks.length === 0 ? (
                        <p className="text-xs italic py-2" style={{ color: 'var(--text-tertiary)' }}>Nothing overdue — nice.</p>
                      ) : (
                        overdueRescueTasks.map((task) => (
                          <TaskCard key={task.id} task={task} isRescueTerritory={true} />
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Today's Tasks */}
                <div className="space-y-2 pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
                  <button 
                    onClick={() => setIsTodayExpanded(!isTodayExpanded)}
                    className="w-full flex items-center justify-between group py-1"
                  >
                    <h3 className="text-[11px] font-semibold uppercase flex items-center gap-1.5 font-sans group-hover:opacity-80 transition-opacity" style={{ color: 'var(--success)', letterSpacing: '0.15em' }}>
                      <Clock size={14} strokeWidth={1.75} /> Due Today <span className="px-1.5 py-0.5 rounded-md ml-1" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>{todayTasks.length}</span>
                    </h3>
                    {isTodayExpanded ? <ChevronDown size={14} strokeWidth={1.75} className="opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--success)' }} /> : <ChevronRight size={14} strokeWidth={1.75} className="opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--success)' }} />}
                  </button>
                  
                  {isTodayExpanded && (
                    <div className="space-y-2 pl-2 ml-[7px]" style={{ borderLeft: '2px solid var(--success)' }}>
                      {todayTasks.length === 0 ? (
                        <p className="text-xs italic py-2" style={{ color: 'var(--text-tertiary)' }}>No tasks due today.</p>
                      ) : (
                        todayTasks.map((task) => (
                          <TaskCard key={task.id} task={task} isRescueTerritory={isRescueTerritory(task)} />
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Upcoming Tasks */}
                <div className="space-y-2 pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
                  <button 
                    onClick={() => setIsUpcomingExpanded(!isUpcomingExpanded)}
                    className="w-full flex items-center justify-between group py-1"
                  >
                    <h3 className="text-[11px] font-semibold uppercase flex items-center gap-1.5 font-sans group-hover:opacity-80 transition-opacity" style={{ color: 'var(--text-secondary)', letterSpacing: '0.15em' }}>
                      <Calendar size={14} strokeWidth={1.75} style={{ color: 'var(--text-tertiary)' }} /> Upcoming <span className="px-1.5 py-0.5 rounded-md ml-1" style={{ background: 'var(--bg-surface-muted)', color: 'var(--text-secondary)' }}>{upcomingTasks.length}</span>
                    </h3>
                    {isUpcomingExpanded ? <ChevronDown size={14} strokeWidth={1.75} className="opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-tertiary)' }} /> : <ChevronRight size={14} strokeWidth={1.75} className="opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-tertiary)' }} />}
                  </button>
                  
                  {isUpcomingExpanded && (
                    <div className="space-y-2 pl-2 ml-[7px]" style={{ borderLeft: '2px solid var(--border-default)' }}>
                      {upcomingTasks.length === 0 ? (
                        <p className="text-xs italic py-2" style={{ color: 'var(--text-tertiary)' }}>Your future is clear.</p>
                      ) : (
                        upcomingTasks.map((task) => (
                          <TaskCard key={task.id} task={task} isRescueTerritory={isRescueTerritory(task)} />
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* 4. Completed Tasks */}
                <div className="space-y-2 pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
                  <button 
                    onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
                    className="w-full flex items-center justify-between group py-1"
                  >
                    <h3 className="text-[11px] font-semibold uppercase flex items-center gap-1.5 font-sans group-hover:opacity-80 transition-opacity" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.15em' }}>
                      <CheckCircle size={14} strokeWidth={1.75} style={{ color: 'var(--text-tertiary)' }} /> Completed <span className="px-1.5 py-0.5 rounded-md ml-1" style={{ background: 'var(--bg-surface-muted)', color: 'var(--text-secondary)' }}>{completedTasks.length}</span>
                    </h3>
                    {isCompletedExpanded ? <ChevronDown size={14} strokeWidth={1.75} className="opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-tertiary)' }} /> : <ChevronRight size={14} strokeWidth={1.75} className="opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-tertiary)' }} />}
                  </button>
                  
                  {isCompletedExpanded && (
                    <div className="space-y-1.5 pl-2 ml-[7px]" style={{ borderLeft: '2px solid var(--border-default)', opacity: 0.75 }}>
                      {completedTasks.length === 0 ? (
                        <p className="text-xs italic py-2" style={{ color: 'var(--text-tertiary)' }}>No completed tasks yet.</p>
                      ) : (
                        completedTasks.map((task) => (
                          <TaskCard key={task.id} task={task} isRescueTerritory={false} isCompact={true} />
                        ))
                      )}
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};

export default TasksPage;
