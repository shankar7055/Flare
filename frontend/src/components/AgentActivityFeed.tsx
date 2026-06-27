import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAgentRuns } from '../hooks/useAgentRuns';
import { AgentRunEntry } from './AgentRunEntry';
import { Bot, Play, Zap, RefreshCw, HelpCircle, ChevronDown, ChevronUp, AlertTriangle, Clock } from 'lucide-react';
import type { AgentRun } from '../api/client';
import { format, formatDistanceToNow } from 'date-fns';

// Helper to analyze failures in a run
const getRunFailureInfo = (run: AgentRun) => {
  let isFailure = false;
  let errorMessage = '';

  if (run.reasoningTrace) {
    try {
      const trace = Array.isArray(run.reasoningTrace)
        ? run.reasoningTrace
        : JSON.parse(run.reasoningTrace as any);

      trace.forEach((turn: any) => {
        const isSystem = turn.role === 'system';
        let textVal = '';
        if (turn.parts) {
          turn.parts.forEach((part: any) => {
            if (part.text) {
              textVal += part.text;
            }
          });
        }

        const hasErrorKeyword = textVal.includes("Error calling Gemini") ||
                               textVal.includes("GoogleGenAIError") ||
                               textVal.toLowerCase().includes("api error") ||
                               textVal.includes('"error"');

        if (isSystem || hasErrorKeyword) {
          isFailure = true;
          if (textVal.startsWith("Error calling Gemini:")) {
            errorMessage = textVal.replace("Error calling Gemini:", "").trim();
          } else {
            errorMessage = textVal.trim();
          }
        }
      });
    } catch (e) {
      // fallback
    }
  }

  let errorGroupKey = '';
  if (isFailure) {
    const lower = errorMessage.toLowerCase();
    if (lower.includes("429") || lower.includes("quota") || lower.includes("rate limit") || lower.includes("resourceexhausted")) {
      errorGroupKey = "rate_limit";
    } else if (lower.includes("503") || lower.includes("unavailable") || lower.includes("overloaded")) {
      errorGroupKey = "service_unavailable";
    } else if (lower.includes("api key") || lower.includes("401") || lower.includes("auth")) {
      errorGroupKey = "auth_error";
    } else {
      errorGroupKey = errorMessage;
    }
  }

  let actionsCount = 0;
  if (run.actionsTaken) {
    try {
      const actions = typeof run.actionsTaken === 'string'
        ? JSON.parse(run.actionsTaken)
        : run.actionsTaken;
      actionsCount = Array.isArray(actions) ? actions.length : 0;
    } catch (e) {}
  }

  return {
    isFailure,
    errorMessage,
    errorGroupKey,
    hasActions: actionsCount > 0
  };
};

interface CollapsedFailuresEntryProps {
  runs: AgentRun[];
  errorMessage: string;
  errorGroupKey: string;
}

