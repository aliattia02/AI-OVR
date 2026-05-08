// frontend/src/services/analytics.js
//
// All three analytics calls now accept an optional `filters` object and forward
// non-empty values as query-string params to the backend.  Empty strings and
// null/undefined values are stripped so the backend receives clean inputs.

import api from './api';

/**
 * Convert a filters object into an Axios `params` object, omitting any key
 * whose value is empty, null, or undefined.
 *
 * @param {Object} filters
 * @returns {Object}
 */
function buildParams(filters = {}) {
  const params = {};
  const keys = [
    'governorate',
    'administration',
    'facility_type',
    'facility_name',
    'creation_from',
    'creation_to',
    'occurrence_from',
    'occurrence_to',
  ];
  for (const key of keys) {
    const val = filters[key];
    if (val !== undefined && val !== null && val !== '') {
      params[key] = val;
    }
  }
  return params;
}

export const analyticsService = {
  /**
   * @param {Object} [filters]
   * @returns {Promise<{ status: Array, severity: Array, event_type: Array }>}
   */
  async getSummary(filters = {}) {
    const { data } = await api.get('/analytics/summary', {
      params: buildParams(filters),
    });
    return data;
  },

  /**
   * @param {Object} [filters]
   * @returns {Promise<Array<{ month: string, count: number }>>}
   */
  async getTrends(filters = {}) {
    const { data } = await api.get('/analytics/trends', {
      params: buildParams(filters),
    });
    return data;
  },

  /**
   * @param {'facility'|'governorate'} [dimension]
   * @param {Object} [filters]
   * @returns {Promise<Array<{ label: string, count: number }>>}
   */
  async getCompare(dimension = 'facility', filters = {}) {
    const { data } = await api.get('/analytics/compare', {
      params: { dimension, ...buildParams(filters) },
    });
    return data;
  },

  async getHealth() {
    const { data } = await api.get('/');
    return data;
  },
};