import WorkflowView from '../components/workflow/WorkflowView';

export default function WorkflowPage() {
  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <h1 style={{ margin: 0, color: '#111827' }}>Incident Workflow</h1>
      <WorkflowView />
    </section>
  );
}
