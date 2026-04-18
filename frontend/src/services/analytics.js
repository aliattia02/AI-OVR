import api from './api';

export const analyticsService = {
  async getSummary() {
    const { data } = await api.get('/analytics/summary');
    return data;
  },

  async getTrends() {
    const { data } = await api.get('/analytics/trends');
    return data;
  },

  async getCompare(dimension = 'facility') {
    const { data } = await api.get('/analytics/compare', {
      params: { dimension },
    });
    return data;
  },

  async getHealth() {
    const { data } = await api.get('/');
    return data;
  },
};
