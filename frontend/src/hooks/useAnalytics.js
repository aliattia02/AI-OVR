import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analytics';

export function useAnalyticsSummary(options = {}) {
  return useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: analyticsService.getSummary,
    ...options,
  });
}

export function useAnalyticsTrends(options = {}) {
  return useQuery({
    queryKey: ['analytics', 'trends'],
    queryFn: analyticsService.getTrends,
    ...options,
  });
}

export function useAnalyticsCompare(dimension = 'facility', options = {}) {
  return useQuery({
    queryKey: ['analytics', 'compare', dimension],
    queryFn: () => analyticsService.getCompare(dimension),
    ...options,
  });
}
