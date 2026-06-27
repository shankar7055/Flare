"import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../hooks/useTasks';
import { useAgentRuns } from '../hooks/useAgentRuns';
import { format, isAfter, isToday } from 'date-fns';
import { 
  Sparkles, MoreHorizontal, Search, RefreshCw 
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const { tasksQuery, parseTask, isParsing } = useTasks();
  const { runsQuery, triggerAgent, isTriggering } = useAgentRuns(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');

  const tasks = tasksQuery.data || [];

  // Extract first name from full name
  const firstName = user?.name ? user.name.split(' ')[0] : 'Sam';

  // Task territory checks
  const isRescueTerritory = (task: typeof tasks[0]) => {
    if (task.status === 'completed' || task.status === 'overdue') return false;
    const remMins = (new Date(task.deadline).getTime() - Date.now()) / (60 * 1000);
    const limit = Math.max(120, task.estimatedMinutes);
    return remMins <= limit;
  };

  const getTaskBadges = (t: typeof tasks[0]) => {
    const isOver = !t.completedAt && isAfter(new Date(), new Date(t.deadline));
    const isTodayTask = isToday(new Date(t.deadline));
    const isRescue = isRescueTerritory(t);
    
    const badges: React.ReactNode[] = [];
    
    // Status Badge
    if (t.status === 'completed') {
      badges.push(
        <span key="completed" className="px-2.5 py-0.5 text-[9px] font-bold rounded bg-success-bg text-success border border-success/15 uppercase tracking-wider font-mono">
          Completed
        </span>
      );
    } else if (t.status === 'in_progress') {
      badges.push(
        <span key="in_progress" className="px-2.5 py-0.5 text-[9px] font-bold rounded bg-accent-bg text-accent-text border border-accent/15 uppercase tracking-wider font-mono">
          In progress
        </span>
      );
    } else
<truncated 17543 bytes>