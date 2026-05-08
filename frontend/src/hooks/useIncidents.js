import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { incidentService } from '../services/incidents';

// ── Debug flag ────────────────────────────────────────────────────────────────
// Active when ANY of the following is true:
//   1. Running locally via `vite dev`          (import.meta.env.DEV)
//   2. VITE_DEBUG=true set in Vercel env vars  (import.meta.env.VITE_DEBUG)
//   3. ?debug=1 appended to the URL            (works in both envs)
//
// To enable on Vercel without a redeploy: append ?debug=1 to the URL.
// To enable permanently on Vercel: add VITE_DEBUG=true in
//   Vercel → Project → Settings → Environment Variables, then redeploy.
// To disable again: remove the env var and redeploy (no code change needed).
const DEBUG =
  import.meta.env.DEV ||
  import.meta.env.VITE_DEBUG === 'true' ||
  new URLSearchParams(window.location.search).get('debug') === '1';

function log(...args) {
  if (DEBUG) console.log('[incidents]', ...args);
}

function logJwt() {
  if (!DEBUG) return;
  try {
    const token =
      localStorage.getItem('access_token') ||
      sessionStorage.getItem('access_token');
    if (!token) return console.warn('[incidents] no token found in storage');
    const claims = JSON.parse(atob(token.split('.')[1]));
    console.log('[incidents] JWT claims →', {
      role:           claims.role,
      tier:           claims.tier,
      facility:       claims.facility,
      administration: claims.administration,
      governorate:    claims.governorate,
      user_id:        claims.user_id,
      expires:        new Date(claims.exp * 1000).toISOString(),
    });
  } catch {
    console.warn('[incidents] could not decode JWT (HttpOnly cookie?)');
  }
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useIncidents(params = {}) {
  const { page = 0, pageSize = 20 } = params;
  const skip = page * pageSize;

  logJwt();

  return useQuery({
    queryKey: ['incidents', { page, pageSize }],
    queryFn: async () => {
      log(`fetching skip=${skip} limit=${pageSize}`);
      try {
        const data = await incidentService.getAll({ skip, limit: pageSize });
        log(`response → ${Array.isArray(data) ? data.length + ' items' : typeof data}`, data);
        if (Array.isArray(data) && data.length === 0)
          console.warn('[incidents] 200 OK but empty array — check scope_filter vs stored documents');
        return data;
      } catch (err) {
        const status = err?.response?.status;
        console.error('[incidents] request failed', {
          status,
          data:    err?.response?.data,
          message: err.message,
        });
        if (status === 304) console.warn('[incidents] 304 → stale cache; deploy Cache-Control: no-store fix');
        if (status === 422) console.warn('[incidents] 422 → Pydantic validation error; check Render logs for bad field value');
        if (status === 401) console.warn('[incidents] 401 → JWT missing or expired');
        if (status === 403) console.warn('[incidents] 403 → role/tier not permitted');
        if (!err.response)  console.warn('[incidents] no response → network failure or Render cold-start');
        throw err;
      }
    },
    throwOnError: true,
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incidents'] }),
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
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ['incident', variables.id] }),
  });
}

export function useAIFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, sug, chosen }) => incidentService.submitAIFeedback(id, sug, chosen),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ['incident', variables.id] }),
  });
}

export function useSaveJCIFields() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => incidentService.saveJCIFields(id, payload),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ['incident', variables.id] }),
  });
}