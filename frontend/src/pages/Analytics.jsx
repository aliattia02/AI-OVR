import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard';
import EmptyState from '../components/shared/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const ANALYTICS_MIN_TIER = 2;

export default function Analytics() {
  const { tier } = useAuth();
  const { t } = useTranslation();

  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <h1 style={{ margin: 0, color: '#111827' }}>{t('analytics.title')}</h1>
      {tier < ANALYTICS_MIN_TIER ? <EmptyState title={t('analytics.unavailable')} /> : <AnalyticsDashboard />}
    </section>
  );
}
