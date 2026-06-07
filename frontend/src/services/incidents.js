import api from './api';

export const incidentService = {
  async getAll(params = {}) {
    const { skip = 0, limit = 20, ...filters } = params;

    // Drop empty-string / null / undefined filter values so they don't reach
    // the backend as empty query params (e.g. ?governorate= causes 422 errors)
    const activeFilters = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== '' && v !== null && v !== undefined),
    );

    const { data } = await api.get('/incidents/', {
      params: { skip, limit, ...activeFilters },
    });
    return data;
  },

  async getById(id) {
    const { data } = await api.get(`/incidents/${id}`);
    return data;
  },

  async create(payload) {
    const { data } = await api.post('/incidents/', payload);
    return data;
  },

  async updateStatus(id, newStatus) {
    const { data } = await api.patch(`/incidents/${id}/status`, { new_status: newStatus });
    return data;
  },

  async saveAssessment(id, sev, prob) {
    const { data } = await api.patch(`/incidents/${id}/assessment`, { severity: sev, probability: prob });
    return data;
  },

  async saveActions(id, payload) {
    const { data } = await api.patch(`/incidents/${id}/actions`, payload);
    return data;
  },

  async submitFinal(id, text) {
    const { data } = await api.post(`/incidents/${id}/final`, { final_report: text });
    return data;
  },

  async submitAIFeedback(id, sug, chosen) {
    const { data } = await api.post(`/incidents/${id}/ai-feedback`, { ai_suggested: sug, human_chose: chosen });
    return data;
  },

  // GAHAR migration: replaces saveJCIFields / /jci-fields endpoint
  async saveGAHARFields(id, payload) {
    const { data } = await api.patch(`/incidents/${id}/gahar-fields`, payload);
    return data;
  },

  async submitPatientReport(uuid, payload) {
    const { data } = await api.post(`/patients/submit/${uuid}`, payload);
    return data;
  },
};