import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { incidentService } from '../services/incidents';

export function useIncidents(params = {}) {
  return useQuery({
    queryKey: ['incidents', params],
    queryFn: () => incidentService.getAll(params),
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
    mutationFn: ({ id, severity, probability, sev, prob }) =>
      incidentService.saveAssessment(id, severity ?? sev, probability ?? prob),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incident', variables.id] });
    },
  });
}

export function useAIFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, suggestion, sug, chosen }) =>
      incidentService.submitAIFeedback(id, suggestion ?? sug, chosen),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incident', variables.id] });
    },
  });
}
