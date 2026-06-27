import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export const useAgentRuns = (isPollingEnabled: boolean = true) => {
  const queryClient = useQueryClient();

  const runsQuery = useQuery({
    queryKey: ['agent-runs'],
    queryFn: apiClient.agent.getRuns,
    refetchInterval: isPollingEnabled ? 6000 : false, // Poll every 6 seconds if enabled
  });

  const triggerAgentMutation = useMutation({
    mutationFn: apiClient.agent.triggerAgent,
    onSuccess: (newRun) => {
      // Invalidate runs and task data so they reload
      queryClient.invalidateQueries({ queryKey: ['agent-runs'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const triggerRescueMutation = useMutation({
    mutationFn: (taskId: number) => apiClient.agent.triggerRescue(taskId),
    onSuccess: (newRun) => {
      queryClient.invalidateQueries({ queryKey: ['agent-runs'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    runsQuery,
    triggerAgent: triggerAgentMutation.mutateAsync,
    isTriggering: triggerAgentMutation.isPending,
    triggerRescue: triggerRescueMutation.mutateAsync,
    isTriggeringRescue: triggerRescueMutation.isPending,
  };
};

export const useAgentRunDetails = (id: number) => {
  return useQuery({
    queryKey: ['agent-run', id],
    queryFn: () => apiClient.agent.getRunDetails(id),
    enabled: !!id,
  });
};
