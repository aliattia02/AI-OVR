import api from './api';

export const provisionFacility = async (facilityId) => {
  const { data } = await api.post(`/users/provision/facility/${facilityId}`);
  return data;
};

export const provisionTierUser = async (payload) => {
  const { data } = await api.post('/users/provision/tier', payload);
  return data;
};
