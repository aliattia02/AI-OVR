// frontend/src/hooks/useAnalytics.js
//
// Filters are included in both the queryKey (so React Query re-fetches when any
// filter value changes) and forwarded to the service function (so the backend
// receives the correct query params).
//
// IMPORTANT — CompareView update required:
//   CompareView currently calls useAnalyticsCompare(dimension) with no filters.
//   Pass the `filters` prop received from AnalyticsDashboard:
//
//     export default function CompareView({ filters = {} }) {
//       const [dimension, setDimension] = useState('facility');
//       const { data, isLoading, error } = useAnalyticsCompare(dimension, filters);
//       ...
//     }

import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analytics';

/**
 * @param {Object} [filters]   Dashboard filter values from DashboardFilterBar.
 * @param {Object} [options]   Extra React Query options.
 */
export function useAnalyticsSummary(filters = {}, options = {}) {
  return useQuery({
    queryKey: ['analytics', 'summary', filters],
    queryFn: () => analyticsService.getSummary(filters),
    ...options,
  });
}

/**
 * @param {Object} [filters]
 * @param {Object} [options]
 */
export function useAnalyticsTrends(filters = {}, options = {}) {
  return useQuery({
    queryKey: ['analytics', 'trends', filters],
    queryFn: () => analyticsService.getTrends(filters),
    ...options,
  });
}

/**
 * @param {'facility'|'governorate'} [dimension]
 * @param {Object} [filters]
 * @param {Object} [options]
 */
export function useAnalyticsCompare(dimension = 'facility', filters = {}, options = {}) {
  return useQuery({
    queryKey: ['analytics', 'compare', dimension, filters],
    queryFn: () => analyticsService.getCompare(dimension, filters),
    ...options,
  });
}