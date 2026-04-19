import api from './api';

export const provisionFacility = async (facilityId) => {
  if (facilityId === undefined || facilityId === null || facilityId === '') {
    throw new Error('facilityId is required');
  }
  const { data } = await api.post(`/users/provision/facility/${facilityId}`);
  return data;
};

export const provisionTierUser = async (payload) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('payload is required');
  }
  if (!payload.username || !payload.full_name || !payload.role) {
    throw new Error('payload.username, payload.full_name, and payload.role are required');
  }
  // payload: { username, full_name, role, governorate?, administration?, email? }
  const { data } = await api.post('/users/provision/tier', payload);
  return data;
};
