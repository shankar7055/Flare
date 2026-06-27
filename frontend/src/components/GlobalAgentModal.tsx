import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, RefreshCw, X, Sparkles, Send, Zap } from 'lucide-react';
import { useAgentModal } from '../context/AgentModalContext';
import { apiClient } from '../api/client';
import type { AgentRun, Task } from '../api/client';
import { parseReasoningTrace } from '../lib/parseTrace';
import { describeToolCall } from '../lib/toolDisplay';
import { RescueCard } from './RescueCard';
import { formatDistanceToNow } from 'date-fns';

const STEP_INTERVAL_MS = 100;

const ThinkingBubble: React.FC = () => (
  <div className="flex justify-start my-4">
    <div
      className="px-5 py-3.5 rounded-2xl flex items-center gap-3"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="w-6 h-6 rounded-lg flex items-center justify-center"
           style={{ background: 'var(--accent-bg)' }}>
        <Bot size={13} style={{ color: 'var(--accent)' }} />
      </div>
      <span className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
        Thinking
      </span>
      <div className="flex gap-1 items-end">
        {[0, 0.18, 0.36].map((d, i) => (
          <motion.span
            key={i}
            className="w-[5px] h-[5px] rounded-full"
            style={{ background: 'var(--accent)' }}
            animate={{ y: [0, -5, 0], opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 0.85, delay: d, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </div>
  </div>
);

const StepRow: React.FC<{
  toolName: string;
  args: any;
  result: any;
  isFirst: boolean;
  isLast: boolean;
  isSubStep?: boolean;
}> = ({ toolName, args, result, isFirst, isLast, isSubStep }) => {
  const { icon: Icon, tone, text } = describeToolCall(toolName, args, result);
  const [showDetails, setShowDetails] = useState(false);
  
  return (
    <div className={`relative flex items-start gap-4 py-3 group ${isSubStep ? 'opacity-80 scale-[0.98] origin-left' : ''}`}>
      {/* connecting line */}
      {!isLast && (
        <div
          className={`absolute ${isSubStep ? 'left-[9px]' : 'left-[11px]'} top-8 bottom-[-12px] w-px`}
          style={{ background: 'var(--border-subtle)' }}
        />
      )}
      
      {/* Icon node */}
      <div
        className={`${isSubStep ? 'w-[18px] h-[18px]' : 'w-[22px] h-[22px]'} shrink-0 rounded-md flex items-center justify-center relative z-10 transition-transform group-hover:scale-110`}
        style={{
          background: `var(--${tone}-bg)`,
          color: `var(--${tone})`,
          boxShadow: '0 1px 3px rgba(31,30,28,0.06)'
        }}
      >
        <Icon size={isSubStep ? 10 : 12} strokeWidth={2.5} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-[1px]">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] font-semibold leading-tight text-text-primary">
            {text}
          </p>
          <button 
            onClick={() => setShowDetails(!showDetails)} 
            className="text-[10px] text-text-tertiary hover:text-text-secondary px-2 py-0.5 rounded transition-colors"
          >
            {showDetails ? 'Hide details' : 'Show details'}
          </button>
        </div>
        {showDetails && (
          <div className="mt-2 bg-[rgba(31,30,28,0.03)] p-2.5 rounded-lg border border-[rgba(31,30,28,0.05)] overflow-x-auto">
            <p className="text-[10px] font-mono opacity-70 text-text-primary whitespace-pre-wrap">
              sys.{toolName}({Object.keys(args).length > 0 ? JSON.stringify(args, null, 2) : ''})
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export const GlobalAgentModal: React.FC = () => {
  const { isOpen, triggerConfig, closeModal } = useAgentModal();
  
  const [isPending, setIsPending] = useState(false);
  const [run, setRun] = useState<AgentRun | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  const [revealCount, setRevealCount] = useState(0);
  const [revealDone, setRevealDone] = useState(false);
  
  const lastFiredTriggerId = useRef<string | null>(null);
  const revealTimer = useRef<NodeJS.Timeout | null>(null);

  // Fetch tasks to match IDs if needed
  useEffect(() => {
    if (isOpen) {
      apiClient.tasks.getTasks().then(setTasks).catch(console.error);
    }
  }, [isOpen]);

  // Execute API call based on triggerConfig
  useEffect(() => {
    if (!isOpen || !triggerConfig || triggerConfig.action === 'view') return;
    if (triggerConfig.triggerId === lastFiredTriggerId.current) return;
    
    lastFiredTriggerId.current = triggerConfig.triggerId || null;
    
    setIsPending(true);
    setRun(null);
    setRevealCount(0);
    setRevealDone(false);
    
    let requestPromise: Promise<AgentRun | { agentRun: AgentRun }>;
    
    if (triggerConfig.action === 'prioritize') {
      requestPromise = apiClient.agent.triggerAgent();
    } else if (triggerConfig.action === 'rescue' && triggerConfig.taskId) {
      requestPromise = apiClient.agent.triggerRescue(triggerConfig.taskId);
    } else if (triggerConfig.action === 'parse' && triggerConfig.payload) {
      requestPromise = apiClient.tasks.parseTask(triggerConfig.payload);
    } else {
      setIsPending(false);
      return;
    }
    
    requestPromise
      .then(res => {
        const fetchedRun = 'agentRun' in res ? res.agentRun : res;
        setRun(fetchedRun);
      })
      .catch(err => {
        console.error('Agent Modal API Error:', err);
      })
      .finally(() => {
        setIsPending(false);
      });
  }, [isOpen, triggerConfig]);

  // If opening in view mode
  useEffect(() => {
    if (isOpen && triggerConfig?.action === 'view' && triggerConfig.runId) {
      if (triggerConfig.triggerId === lastFiredTriggerId.current) return;
      lastFiredTriggerId.current = triggerConfig.triggerId || null;
      
      setIsPending(true);
      apiClient.agent.getRunDetails(triggerConfig.runId)
        .then(res => {
          setRun(res);
          setRevealDone(true);
          setRevealCount(999);
        })
        .finally(() => setIsPending(false));
    }
  }, [isOpen, triggerConfig]);

  const { steps, finalText } = useMemo(() => {
    if (!run) return { steps: [], finalText: null };
    return parseReasoningTrace(run.reasoningTrace);
  }, [run]);

  // Stagger reveal animation
  useEffect(() => {
    if (!run || triggerConfig?.action === 'view') return;
    
    const total = steps.length + (finalText ? 1 : 0);
    if (total === 0) {
      setRevealDone(true);
      return;
    }
    
    if (revealTimer.current) clearInterval(revealTimer.current);
    
    let count = 0;
    setRevealCount(0);
    setRevealDone(false);
    
    revealTimer.current = setInterval(() => {
      count += 1;
      setRevealCount(count);
      if (count >= total) {
        clearInterval(revealTimer.current!);
        setRevealDone(true);
      }
    }, STEP_INTERVAL_MS);
    
    return () => {
      if (revealTimer.current) clearInterval(revealTimer.current);
    };
  }, [run, steps.length, finalText, triggerConfig?.action]);

  // Auto-dismiss 2.5 seconds after reasoning trace is fully revealed
  useEffect(() => {
    if (revealDone && run && triggerConfig?.action !== 'view') {
      const timer = setTimeout(() => {
        closeModal();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [revealDone, run, triggerConfig?.action, closeModal]);

  const findTask = useCallback((r: AgentRun): Task | undefined => {
    try {
      const actions = typeof r.actionsTaken === 'string'
        ? JSON.parse(r.actionsTaken) : r.actionsTaken;
      for (const a of actions || []) {
        const id = a.args?.task_id;
        if (id) { const t = tasks.find(x => x.id === Number(id)); if (t) return t; }
      }
    } catch {}
    const rt = new Date(r.createdAt).getTime();
    return tasks.find(x => Math.abs(new Date(x.createdAt).getTime() - rt) < 60000);
  }, [tasks]);

  const matchedTask = run ? findTask(run) : undefined;
  const isRescue = run?.triggerType === 'rescue_mode';
  const visibleSteps = steps.slice(0, revealCount);
  const showFinal = revealDone && !!finalText;
  const showTyping = run && !revealDone && revealCount < steps.length + (finalText ? 1 : 0);

  const getTitle = () => {
    if (revealDone) {
      return matchedTask ? matchedTask.title : 'Done';
    }
    if (triggerConfig?.action === 'rescue') return 'Emergency Protocol';
    if (triggerConfig?.action === 'prioritize') return 'Routine Sweep';
    if (triggerConfig?.action === 'parse') return 'Working on task...';
    if (triggerConfig?.action === 'view') return 'Agent History';
    return 'Agent Working';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 font-sans">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeModal}
        className="absolute inset-0 bg-[rgba(31,30,28,0.4)] backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl bg-bg-surface border border-border-default"
      >
        <header className="px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-[rgba(245,244,238,0.5)] backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-accent-bg">
                <Bot size={16} className="text-accent" />
              </div>
              {!revealDone && triggerConfig?.action !== 'view' && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-[#A87828] animate-pulse" />
              )}
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-text-primary">{getTitle()}</h2>
              {!revealDone && (
                <p className="text-[10px] font-mono mt-0.5 text-text-tertiary">
                  {isPending ? 'Thinking...' : 'Working...'}
                </p>
              )}
            </div>
          </div>
          
          <button
            onClick={closeModal}
            className="p-1.5 rounded-lg text-text-tertiary hover:bg-panel-muted transition-colors"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isPending && <ThinkingBubble />}
          
          {run && (
            <div className="space-y-6">
              {triggerConfig?.payload && typeof triggerConfig.payload === 'string' && triggerConfig.payload.trim().length > 0 && (
                <div className="flex justify-end">
                  <div className="max-w-[80%] px-4 py-2.5 rounded-2xl text-[12.5px] font-semibold leading-relaxed bg-text-primary text-bg-base shadow-sm">
                    {triggerConfig.payload}
                  </div>
                </div>
              )}

              {isRescue && matchedTask ? (
                <RescueCard task={matchedTask} />
              ) : (
                <div className="bg-bg-base rounded-2xl border border-border-subtle p-5">
                  <div className="flex items-center gap-3 mb-5 border-b border-border-subtle pb-4">
                    <Zap size={14} className="text-accent" />
                    <span className="text-[12px] font-bold text-text-primary uppercase tracking-wide">
                      Execution Trace
                    </span>
                  </div>

                  <div className="px-2 space-y-3 pb-4">
                    <AnimatePresence>
                      {visibleSteps.map((step, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3 }}
                          className="relative"
                        >
                          {/* Nested Retry Sequence Group */}
                          {step.retryGroup && step.retryGroup.length > 0 && (
                            <div className="pl-6 relative ml-[5px] mb-3 border-l-2 border-border-subtle space-y-3 pt-2">
                              {step.retryGroup.map((subStep, idx) => (
                                <StepRow
                                  key={`sub-${idx}`}
                                  toolName={subStep.toolName}
                                  args={subStep.args}
                                  result={subStep.result}
                                  isFirst={false}
                                  isLast={false}
                                  isSubStep={true}
                                />
                              ))}
                            </div>
                          )}

                          {/* Main Step */}
                          <StepRow
                            toolName={step.toolName}
                            args={step.args}
                            result={step.result}
                            isFirst={i === 0 && (!step.retryGroup || step.retryGroup.length === 0)}
                            isLast={i === steps.length - 1 && !finalText && !showTyping}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    
                    {showTyping && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3">
                        <ThinkingBubble />
                      </motion.div>
                    )}
                  </div>

                  <AnimatePresence>
                    {showFinal && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="mt-6 pt-5 border-t border-border-subtle"
                      >
                        <p className="text-[13px] font-medium leading-relaxed text-text-primary whitespace-pre-wrap">
                          {finalText}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </div>
        
        {revealDone && (
          <div className="px-6 py-4 border-t border-border-subtle bg-bg-surface flex justify-end">
            <button
              onClick={closeModal}
              className="px-5 py-2 bg-text-primary text-bg-base text-[12px] font-bold rounded-xl hover:opacity-90 transition-opacity shadow-sm"
            >
              Done — Close
            </button>
          </div>
        )}
      </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
