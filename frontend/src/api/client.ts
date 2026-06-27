export interface User {
  id: number;
  email: string;
  name: string;
  timezone: string;
  preferred_channel: string;
  working_hours_start: string | null;
  working_hours_end: string | null;
  google_calendar_connected: boolean;
  created_at: string;
}

export interface Task {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  deadline: string;
  estimatedMinutes: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  parentTaskId: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  streakCount: number;
  lastCompletedDate: string | null;
  // If populated via relations
  rescuePlans?: RescuePlan[];
}

export interface RescuePlan {
  id: number;
  taskId: number;
  generatedAt: string;
  steps: string; // JSON string in DB, but let's parse it if needed
  notified: boolean;
}

export interface RescuePlanStep {
  start_time: string; // ISO or relative description
  action: string;
  duration_minutes: number;
}

export interface AgentRun {
  id: number;
  userId: number;
  triggerType: 'periodic_sweep' | 'deadline_proximity' | 'new_task' | 'calendar_change' | 'rescue_mode' | 'manual';
  reasoningTrace: any[]; // Parsed JSON
  actionsTaken: any[];    // Parsed JSON
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO date-time
  end: string;   // ISO date-time
  source: 'google_calendar' | 'database';
}

export interface NotificationLog {
  id: number;
  taskId: number;
  userId: number;
  sentAt: string;
  channel: 'email' | 'sms' | 'push';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  userResponse: string | null;
  task?: Task;
}

// Global In-Memory Token Reference
let authToken: string | null = null;

export const setClientToken = (token: string | null) => {
  authToken = token;
};

export const getClientToken = () => authToken;

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }
  
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    throw new ApiError(data.error || 'Network request failed', response.status);
  }

  return data as T;
}

export const apiClient = {
  auth: {
    signup: (payload: any) => request<any>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    login: (payload: any) => request<{ access_token: string; token_type: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    getMe: () => request<User>('/auth/me'),
    getGoogleAuthUrl: () => request<{ url: string }>('/auth/google/url'),
  },
  tasks: {
    getTasks: (status?: string) => {
      const query = status ? `?status=${status}` : '';
      return request<Task[]>(`/tasks${query}`);
    },
    getTaskDetails: (id: number) => request<Task>(`/tasks/${id}`),
    createTask: (payload: {
      title: string;
      description?: string;
      deadline: string;
      estimated_minutes?: number;
      priority?: string;
      is_recurring?: boolean;
      recurrence_rule?: string;
    }) => request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    updateTask: (id: number, payload: Partial<{
      title: string;
      description: string | null;
      deadline: string;
      estimated_minutes: number;
      priority: string;
      status: string;
      started_at: string | null;
      completed_at: string | null;
      is_recurring: boolean;
      recurrence_rule: string | null;
    }>) => request<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
    deleteTask: (id: number) => request<void>(`/tasks/${id}`, {
      method: 'DELETE',
    }),
    submitFeedback: (id: number, payload: { completed_on_time: boolean; reminder_helpful: boolean }) =>
      request<{ success: boolean; message?: string }>(`/tasks/${id}/feedback`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    parseTask: (text: string) =>
      request<{ task: Task; agentRun: AgentRun }>('/tasks/parse', {
        method: 'POST',
        body: JSON.stringify({ text }),
      }),
  },
  agent: {
    getRuns: () => request<AgentRun[]>('/agent/runs'),
    getRunDetails: (id: number) => request<AgentRun>(`/agent/runs/${id}`),
    triggerAgent: () => request<AgentRun>('/agent/run', { method: 'POST' }),
    triggerRescue: (taskId: number) => request<AgentRun>(`/agent/run-rescue/${taskId}`, { method: 'POST' }),
    getPatterns: () => request<any>('/agent/patterns'),
  },
  calendar: {
    getEvents: (days?: number) => {
      const query = days ? `?days=${days}` : '';
      return request<CalendarEvent[]>(`/calendar/events${query}`);
    },
  },
  notifications: {
    getLogs: () => request<NotificationLog[]>('/notifications'),
  },
};
