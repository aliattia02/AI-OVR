import { useTranslation } from 'react-i18next';
import { useDirection }   from '../hooks/useDirection';
import WorkflowView       from '../components/workflow/WorkflowView';

export default function WorkflowPage() {
  const { t }     = useTranslation();
  const { isRTL } = useDirection();

  return (
    <section style={{ display: 'grid', gap: 12, direction: isRTL ? 'rtl' : 'ltr' }}>
      <h1 style={{ margin: 0, color: '#111827' }}>
        {t('workflow.title', 'Incident Workflow')}
      </h1>
      <WorkflowView />
    </section>
  );
}