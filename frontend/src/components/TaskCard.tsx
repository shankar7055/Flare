import React, { useState } from 'react';
import { apiClient } from '../api/client';
import type { Task } from '../api/client';
import { useTasks } from '../hooks/useTasks';
import { useAgentModal } from '../context/AgentModalContext';
import { format, formatDistanceToNow, isAfter } from 'date-fns';
import { Play, Check, AlertTriangle, MessageSquare, Trash2, Calendar, ShieldAlert, Bot, X } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  isRescueTerritory: boolean;
  isCompact?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, isRescueTerritory, isCompact = false }) => {
  const { updateTask, deleteTask, submitFeedback } = useTasks();
  const { openModal } = useAgentModal();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [completedOnTime, setCompletedOnTime] = useState(true);
  const [reminderHelpful, setReminderHelpful] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Inline confirm for deletion
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleStart = async () => {
    try {
      await updateTask({
        id: task.id,
        payload: {
          status: 'in_progress',
          started_at: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleComplete = async () => {
    try {
      await updateTask({
        id: task.id,
        payload: {
          status: 'completed',
          completed_at: new Date().toISOString(),
        },
      });
      setShowFeedbackModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRescueTrigger = () => {
    openModal({ action: 'rescue', taskId: task.id });
  };

  const handleDeleteClick = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 2000);
    } else {
      executeDelete();
    }
  };

  const executeDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTask(task.id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await submitFeedback({
        id: task.id,
        payload: { completed_on_time: completedOnTime, reminder_helpful: reminderHelpful }
      });
      setShowFeedbackModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'critical':
        return <span className="px-2.5 py-1 text-[9px] font-semibold rounded-full tracking-wider" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', letterSpacing: '0.15em' }}>CRITICAL</span>;
      case 'high':
        return <span className="px-2.5 py-1 text-[9px] font-semibold rounded-full tracking-wider" style={{ background: 'var(--warning-bg)', color: 'var(--warning)', letterSpacing: '0.15em' }}>HIGH</span>;
      case 'medium':
        return <span className="px-2.5 py-1 text-[9px] font-semibold rounded-full tracking-wider" style={{ background: 'var(--bg-surface-muted)', color: 'var(--text-secondary)', letterSpacing: '0.15em' }}>MEDIUM</span>;
      default:
        return <span className="px-2.5 py-1 text-[9px] font-semibold rounded-full tracking-wider" style={{ background: 'var(--bg-surface-muted)', color: 'var(--text-secondary)', letterSpacing: '0.15em' }}>LOW</span>;
    }
  };

  const deadlineDate = new Date(task.deadline);
  const isOverdue = !task.completedAt && isAfter(new Date(), deadlineDate);
  const hasActiveSlot = task.status !== 'completed' && task.status !== 'overdue' && task.startedAt === null;

  if (isCompact) {
    return (
      <div className="p-3 rounded-lg transition-all duration-250 ease-out flex items-center justify-between gap-3 group" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <Check size={14} className="shrink-0" strokeWidth={1.75} style={{ color: 'var(--success)' }} />
          <span className="font-medium text-sm line-through truncate" style={{ color: 'var(--text-tertiary)' }}>
            {task.title}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-sans font-medium" style={{ color: 'var(--text-tertiary)' }}>
            {task.completedAt ? format(new Date(task.completedAt), 'MMM d, h:mma') : 'Completed'}
          </span>
          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className={`p-1.5 rounded-lg transition-all duration-250 ease-out ${
              confirmDelete ? 'text-danger' : 'opacity-0 group-hover:opacity-100'
            }`}
            style={{
              background: confirmDelete ? 'var(--danger-bg)' : 'transparent',
              color: confirmDelete ? 'var(--danger)' : 'var(--text-tertiary)'
            }}
            title="Delete Task"
          >
            {confirmDelete ? <Check size={13} strokeWidth={1.75} /> : <Trash2 size={13} strokeWidth={1.75} />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-5 rounded-xl transition-all duration-300 ease-out group hover:-translate-y-0.5 hover:shadow-md ${
      task.status === 'completed' ? 'opacity-60 hover:opacity-100' : ''
    } ${isRescueTerritory 
      ? 'border-l-[3px]' 
      : ''
    }`}
    style={{
      background: 'var(--bg-surface)',
      border: isRescueTerritory ? '1px solid var(--border-default)' : '1px solid var(--border-default)',
      borderLeftColor: isRescueTerritory ? 'var(--danger)' : 'var(--border-default)',
      color: 'var(--text-primary)'
    }}>
      
      {/* Upper header: Title & Badges */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold font-display text-base truncate ${
            task.status === 'completed' ? 'line-through' : ''
          }`}
          style={{ color: task.status === 'completed' ? 'var(--text-tertiary)' : 'var(--text-primary)' }}
          >{task.title}</h3>
          
          {task.description && (
            <p className="text-xs mt-1 font-sans line-clamp-2 leading-relaxed pr-2" style={{ color: 'var(--text-secondary)' }}>{task.description}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0 ml-auto">
          {getPriorityBadge(task.priority)}
          {isRescueTerritory && (
            <span className="flex items-center gap-1 px-2 py-1 text-[9px] font-semibold rounded-full tracking-wider" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', letterSpacing: '0.15em' }}>
              <ShieldAlert size={10} strokeWidth={1.75} /> RESCUE
            </span>
          )}
        </div>
      </div>

      {/* Info labels */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] mb-4" style={{ color: 'var(--text-secondary)' }}>
        <div className="flex items-center gap-2">
          <Calendar size={12} strokeWidth={1.75} style={{ color: 'var(--text-tertiary)' }} />
          <span className="font-sans">Due: <strong className={isOverdue ? 'font-semibold' : 'font-medium'} style={{ color: isOverdue ? 'var(--danger)' : 'var(--text-primary)' }}>
            {format(deadlineDate, 'MMM d, h:mm a')}
          </strong></span>
        </div>
        <div className="flex items-center gap-1.5 justify-end text-right">
          <span className="font-sans shrink-0"><strong style={{ color: isOverdue ? 'var(--danger)' : 'var(--text-primary)' }}>
            {isOverdue ? 'Overdue' : formatDistanceToNow(deadlineDate, { addSuffix: true })}
          </strong></span>
        </div>
      </div>

      {/* Status Badges Row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="px-2.5 py-1 text-[10px] font-semibold rounded-full uppercase font-sans" style={{ background: 'var(--bg-surface-muted)', color: 'var(--text-secondary)', letterSpacing: '0.15em' }}>
          Est: {task.estimatedMinutes}m
        </span>
        <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full uppercase font-sans ${
          task.status === 'completed' 
            ? '' 
            : task.status === 'in_progress' 
              ? '' 
              : task.status === 'pending'
                ? ''
                : ''
        }`}
        style={{
          background: task.status === 'completed' ? 'var(--success-bg)' : task.status === 'in_progress' ? 'var(--accent-bg)' : task.status === 'pending' ? 'var(--warning-bg)' : 'var(--danger-bg)',
          color: task.status === 'completed' ? 'var(--success)' : task.status === 'in_progress' ? 'var(--accent-text-on-bg)' : task.status === 'pending' ? 'var(--warning)' : 'var(--danger)',
          letterSpacing: '0.15em'
        }}>
          {task.status.replace('_', ' ')}
        </span>
        {hasActiveSlot && (
          <span className="px-2.5 py-1 text-[10px] font-semibold rounded-full uppercase flex items-center gap-1 font-sans" style={{ background: 'var(--bg-surface-muted)', color: 'var(--text-secondary)', letterSpacing: '0.15em' }}>
            <Check size={10} strokeWidth={1.75} /> Scheduled
          </span>
        )}
      </div>

      {/* Action buttons Row */}
      <div className="flex items-center justify-between pt-4 gap-2" style={{ borderTop: '1px solid var(--border-default)' }}>
        <div className="flex items-center">
          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className={`p-1.5 rounded-lg flex items-center gap-1 text-[11px] font-medium transition-all duration-250 ease-out ${
              confirmDelete ? '' : ''
            }`}
            style={{
              background: confirmDelete ? 'var(--danger-bg)' : 'transparent',
              color: confirmDelete ? 'var(--danger)' : 'var(--text-tertiary)',
              border: confirmDelete ? '1px solid var(--danger)' : '1px solid transparent'
            }}
            title="Delete Task"
          >
            {confirmDelete ? (
              <>
                <Check size={12} strokeWidth={1.75} />
                Confirm
              </>
            ) : (
              <Trash2 size={13} strokeWidth={1.75} />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {task.status === 'pending' && (
            <>
              <button
                onClick={() => openModal({ action: 'parse', payload: `Please break down and schedule my task: "${task.title}"` })}
                className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-lg transition-all duration-250 ease-out font-sans"
                style={{
                  background: 'var(--bg-surface-muted)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)'
                }}
              >
                <Bot size={12} strokeWidth={1.75} /> Auto-Plan
              </button>
              <button
                onClick={handleStart}
                className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-lg transition-all duration-250 ease-out font-sans"
                style={{
                  background: 'var(--accent)',
                  color: '#FFFFFF'
                }}
              >
                <Play size={10} fill="currentColor" strokeWidth={1.75} /> Start
              </button>
            </>
          )}

          {task.status === 'in_progress' && (
            <button
              onClick={handleComplete}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-lg transition-all duration-250 ease-out font-sans"
              style={{
                background: 'var(--success)',
                color: '#FFFFFF'
              }}
            >
              <Check size={12} strokeWidth={1.75} /> Complete
            </button>
          )}

          {isRescueTerritory && !task.rescuePlans?.length && (
            <button
              onClick={handleRescueTrigger}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-lg transition-all duration-250 ease-out font-sans"
              style={{
                background: 'var(--danger)',
                color: '#FFFFFF'
              }}
            >
              <AlertTriangle size={12} strokeWidth={1.75} /> Rescue
            </button>
          )}

          {task.status === 'completed' && (
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-lg transition-all duration-250 ease-out font-sans"
              style={{
                background: 'transparent',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)'
              }}
            >
              <MessageSquare size={12} strokeWidth={1.75} /> Feedback
            </button>
          )}
        </div>
      </div>

      {/* In-Line Feedback Modal Overlay */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-panel p-5 shadow-xl animate-slide-in">
            <h4 className="text-base font-bold font-display text-text-primary mb-2">Agent Feedback Request</h4>
            <p className="text-xs text-text-secondary mb-4 font-sans">
              Help your AI assistant optimize future conflict sweeps and scheduling alerts.
            </p>

            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div>
                <label className="flex items-center gap-2 cursor-pointer select-none font-sans">
                  <input
                    type="checkbox"
                    checked={completedOnTime}
                    onChange={(e) => setCompletedOnTime(e.target.checked)}
                    className="rounded border-border bg-panel text-accent focus:ring-accent/30 focus:ring-offset-background"
                  />
                  <span className="text-sm text-text-primary">Completed on time?</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer select-none font-sans">
                  <input
                    type="checkbox"
                    checked={reminderHelpful}
                    onChange={(e) => setReminderHelpful(e.target.checked)}
                    className="rounded border-border bg-panel text-accent focus:ring-accent/30 focus:ring-offset-background"
                  />
                  <span className="text-sm text-text-primary">Were notifications helpful?</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-panel-muted text-text-secondary hover:bg-panel-muted/80 transition-all font-sans"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-accent text-white hover:bg-accent/90 transition-all font-sans"
                >
                  {isSubmitting ? 'Submitting...' : 'Save Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
