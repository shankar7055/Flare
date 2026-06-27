import React, { useState, useRef, useEffect } from 'react';
import { useTasks } from '../hooks/useTasks';
import { Plus, Clock, ShieldAlert, Sparkles, Loader, Mic } from 'lucide-react';
import { addHours, format } from 'date-fns';

export const QuickAddTask: React.FC = () => {
  const { createTask } = useTasks();
  
  // States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [activeField, setActiveField] = useState<'title' | 'description'>('title');
  
  // Set default deadline date string to +3 hours from now formatted for datetime-local input
  const defaultDeadline = format(addHours(new Date(), 3), "yyyy-MM-dd'T'HH:mm");
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [estimatedMinutes, setEstimatedMinutes] = useState(60);
  const [priority, setPriority] = useState('medium');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<string>('daily');
  
  // Custom overlay loaders
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  
  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          if (activeField === 'title') {
            setTitle(prev => prev + finalTranscript.trim());
          } else {
            setDescription(prev => prev + finalTranscript.trim());
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [activeField]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !deadline) return;

    setIsEvaluating(true);
    try {
      await createTask({
        title,
        description: description || undefined,
        deadline: new Date(deadline).toISOString(),
        estimated_minutes: Number(estimatedMinutes),
        priority,
        is_recurring: isRecurring,
        recurrence_rule: isRecurring ? recurrenceRule : undefined
      });
      
      // Clear inputs
      setTitle('');
      setDescription('');
      
      // Show agent evaluation banner briefly for demo visual impact
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="rounded-xl p-5 relative overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
      
      {/* Evaluating Overlay */}
      {isEvaluating && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 animate-fade-in text-center" style={{ background: 'var(--bg-surface)', backdropFilter: 'blur(8px)' }}>
          <Loader size={36} className="animate-spin mb-3" style={{ color: 'var(--accent)' }} strokeWidth={1.75} />
          <h3 className="font-bold flex items-center gap-1.5 justify-center font-display" style={{ color: 'var(--text-primary)' }}>
            <Sparkles size={16} strokeWidth={1.75} style={{ color: 'var(--accent)' }} /> Agent evaluating slot allocations...
          </h3>
          <p className="text-xs mt-1 max-w-[220px] font-sans" style={{ color: 'var(--text-secondary)' }}>
            Analyzing calendar slots, resolving priorities, and arranging scheduling events...
          </p>
        </div>
      )}

      {/* Agent Sweep Success Alert */}
      {showBanner && (
        <div className="mb-4 p-3 rounded-xl text-xs flex items-start gap-2.5 animate-slide-in" style={{ background: 'var(--accent-bg)', border: '1px solid var(--border-default)', color: 'var(--accent-text-on-bg)' }}>
          <Sparkles size={16} className="shrink-0 mt-0.5" strokeWidth={1.75} />
          <div className="font-sans">
            <strong className="block font-semibold">Agent Sweep Triggered!</strong>
            The proactive scheduler is scanning for conflicts and fitting the new task in your schedule. Check the activity feed in a few seconds.
          </div>
        </div>
      )}

      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 font-sans" style={{ color: 'var(--text-secondary)' }}>
        <Plus size={16} strokeWidth={1.75} style={{ color: 'var(--accent)' }} /> Quick Add Task
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4 relative z-10 font-sans">
        <div>
          <label className="block text-[10px] font-semibold uppercase mb-2" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.15em' }}>Task Title</label>
          <div className="relative">
            <input
              type="text"
              required
              placeholder="e.g. Prepare Status Slide"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onFocus={() => setActiveField('title')}
              className="w-full pl-10 pr-4 py-2.5 text-sm transition-all duration-250 ease-out focus:outline-none resize-none"
              style={{
                background: 'var(--bg-surface-muted)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-input)',
                color: 'var(--text-primary)'
              }}
            />
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded transition-all"
                style={{
                  background: isListening ? 'var(--accent-bg)' : 'transparent',
                  color: isListening ? 'var(--accent)' : 'var(--text-tertiary)'
                }}
              >
                <Mic size={18} className={isListening ? 'animate-pulse' : ''} />
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase mb-2" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.15em' }}>Description (Optional)</label>
          <div className="relative">
            <textarea
              placeholder="Additional notes for the agent..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onFocus={() => setActiveField('description')}
              rows={2}
              className="w-full pl-10 pr-4 py-2.5 text-sm transition-all duration-250 ease-out focus:outline-none resize-none"
              style={{
                background: 'var(--bg-surface-muted)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-input)',
                color: 'var(--text-primary)'
              }}
            />
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className="absolute left-2 top-3 p-1 rounded transition-all"
                style={{
                  background: isListening ? 'var(--accent-bg)' : 'transparent',
                  color: isListening ? 'var(--accent)' : 'var(--text-tertiary)'
                }}
              >
                <Mic size={18} className={isListening ? 'animate-pulse' : ''} />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-semibold uppercase mb-2" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.15em' }}>Deadline</label>
            <input
              type="datetime-local"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-4 py-2.5 text-sm transition-all duration-250 ease-out focus:outline-none"
              style={{
                background: 'var(--bg-surface-muted)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-input)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase mb-2" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.15em' }}>Est. Duration</label>
            <div className="relative">
              <input
                type="number"
                min={5}
                required
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                className="w-full pl-4 pr-12 py-2.5 text-sm transition-all duration-250 ease-out focus:outline-none"
                style={{
                  background: 'var(--bg-surface-muted)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-input)',
                  color: 'var(--text-primary)'
                }}
              />
              <span className="absolute right-4 top-2.5 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>min</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase mb-2" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.15em' }}>Priority Urgency</label>
          <div className="grid grid-cols-4 gap-2">
            {['low', 'medium', 'high', 'critical'].map((p) => {
              const isActive = priority === p;
              let style = {
                background: 'var(--bg-surface-muted)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)'
              };
              if (isActive) {
                if (p === 'critical') style = { background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)' };
                else if (p === 'high') style = { background: 'var(--warning-bg)', border: '1px solid var(--warning)', color: 'var(--warning)' };
                else if (p === 'medium') style = { background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' };
                else style = { background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' };
              }
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className="py-2 text-xs font-medium uppercase rounded-full text-center transition-all duration-250 ease-out"
                  style={style}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase mb-2" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.15em' }}>Repeats</label>
          <div className="grid grid-cols-4 gap-2">
            {['none', 'daily', 'weekdays', 'weekly'].map((r) => {
              const isActive = (r === 'none' && !isRecurring) || (r !== 'none' && isRecurring && recurrenceRule === r);
              let style = {
                background: 'var(--bg-surface-muted)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)'
              };
              if (isActive) {
                style = { background: 'var(--accent-bg)', border: '1px solid var(--border-default)', color: 'var(--accent)' };
              }
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    if (r === 'none') {
                      setIsRecurring(false);
                    } else {
                      setIsRecurring(true);
                      setRecurrenceRule(r);
                    }
                  }}
                  className="py-2 text-xs font-medium uppercase rounded-full text-center transition-all duration-250 ease-out"
                  style={style}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={isEvaluating}
          className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold transition-all duration-250 ease-out disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          style={{
            background: 'var(--accent)',
            color: '#FFFFFF',
            borderRadius: 'var(--radius-button)',
            padding: '10px 16px'
          }}
        >
          {isEvaluating ? (
            <Loader size={16} strokeWidth={1.75} className="animate-spin" />
          ) : (
            <Plus size={16} strokeWidth={1.75} />
          )}
          {isEvaluating ? 'Submitting...' : 'Create and Submit to Agent'}
        </button>
      </form>
    </div>
  );
};
