import React, { useEffect, useState } from 'react';
import type { Task, RescuePlanStep } from '../api/client';
import { ShieldAlert, Clock, CheckSquare, Square } from 'lucide-react';
import { format, differenceInSeconds } from 'date-fns';
import { motion } from 'framer-motion';

interface RescueCardProps {
  task: Task;
}

export const RescueCard: React.FC<RescueCardProps> = ({ task }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  const deadlineDate = new Date(task.deadline);

  useEffect(() => {
    const tick = () => {
      const diff = differenceInSeconds(deadlineDate, new Date());
      setTimeLeft(diff > 0 ? diff : 0);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [task.deadline]);

  // Format countdown string
  const formatCountdown = (totalSeconds: number) => {
    if (totalSeconds <= 0) return "00:00:00 - TIME EXPIRED";
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get active rescue plan
  const activePlan = task.rescuePlans?.[0];
  let parsedSteps: RescuePlanStep[] = [];
  if (activePlan) {
    try {
      parsedSteps = JSON.parse(activePlan.steps);
    } catch (e) {
      console.error("Failed to parse rescue steps", e);
    }
  }

  const toggleStep = (index: number) => {
    setCompletedSteps(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (!activePlan) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full rounded-xl border-l-[3px] p-5 relative overflow-hidden shadow-sm mb-6"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderLeftColor: 'var(--danger)'
      }}
    >
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 relative z-10 pb-5" style={{ borderBottom: '1px solid var(--border-default)' }}>
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)' }}>
            <ShieldAlert size={26} className="animate-bounce" strokeWidth={1.75} style={{ color: 'var(--danger)' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-[10px] font-semibold rounded-full uppercase inline-block font-sans" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', letterSpacing: '0.15em' }}>
                RESCUE MODE
              </span>
            </div>
            <h2 className="text-xl font-semibold font-display mt-1" style={{ color: 'var(--text-primary)' }}>{task.title}</h2>
          </div>
        </div>

        {/* Live Countdown Clock */}
        <div className="flex flex-col items-start md:items-end justify-center shrink-0">
          <span className="text-[10px] font-semibold uppercase mb-1 flex items-center gap-1 font-sans" style={{ color: 'var(--danger)', letterSpacing: '0.15em' }}>
            <Clock size={11} strokeWidth={1.75} /> Time Remaining
          </span>
          <div className="text-2xl font-mono font-black tracking-wider px-4 py-1.5 rounded-lg" style={{ color: 'var(--danger)', background: 'var(--danger-bg)', border: '1px solid var(--danger)' }}>
            {formatCountdown(timeLeft)}
          </div>
        </div>
      </div>

      {/* Description / Instructions */}
      <p className="text-xs leading-relaxed mb-5 p-4 rounded-lg relative z-10 font-sans" style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)' }}>
        🚨 <strong>Emergency Directive:</strong> The AI Agent detected that this pending task is close to its deadline without calendar slots booked. The plan below has been structured to guide you step-by-step to completion.
      </p>

      {/* Steps Timeline Checklist */}
      <div className="relative z-10 pl-2">
        <h3 className="text-xs uppercase font-semibold mb-4 font-sans" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.15em' }}>Rescue Action Steps</h3>
        
        <div className="relative pl-6 space-y-2.5 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-border-default">
          {parsedSteps.length === 0 ? (
            <p className="text-xs text-text-tertiary italic font-sans">No steps generated for this plan.</p>
          ) : (
            parsedSteps.map((step, idx) => {
              const isDone = !!completedSteps[idx];
              
              // Calculate target start date formatted
              let formattedTime = "";
              try {
                if (step.start_time.includes('T') || !isNaN(Date.parse(step.start_time))) {
                  formattedTime = format(new Date(step.start_time), 'h:mm a');
                } else {
                  formattedTime = step.start_time;
                }
              } catch {
                formattedTime = step.start_time;
              }

              return (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.12 }}
                  className={`flex items-start gap-4 transition-all duration-300 ${
                    isDone ? 'opacity-55' : 'opacity-100'
                  }`}
                >
                  {/* Custom Checkbox Node on timeline line */}
                  <button 
                    onClick={() => toggleStep(idx)}
                    className="absolute left-0 mt-0.5 z-10 transition-transform active:scale-95 rounded"
                    style={{ background: 'var(--bg-surface)' }}
                  >
                    {isDone ? (
                      <CheckSquare size={22} className="rounded" strokeWidth={1.75} style={{ color: 'var(--success)', background: 'var(--success-bg)' }} />
                    ) : (
                      <Square size={22} strokeWidth={1.75} style={{ color: 'var(--danger)' }} />
                    )}
                  </button>

                  <div className="flex-1 rounded-xl p-4 transition-all" style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)' }}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-semibold uppercase font-sans" style={{ color: 'var(--danger)', letterSpacing: '0.15em' }}>
                        Step {idx + 1} • {formattedTime}
                      </span>
                      <span className="px-2.5 py-1 text-[10px] font-semibold rounded-full uppercase font-sans" style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', letterSpacing: '0.15em' }}>
                        {step.duration_minutes}m
                      </span>
                    </div>
                    <p className={`text-sm text-text-primary font-sans leading-relaxed ${isDone ? 'line-through text-text-tertiary' : ''}`}>
                      {step.action}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );
};
export default RescueCard;
