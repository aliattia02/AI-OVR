import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { incidentService } from '../services/incidents';

export function useIncidents(params = {}) {
  const { page = 0, pageSize = 20 } = params;
  const skip = page * pageSize;
  return useQuery({
    queryKey: ['incidents', { page, pageSize }],
    queryFn: () => incidentService.getAll({ skip, limit: pageSize }),
    throwOnError: true,   // ← forces React Query to surface errors
    retry: 1,
  });
}
export function useIncident(id) {
  return useQuery({
    queryKey: ['incident', id],
    queryFn: () => incidentService.getById(id),
    enabled: Boolean(id),
  });
}

export function useCreateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => incidentService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
}

export function useUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, newStatus }) => incidentService.updateStatus(id, newStatus),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incidents', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['incident', variables.id] });
    },
  });
}

export function useSaveAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, sev, prob }) => incidentService.saveAssessment(id, sev, prob),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incident', variables.id] });
    },
  });
}

export function useAIFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, sug, chosen }) => incidentService.submitAIFeedback(id, sug, chosen),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incident', variables.id] });
    },
  });
}

export function useSaveJCIFields() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => incidentService.saveJCIFields(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incident', variables.id] });
    },
  });
}