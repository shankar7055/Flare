import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export const useTasks = (status?: string) => {
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: ['tasks', status],
    queryFn: () => apiClient.tasks.getTasks(status),
  });

  const createTaskMutation = useMutation({
    mutationFn: apiClient.tasks.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['agent-runs'] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      apiClient.tasks.updateTask(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['agent-runs'] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: apiClient.tasks.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['agent-runs'] });
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { completed_on_time: boolean; reminder_helpful: boolean } }) =>
      apiClient.tasks.submitFeedback(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const parseTaskMutation = useMutation({
    mutationFn: apiClient.tasks.parseTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['agent-runs'] });
    },
  });

  return {
    tasksQuery,
    createTask: createTaskMutation.mutateAsync,
    isCreating: createTaskMutation.isPending,
    updateTask: updateTaskMutation.mutateAsync,
    isUpdating: updateTaskMutation.isPending,
    deleteTask: deleteTaskMutation.mutateAsync,
    isDeleting: deleteTaskMutation.isPending,
    submitFeedback: feedbackMutation.mutateAsync,
    isSubmittingFeedback: feedbackMutation.isPending,
    parseTask: parseTaskMutation.mutateAsync,
    isParsing: parseTaskMutation.isPending,
  };
};

export const useTaskDetails = (id: number) => {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => apiClient.tasks.getTaskDetails(id),
    enabled: !!id,
  });
};