const CollapsedFailuresEntry: React.FC<CollapsedFailuresEntryProps> = ({ runs, errorMessage, errorGroupKey }) => {
  const [expanded, setExpanded] = useState(false);

  let errorLabel = "API execution failure";
  if (errorGroupKey === 'rate_limit') {
    errorLabel = "Rate limited (Google quota limit)";
  } else if (errorGroupKey === 'service_unavailable') {
    errorLabel = "AI service temporarily overloaded (503)";
  } else if (errorGroupKey === 'auth_error') {
    errorLabel = "API Authentication error";
  } else if (errorMessage) {
    errorLabel = errorMessage.length > 60 ? errorMessage.substring(0, 60) + "..." : errorMessage;
  }

  const latestRun = runs[0];
  const lastTime = format(new Date(latestRun.createdAt), 'h:mm a');

  const dotColor = errorGroupKey === 'rate_limit' || errorGroupKey === 'service_unavailable'
    ? 'bg-warning animate-pulse'
    : 'bg-danger';

  const borderColor = errorGroupKey === 'rate_limit' || errorGroupKey === 'service_unavailable'
    ? 'border-l-warning bg-warning-bg/5'
    : 'border-l-danger bg-danger-bg/5';

  return (
    <div className={`rounded-xl border border-l-[3px] transition-all duration-300 overflow-hidden ${borderColor}`}
    style={{ borderColor: 'var(--border-default)' }}>
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none transition-all duration-250 ease-out"
        style={{ background: 'transparent' }}
      >
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
          <div className="font-sans">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)', letterSpacing: '0.15em' }}>
                {runs.length} Runs Failed
              </span>
              <span className="text-xs font-bold text-text-secondary font-display">
                {errorLabel} <span className="font-sans font-normal text-text-tertiary">(last sweep at {lastTime})</span>
              </span>
            </div>
          </div>
        </div>
        <button className="text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1 text-[11px] font-bold font-sans">
          <span>{expanded ? 'Hide Details' : 'Show Details'}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="border-t p-4 font-sans text-xs space-y-3" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface-muted)', color: 'var(--text-secondary)' }}>
          <p className="font-semibold text-text-primary flex items-center gap-1">
            <AlertTriangle size={13} className="text-warning" />
            Failure timeline loop:
          </p>
          <div className="space-y-1.5 pl-3 border-l border-border-default/60">
            {runs.map((r) => {
              const runTime = format(new Date(r.createdAt), 'yyyy-MM-dd h:mm:ss a');
              const relTime = formatDistanceToNow(new Date(r.createdAt), { addSuffix: true });
              return (
                <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-border-subtle/30 last:border-0 font-mono text-[10px]">
                  <div>
                    <span className="font-bold text-text-primary">Run #{r.id}</span>
                    <span className="mx-1.5 text-text-tertiary">•</span>
                    <span className="text-text-secondary">Trigger: {r.triggerType}</span>
                  </div>
                  <div className="text-text-tertiary flex items-center gap-1">
                    <Clock size={10} />
                    <span>{runTime} ({relTime})</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bg-panel-muted border border-border-subtle rounded-lg p-2.5 mt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-1">Raw Error Message</p>
            <pre className="font-mono text-[10px] text-danger overflow-x-auto whitespace-pre-wrap max-h-[80px]">
              {errorMessage}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

interface CollapsedGroup {
  type: 'collapsed';
  runs: AgentRun[];
  errorGroupKey: string;
  errorMessage: string;
}

interface SingleItem {
  type: 'single';
  run: AgentRun;
}

type FeedItem = SingleItem | CollapsedGroup;

const groupRuns = (runsList: AgentRun[], highlightRunId: number | null): FeedItem[] => {
  const result: FeedItem[] = [];
  let currentGroup: AgentRun[] = [];
  let currentGroupKey = '';
  let currentErrorMessage = '';

  for (let i = 0; i < runsList.length; i++) {
    const run = runsList[i];
    const info = getRunFailureInfo(run);

    if (info.isFailure && !info.hasActions && info.errorGroupKey && run.id !== highlightRunId) {
      if (currentGroup.length === 0) {
        currentGroup.push(run);
        currentGroupKey = info.errorGroupKey;
        currentErrorMessage = info.errorMessage;
      } else if (info.errorGroupKey === currentGroupKey) {
        currentGroup.push(run);
      } else {
        if (currentGroup.length > 1) {
          result.push({
            type: 'collapsed',
            runs: [...currentGroup],
            errorGroupKey: currentGroupKey,
            errorMessage: currentErrorMessage
          });
        } else {
          result.push({
            type: 'single',
            run: currentGroup[0]
          });
        }
        currentGroup = [run];
        currentGroupKey = info.errorGroupKey;
        currentErrorMessage = info.errorMessage;
      }
    } else {
      if (currentGroup.length > 0) {
        if (currentGroup.length > 1) {
          result.push({
            type: 'collapsed',
            runs: [...currentGroup],
            errorGroupKey: currentGroupKey,
            errorMessage: currentErrorMessage
          });
        } else {
          result.push({
            type: 'single',
            run: currentGroup[0]
          });
        }
        currentGroup = [];
        currentGroupKey = '';
        currentErrorMessage = '';
      }
      result.push({
        type: 'single',
        run
      });
    }
  }

  if (currentGroup.length > 0) {
    if (currentGroup.length > 1) {
      result.push({
        type: 'collapsed',
        runs: [...currentGroup],
        errorGroupKey: currentGroupKey,
        errorMessage: currentErrorMessage
      });
    } else {
      result.push({
        type: 'single',
        run: currentGroup[0]
      });
    }
  }

  return result;
};


export const AgentActivityFeed: React.FC = () => {
  const [searchParams] = useSearchParams();
  const highlightRunId = searchParams.get('runId') ? parseInt(searchParams.get('runId')!) : null;
  const [demoMode, setDemoMode] = useState(true);
  const [animatingRun, setAnimatingRun] = useState<AgentRun | null>(null);
  const [animatedStepLimit, setAnimatedStepLimit] = useState(0);
  const [totalStepsCount, setTotalStepsCount] = useState(0);

  // Disable automatic queries polling while faking the typing stagger reveal
  const isPollingEnabled = !animatingRun;
  const { runsQuery, triggerAgent, isTriggering } = useAgentRuns(isPollingEnabled);

  const handleTriggerAgent = async () => {
    if (isTriggering || animatingRun) return;

    try {
      const run = await triggerAgent();

      if (demoMode && run.reasoningTrace && run.reasoningTrace.length > 0) {
        // Start client-side typing stagger animation
        setAnimatingRun(run);
        setAnimatedStepLimit(1);

        // Calculate total count of sub-steps (thoughts, calls, responses)
        let totalCount = 0;
        run.reasoningTrace.forEach((turn: any) => {
          if (turn.parts) {
            turn.parts.forEach((p: any) => {
              if (p.text && p.text.trim()) totalCount++;
              if (p.functionCall) totalCount++;
            });
          }
          if (turn.role === 'user' && turn.parts) {
            turn.parts.forEach((p: any) => {
              if (p.functionResponse) totalCount++;
            });
          }
        });
        setTotalStepsCount(totalCount);
      }
    } catch (err) {
      console.error("Failed to run agent sweep", err);
    }
  };

  useEffect(() => {
    if (!animatingRun) return;

    const timer = setInterval(() => {
      setAnimatedStepLimit((prev) => {
        if (prev >= totalStepsCount) {
          clearInterval(timer);
          // Animation finished — wait 1.5s then clear the animating status
          setTimeout(() => {
            setAnimatingRun(null);
            setAnimatedStepLimit(0);
          }, 1500);
          return prev;
        }
        return prev + 1;
      });
    }, 500); // 500ms delay per log step

    return () => clearInterval(timer);
  }, [animatingRun, totalStepsCount]);

  const runs = runsQuery.data || [];
  const isLoading = runsQuery.isLoading;

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-base)' }}>
      {/* Controls Header */}
      <div className="p-5 rounded-t-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)' }}>
        <div className="flex items-center gap-2.5">
          <Bot size={20} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
          <div>
            <h2 className="text-lg font-semibold font-display" style={{ color: 'var(--text-primary)' }}>Agent Activity Feed</h2>
            <p className="text-[10px] font-medium uppercase font-sans" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.15em' }}>GEMINI REASONING LOOP</p>
          </div>
        </div>

        {/* Action button and configs */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Demo Mode Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium px-3 py-2 rounded-lg transition-all duration-250 ease-out" style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)' }}>
            <input
              type="checkbox"
              checked={demoMode}
              onChange={(e) => setDemoMode(e.target.checked)}
              className="rounded"
              style={{ accentColor: 'var(--accent)' }}
            />
            <span className="flex items-center gap-1 font-mono">
              Demo Stagger <HelpCircle size={11} strokeWidth={1.75} style={{ color: 'var(--text-tertiary)' }} />
            </span>
          </label>

          <button
            onClick={handleTriggerAgent}
            disabled={isTriggering || !!animatingRun}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-all duration-250 ease-out"
            style={{
              background: isTriggering || animatingRun ? 'var(--bg-surface-muted)' : 'var(--accent)',
              color: isTriggering || animatingRun ? 'var(--text-tertiary)' : '#FFFFFF',
              border: '1px solid var(--border-default)',
              cursor: isTriggering || animatingRun ? 'not-allowed' : 'pointer'
            }}
          >
            {isTriggering ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Sweep Pending...
              </>
            ) : animatingRun ? (
              <>
                <Zap size={14} className="text-warning animate-bounce" /> Thinking...
              </>
            ) : (
              <>
                <Play size={12} fill="currentColor" /> Trigger Agent Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main logs space */}
      <div className="flex-1 p-5 pb-24 rounded-b-2xl overflow-y-auto max-h-[600px] min-h-[400px]" style={{ background: 'var(--bg-surface)' }}>
        {/* Active Animated Run Display */}
        {animatingRun && (
          <div className="border-l-[3px] rounded-xl p-0.5 mb-4" style={{ borderColor: 'var(--accent)', background: 'var(--bg-surface-muted)' }}>
            <div className="text-[10px] font-semibold uppercase px-4 pt-3 flex items-center gap-1 font-sans" style={{ color: 'var(--accent)', letterSpacing: '0.15em' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ background: 'var(--accent)' }} /> Real-time reasoning replay
            </div>
            <AgentRunEntry
              run={animatingRun}
              animate={true}
              defaultOpen={true}
            />
          </div>
        )}

        {isLoading && runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12" style={{ color: 'var(--text-tertiary)' }}>
            <RefreshCw size={24} className="animate-spin mb-3" strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
            <p className="text-xs font-sans">Loading execution runs history...</p>
          </div>
        ) : runs.length === 0 && !animatingRun ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-xl" style={{ color: 'var(--text-tertiary)', border: '1px dashed var(--border-default)', background: 'var(--bg-surface-muted)' }}>
            <Bot size={32} className="mb-3" strokeWidth={1.75} style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-sm font-medium font-sans" style={{ color: 'var(--text-secondary)' }}>No agent runs recorded</p>
            <p className="text-xs mt-1 max-w-[200px] text-center font-sans" style={{ color: 'var(--text-tertiary)' }}>
              Trigger a manual sync or add a new task to seed the activity log.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Filter out the animating run from the main historical list if it's already shown at the top */}
            {groupRuns(runs.filter(r => !animatingRun || r.id !== animatingRun.id), highlightRunId).map((item, index) => {
              if (item.type === 'collapsed') {
                return (
                  <CollapsedFailuresEntry
                    key={`collapsed-${item.runs[0].id}-${item.runs.length}`}
                    runs={item.runs}
                    errorMessage={item.errorMessage}
                    errorGroupKey={item.errorGroupKey}
                  />
                );
              }
              return (
                <AgentRunEntry
                  key={item.run.id}
                  run={item.run}
                  defaultOpen={highlightRunId ? item.run.id === highlightRunId : (index === 0 && !animatingRun)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
