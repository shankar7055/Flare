import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useTasks } from '../hooks/useTasks';
import { Calendar as CalendarIcon, Clock, RefreshCw, Sparkles, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { 
  format, isSameDay, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, 
  parseISO, isAfter, startOfDay, differenceInMinutes, isToday, startOfWeek, 
  endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, isSameMonth 
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const START_HOUR = 7;
const END_HOUR = 21; // 9 PM
const PIXELS_PER_HOUR = 80;

type ViewType = 'Day' | 'Week' | 'Month';

// Helper to compute layout for overlapping events
function computeEventLayout(events: any[]) {
  const sorted = [...events].sort((a, b) => {
    const startA = parseISO(a.start).getTime();
    const startB = parseISO(b.start).getTime();
    if (startA !== startB) return startA - startB;
    return parseISO(b.end).getTime() - parseISO(a.end).getTime();
  });

  const layoutParams: Record<string, { top: number; height: number; left: number; width: number }> = {};
  const clusters: any[][] = [];
  let currentCluster: any[] = [];
  let clusterEnd = 0;

  for (const evt of sorted) {
    const start = parseISO(evt.start).getTime();
    const end = parseISO(evt.end).getTime();
    
    if (currentCluster.length === 0 || start < clusterEnd) {
      currentCluster.push(evt);
      clusterEnd = Math.max(clusterEnd, end);
    } else {
      clusters.push(currentCluster);
      currentCluster = [evt];
      clusterEnd = end;
    }
  }
  if (currentCluster.length > 0) clusters.push(currentCluster);

  for (const cluster of clusters) {
    const columns: number[] = [];
    
    cluster.forEach((evt) => {
      const start = parseISO(evt.start).getTime();
      const end = parseISO(evt.end).getTime();
      
      let placed = false;
      for (let col = 0; col < columns.length; col++) {
        if (start >= columns[col]) {
          columns[col] = end;
          evt._col = col;
          placed = true;
          break;
        }
      }
      
      if (!placed) {
        evt._col = columns.length;
        columns.push(end);
      }
    });

    const numCols = columns.length;
    
    cluster.forEach(evt => {
      const startDt = parseISO(evt.start);
      const endDt = parseISO(evt.end);
      
      const startMinutes = (startDt.getHours() * 60 + startDt.getMinutes()) - (START_HOUR * 60);
      const durationMinutes = Math.max(differenceInMinutes(endDt, startDt), 15);
      
      const top = (startMinutes / 60) * PIXELS_PER_HOUR;
      const height = (durationMinutes / 60) * PIXELS_PER_HOUR;
      
      layoutParams[evt.id] = {
        top,
        height,
        left: (evt._col / numCols) * 100,
        width: (1 / numCols) * 100
      };
    });
  }

  return layoutParams;
}

export const SchedulePage: React.FC = () => {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['calendar'],
    queryFn: () => apiClient.calendar.getEvents(60),
  });
  const { tasksQuery } = useTasks();
  const tasks = tasksQuery.data || [];

  const [view, setView] = useState<ViewType>('Day');
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [nowTop, setNowTop] = useState(-1);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Smooth updating indicator
  useEffect(() => {
    const updateNow = () => {
      const now = new Date();
      const minutesSinceStart = (now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60) - (START_HOUR * 60);
      setNowTop((minutesSinceStart / 60) * PIXELS_PER_HOUR);
    };
    
    updateNow();
    const interval = setInterval(updateNow, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to current time on mount, view switch, or going back to today
  useEffect(() => {
    // Only scroll if today is selected and views Day/Week are active
    if (scrollContainerRef.current && isToday(selectedDate) && (view === 'Day' || view === 'Week')) {
      // Delay slightly to let layout settle
      const timer = setTimeout(() => {
        if (scrollContainerRef.current) {
          const now = new Date();
          const minutesSinceStart = (now.getHours() * 60 + now.getMinutes()) - (START_HOUR * 60);
          const targetTop = (minutesSinceStart / 60) * PIXELS_PER_HOUR;
          scrollContainerRef.current.scrollTo({
            top: Math.max(0, targetTop - 160),
            behavior: 'smooth'
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [view, selectedDate]);

  const handlePrev = () => {
    if (view === 'Day') setSelectedDate(prev => subDays(prev, 1));
    else if (view === 'Week') setSelectedDate(prev => subWeeks(prev, 1));
    else if (view === 'Month') setSelectedDate(prev => subMonths(prev, 1));
  };

  const handleNext = () => {
    if (view === 'Day') setSelectedDate(prev => addDays(prev, 1));
    else if (view === 'Week') setSelectedDate(prev => addWeeks(prev, 1));
    else if (view === 'Month') setSelectedDate(prev => addMonths(prev, 1));
  };
  
  const handleToday = () => setSelectedDate(startOfDay(new Date()));

  const upcomingTasks = tasks
    .filter(t => t.status !== 'completed' && isAfter(new Date(t.deadline), new Date()))
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  const hours = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    hours.push(h);
  }

  // Right Panel Data
  const dayEventsForStats = events.filter(e => {
    try { return isSameDay(parseISO(e.start), selectedDate); } 
    catch { return false; }
  });
  
  // Compute Free Time and Best Focus Slot
  const sortedDayEvents = [...dayEventsForStats].sort((a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime());
  
  const busySlots: {start: Date, end: Date}[] = [];
  sortedDayEvents.forEach(evt => {
    const s = parseISO(evt.start);
    const e = parseISO(evt.end);
    if (busySlots.length === 0) {
      busySlots.push({ start: s, end: e });
    } else {
      const last = busySlots[busySlots.length - 1];
      if (s <= last.end) {
        last.end = new Date(Math.max(last.end.getTime(), e.getTime()));
      } else {
        busySlots.push({ start: s, end: e });
      }
    }
  });

  const dayStart = startOfDay(selectedDate);
  const workStart = new Date(dayStart.getTime() + START_HOUR * 3600000);
  const workEnd = new Date(dayStart.getTime() + END_HOUR * 3600000);

  let totalFreeMinutes = 0;
  let bestSlot = { start: workStart, end: workEnd, duration: 0 };
  let currentFreeStart = workStart;

  busySlots.forEach(slot => {
    if (slot.start > currentFreeStart && slot.start < workEnd) {
      const duration = differenceInMinutes(slot.start, currentFreeStart);
      totalFreeMinutes += duration;
      if (duration > bestSlot.duration) {
        bestSlot = { start: currentFreeStart, end: slot.start, duration };
      }
    }
    if (slot.end > currentFreeStart) {
      currentFreeStart = slot.end < workEnd ? slot.end : workEnd;
    }
  });

  if (currentFreeStart < workEnd) {
    const duration = differenceInMinutes(workEnd, currentFreeStart);
    totalFreeMinutes += duration;
    if (duration > bestSlot.duration) {
      bestSlot = { start: currentFreeStart, end: workEnd, duration };
    }
  }

  const freeHours = Math.floor(totalFreeMinutes / 60);
  const freeMins = totalFreeMinutes % 60;
  const totalFreeTimeStr = freeHours > 0 ? `${freeHours}h ${freeMins > 0 ? `${freeMins}m` : ''}` : `${freeMins}m`;

  const bestSlotStr = bestSlot.duration >= 30 
    ? `${format(bestSlot.start, 'h:mm a')} – ${format(bestSlot.end, 'h:mm a')}`
    : 'No clear slots';

  // AI Suggestion Logic
  let aiSuggestion: { title: string, desc: string, action: string | null, type: string } = {
    title: 'Schedule is Optimized',
    desc: 'No conflicts detected and no urgent overdue tasks. Great job!',
    action: null,
    type: 'good'
  };

  let conflictFound = null;
  for (let i = 0; i < sortedDayEvents.length - 1; i++) {
    const e1 = sortedDayEvents[i];
    const e2 = sortedDayEvents[i+1];
    if (parseISO(e2.start) < parseISO(e1.end)) {
      conflictFound = { e1, e2 };
      break;
    }
  }

  if (conflictFound) {
    aiSuggestion = {
      title: 'Resolve Schedule Conflict',
      desc: `"${conflictFound.e2.title}" overlaps with "${conflictFound.e1.title}". Want me to find a new time?`,
      action: 'Reschedule',
      type: 'conflict'
    };
  } else {
    const overdueTasks = tasks.filter(t => t.status === 'overdue');
    if (overdueTasks.length > 0) {
      aiSuggestion = {
        title: 'Schedule Overdue Task',
        desc: `"${overdueTasks[0].title}" is overdue. Schedule it during your best focus slot today?`,
        action: 'Schedule',
        type: 'overdue'
      };
    }
  }

  const meetingsCount = dayEventsForStats.filter(e => e.source === 'google_calendar').length;
  const deadlinesCount = upcomingTasks.filter(t => isSameDay(new Date(t.deadline), selectedDate)).length;

  const renderEventCard = (evt: any, layout: any, isWeekView: boolean = false) => {
    const isGCal = evt.source === 'google_calendar';
    const startDt = parseISO(evt.start);
    const endDt = parseISO(evt.end);
    const timeStr = `${format(startDt, 'h:mm')} – ${format(endDt, 'h:mm a')}`;
    
    const isRescue = evt.title.toLowerCase().includes('rescue') || evt.title.toLowerCase().includes('urgent');
    const accentColor = isRescue ? '#EF4444' : isGCal ? '#3B82F6' : '#F97316';
    const priorityStr = isRescue ? 'High Priority' : isGCal ? 'Meeting' : 'Focus Session';

    return (
      <motion.div
        key={evt.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className={`absolute rounded-[12px] p-2 overflow-hidden flex flex-col justify-start group hover:z-30 transition-all border shadow-sm cursor-pointer hover:shadow-lg bg-white ${isWeekView ? 'p-1.5' : 'p-3'}`}
        style={{
          top: `${layout.top}px`,
          height: `${Math.max(layout.height, 40)}px`,
          left: `${layout.left}%`,
          width: `calc(${layout.width}% - 8px)`,
          borderColor: 'rgba(17,24,39,0.08)',
          borderLeft: `4px solid ${accentColor}`
        }}
      >
        <div className="min-w-0 flex-1">
          <p className={`${isWeekView ? 'text-[11px]' : 'text-[14px]'} font-semibold text-gray-900 leading-snug truncate`}>
            {evt.title}
          </p>
          {layout.height > 50 && (
            <div className="mt-1 flex flex-col gap-0.5">
              <p className={`${isWeekView ? 'text-[9px]' : 'text-[12px]'} font-medium text-gray-500 truncate`}>
                {timeStr}
              </p>
              {!isWeekView && layout.height > 70 && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md border border-gray-100">
                    {isGCal ? 'Google Calendar' : 'AI Scheduled'}
                  </span>
                  <span className="text-[11px] font-bold" style={{ color: accentColor }}>
                    {priorityStr}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const renderDayView = () => {
    const layoutParams = computeEventLayout(dayEventsForStats);
    
    return (
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden relative">
        <div className="flex min-w-[600px]">
          {/* Hour Labels */}
          <div className="w-[80px] flex-shrink-0 pt-4 pb-8 border-r border-gray-100 text-right pr-4 bg-white z-10">
            {hours.map(hour => {
              const label = hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
              return (
                <div key={hour} className="relative group" style={{ height: `${PIXELS_PER_HOUR}px` }}>
                  <span className="text-[13px] font-medium absolute right-0 -top-2.5 text-gray-500 group-hover:text-gray-900 transition-colors">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Grid Events Area */}
          <div className="flex-1 relative pt-4 pb-8 bg-white">
            {hours.map(hour => (
              <div 
                key={hour} 
                className="absolute w-full border-t border-gray-100 transition-colors hover:border-gray-200 cursor-default" 
                style={{ top: `${(hour - START_HOUR) * PIXELS_PER_HOUR + 16}px` }} 
              />
            ))}

            {/* Now Indicator */}
            {isToday(selectedDate) && nowTop >= 0 && (
              <div 
                className="absolute w-full z-20 flex items-center pointer-events-none"
                style={{ top: `${nowTop + 16}px` }}
              >
                <div className="w-2.5 h-2.5 rounded-full -ml-[5px] bg-[#F97316] shadow-[0_0_0_4px_rgba(249,115,22,0.15)] animate-pulse-ring" />
                <div className="h-[2px] flex-1 bg-[#F97316] opacity-80" />
              </div>
            )}

            <div className="absolute inset-0 top-4 bottom-8 pr-6 pl-2">
              <AnimatePresence>
                {dayEventsForStats.map(evt => {
                  const layout = layoutParams[evt.id];
                  if (!layout) return null;
                  return renderEventCard(evt, layout, false);
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Days Header */}
        <div className="flex border-b border-gray-100 bg-white sticky top-0 z-20 shadow-sm">
          <div className="w-[80px] border-r border-gray-100 flex-shrink-0" />
          <div className="flex-1 flex">
            {days.map((day, i) => (
              <div key={i} className={`flex-1 border-r border-gray-100 last:border-r-0 py-3 flex flex-col items-center justify-center ${isToday(day) ? 'bg-orange-50/30' : ''}`}>
                <span className={`text-[12px] font-semibold ${isToday(day) ? 'text-[#F97316]' : 'text-gray-500'}`}>{format(day, 'E')}</span>
                <span className={`text-[20px] font-bold mt-0.5 ${isToday(day) ? 'text-white bg-[#F97316] w-8 h-8 rounded-full flex items-center justify-center shadow-sm' : 'text-gray-900 w-8 h-8 flex items-center justify-center'}`}>
                  {format(day, 'd')}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Scrollable Grid */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <div className="flex min-w-[700px]">
            {/* Time Labels */}
            <div className="w-[80px] flex-shrink-0 pt-4 pb-8 border-r border-gray-100 text-right pr-4 bg-white z-10">
              {hours.map(hour => {
                const label = hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
                return (
                  <div key={hour} className="relative group" style={{ height: `${PIXELS_PER_HOUR}px` }}>
                    <span className="text-[12px] font-medium absolute right-0 -top-2.5 text-gray-500">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
            
            <div className="flex-1 flex relative pt-4 pb-8 bg-white">
              {/* Horizontal Lines */}
              <div className="absolute inset-0 top-4 bottom-8 pointer-events-none">
                {hours.map(hour => (
                  <div key={hour} className="absolute w-full border-t border-gray-100" style={{ top: `${(hour - START_HOUR) * PIXELS_PER_HOUR}px` }} />
                ))}
              </div>

              {days.map((day, dayIndex) => {
                const eventsForDay = events.filter(e => {
                  try { return isSameDay(parseISO(e.start), day); } catch { return false; }
                });
                const layoutParams = computeEventLayout(eventsForDay);

                return (
                  <div key={dayIndex} className={`flex-1 border-r border-gray-100 last:border-r-0 relative ${isToday(day) ? 'bg-orange-50/10' : ''}`}>
                    {/* Now Indicator for Week */}
                    {isToday(day) && nowTop >= 0 && (
                      <div className="absolute w-full z-20 flex items-center pointer-events-none" style={{ top: `${nowTop}px` }}>
                        <div className="w-2.5 h-2.5 rounded-full -ml-[5px] bg-[#F97316] shadow-[0_0_0_4px_rgba(249,115,22,0.15)] animate-pulse-ring" />
                        <div className="h-[2px] flex-1 bg-[#F97316] opacity-80" />
                      </div>
                    )}
                    
                    {eventsForDay.map(evt => {
                      const layout = layoutParams[evt.id];
                      if (!layout) return null;
                      return renderEventCard(evt, layout, true);
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];
    days.forEach(day => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    return (
      <div className="flex-1 flex flex-col bg-white h-full overflow-hidden">
        <div className="flex border-b border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="flex-1 py-3 text-center text-[13px] font-bold text-gray-500 border-r border-gray-200 last:border-r-0">
              {d}
            </div>
          ))}
        </div>
        
        <div className="flex-1 flex flex-col">
          {weeks.map((week, wIndex) => (
            <div key={wIndex} className="flex-1 flex border-b border-gray-200 last:border-b-0">
              {week.map((day, dIndex) => {
                const isCurrentMonth = isSameMonth(day, selectedDate);
                const eventsForDay = events.filter(e => {
                  try { return isSameDay(parseISO(e.start), day); } catch { return false; }
                });

                return (
                  <div key={dIndex} className={`flex-1 border-r border-gray-200 last:border-r-0 p-2 flex flex-col ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}`}>
                    <div className="flex justify-end mb-2">
                      <span className={`text-[13px] font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-[#F97316] text-white shadow-sm' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                        {format(day, 'd')}
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                      {eventsForDay.map(evt => {
                        const isGCal = evt.source === 'google_calendar';
                        const isRescue = evt.title.toLowerCase().includes('rescue') || evt.title.toLowerCase().includes('urgent');
                        const bgClass = isRescue ? 'bg-red-100 text-red-800' : isGCal ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800';
                        return (
                          <div key={evt.id} className={`text-[10px] font-semibold px-1.5 py-1 rounded-[6px] truncate ${bgClass}`}>
                            {format(parseISO(evt.start), 'h:mma')} {evt.title}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden">
      {/* ── Main Panel (Calendar) ───────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#FAF8F5] p-6 lg:p-10 border-r border-gray-200">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-[36px] font-extrabold text-gray-900 tracking-tight leading-none mb-2">Schedule</h1>
            <div className="flex items-center gap-4 text-[14px] text-gray-500 font-medium">
              <span className="text-gray-900 font-semibold">{format(selectedDate, 'EEEE, MMMM d')}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span>{meetingsCount} Meetings</span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span>{deadlinesCount} Deadlines</span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span className="text-green-600">No Conflicts</span>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-3">
              <button 
                onClick={handleToday}
                className="px-4 py-2 rounded-[12px] bg-white border border-gray-200 text-gray-700 font-semibold text-[14px] shadow-sm hover:bg-gray-50 transition-colors"
              >
                Today
              </button>
              <div className="flex items-center bg-white border border-gray-200 rounded-[12px] shadow-sm p-1">
                <button onClick={handlePrev} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
                  <ChevronLeft size={18} />
                </button>
                <div className="px-4 text-[14px] font-semibold text-gray-900 min-w-[130px] text-center">
                  {format(selectedDate, 'MMM d, yyyy')}
                </div>
                <button onClick={handleNext} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* View Toggles */}
            <div className="flex bg-white rounded-[12px] border border-gray-200 shadow-sm p-1">
              {(['Day', 'Week', 'Month'] as ViewType[]).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-4 py-1.5 text-[13px] font-semibold rounded-[8px] transition-colors ${
                    view === v ? 'bg-gray-100 text-[#F97316] shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar Grid Container */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 rounded-[20px] bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col relative"
        >
          {isLoading && (
            <div className="absolute top-4 right-4 z-50">
              <RefreshCw size={16} className="animate-spin text-gray-400" />
            </div>
          )}
          
          {view === 'Day' && renderDayView()}
          {view === 'Week' && renderWeekView()}
          {view === 'Month' && renderMonthView()}
          
        </motion.div>
      </div>

      {/* ── Right Panel (AI Assistant) ──────────────────────── */}
      <div className="w-full lg:w-[340px] bg-white border-l border-gray-200 p-6 flex flex-col h-full overflow-y-auto">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-full bg-[#FFF7ED] flex items-center justify-center">
            <Sparkles size={16} className="text-[#F97316]" />
          </div>
          <h2 className="text-[18px] font-semibold text-gray-900">AI Assistant</h2>
        </div>

        <div className="space-y-8">
          
          {/* Today's Summary */}
          <section>
            <h3 className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-3">Today's Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#FAF8F5] p-3 rounded-[12px] border border-gray-100">
                <p className="text-[24px] font-semibold text-gray-900">{meetingsCount}</p>
                <p className="text-[12px] text-gray-500 font-medium">Meetings</p>
              </div>
              <div className="bg-[#FAF8F5] p-3 rounded-[12px] border border-gray-100">
                <p className="text-[24px] font-semibold text-gray-900">{deadlinesCount}</p>
                <p className="text-[12px] text-gray-500 font-medium">Deadlines</p>
              </div>
              <div className="col-span-2 bg-[#F0FDF4] p-3 rounded-[12px] border border-green-100">
                <p className="text-[20px] font-semibold text-green-700">{totalFreeTimeStr}</p>
                <p className="text-[12px] text-green-600 font-medium">Available Focus Time</p>
              </div>
            </div>
          </section>

          {/* AI Suggestion */}
          <section>
            <h3 className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Zap size={14} className="text-green-500" />
              AI Suggestion
            </h3>
            <div className="bg-white border border-gray-200 rounded-[16px] p-4 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-[14px] font-semibold text-gray-900 mb-1">{aiSuggestion.title}</p>
              <p className="text-[13px] text-gray-500 mb-4">{aiSuggestion.desc}</p>
              {aiSuggestion.action && (
                <div className="flex gap-2">
                  <button className="flex-1 bg-[#22C55E] hover:bg-green-600 text-white text-[13px] font-semibold py-2 rounded-[10px] transition-colors shadow-sm">
                    {aiSuggestion.action}
                  </button>
                  <button className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-[13px] font-semibold py-2 rounded-[10px] transition-colors">
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Free Time */}
          <section>
            <h3 className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-3">Best Focus Slot</h3>
            <div className="bg-[#FAF8F5] border border-gray-100 border-dashed rounded-[16px] p-4 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm mb-2">
                <Clock size={18} className="text-gray-400" />
              </div>
              <p className="text-[14px] font-semibold text-gray-900">{bestSlotStr}</p>
              <p className="text-[12px] text-gray-500 mt-1 mb-3">
                {bestSlot.duration >= 30 ? "You're completely free. Great time for deep work." : "No significant focus time available today."}
              </p>
              {bestSlot.duration >= 30 && (
                <button className="text-[13px] font-semibold text-[#F97316] bg-[#FFF7ED] px-4 py-2 rounded-[10px] hover:bg-[#ffebd6] transition-colors">
                  Schedule Focus Session
                </button>
              )}
            </div>
          </section>

          {/* Upcoming Events */}
          <section>
            <h3 className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-3">Upcoming</h3>
            <div className="space-y-3">
              {upcomingTasks.slice(0, 3).map(t => (
                <div key={t.id} className="flex gap-3 items-start">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-[#F97316] shrink-0" />
                  <div>
                    <p className="text-[13px] font-semibold text-gray-900">{t.title}</p>
                    <p className="text-[11px] text-gray-500 font-medium">{format(new Date(t.deadline), 'h:mm a')} · {differenceInMinutes(new Date(t.deadline), new Date())}m remaining</p>
                  </div>
                </div>
              ))}
              {upcomingTasks.length === 0 && (
                <p className="text-[13px] text-gray-500 italic">No upcoming deadlines.</p>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default SchedulePage;
