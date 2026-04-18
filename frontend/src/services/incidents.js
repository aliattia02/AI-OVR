import api from './api';

export const incidentService = {
  async getAll(params = {}) {
    const { data } = await api.get('/incidents/', {
      params: {
        skip: params.skip ?? 0,
        limit: params.limit ?? 20,
      },
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
    const { data } = await api.patch(`/incidents/${id}/status`, { status: newStatus });
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

  async submitPatientReport(uuid, payload) {
    const { data } = await api.post(`/patients/submit/${uuid}`, payload);
    return data;
  },
};
