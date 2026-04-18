import RiskMatrix from '../incidents/RiskMatrix';

const TIMELINE_STEPS = [
  {
    number: 1,
    name: 'Created',
    color: '#1B6CA8',
    description: 'Submitted by patient (anonymous) or staff (authenticated).',
    actions: [
      'Incident details are captured and time-stamped.',
      'Reporter identity is protected for anonymous patient submissions.',
      'Incident enters the Quality queue for triage.',
    ],
  },
  {
    number: 2,
    name: 'In Progress',
    color: '#D97706',
    description: 'Quality Admin opens the case and begins review.',
    actions: [
      'Initial facts and supporting evidence are reviewed.',
      'Stakeholders are identified for follow-up.',
      'Case ownership and next review checkpoints are assigned.',
    ],
  },
  {
    number: 3,
    name: 'Evaluating',
    color: '#7C3AED',
    description: 'Risk matrix is assigned and CAPA is drafted.',
    actions: [
      'Severity and probability are assessed.',
      'Risk score and priority level are documented.',
      'Corrective and Preventive Action (CAPA) draft is prepared.',
    ],
  },
  {
    number: 4,
    name: 'Action Taken',
    color: '#059669',
    description: 'CAPA is implemented by the facility.',
    actions: [
      'Approved actions are executed by responsible teams.',
      'Evidence of implementation is collected.',
      'Effectiveness checks are scheduled and tracked.',
    ],
  },
  {
    number: 5,
    name: 'Completed',
    color: '#111827',
    description: 'Final report is written and submitted.',
    actions: [
      'Outcome summary and lessons learned are finalized.',
      'Final report is submitted for record and audit trail.',
      'Incident is formally closed in the workflow.',
    ],
  },
];

const RISK_SCORE_GUIDE = [
  { scores: [9], level: 'Critical', color: '#DC2626' },
  { scores: [4, 6], level: 'High', color: '#D97706' },
  { scores: [3], level: 'Medium', color: '#1B6CA8' },
  { scores: [2, 1], level: 'Low', color: '#059669' },
];

function StepCard({ step, isLast }) {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            backgroundColor: step.color,
            color: '#FFFFFF',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 700,
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {step.number}
        </div>
        {!isLast && (
          <div
            aria-hidden="true"
            style={{ width: 2, minHeight: 84, backgroundColor: '#E5E7EB', marginTop: 8 }}
          />
        )}
      </div>

      <div
        style={{
          flex: 1,
          border: '1px solid #E5E7EB',
          borderRadius: 10,
          padding: 14,
          background: '#FFFFFF',
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{step.name}</div>
        <div style={{ marginTop: 6, color: '#374151', fontSize: 14 }}>{step.description}</div>
        <ul style={{ marginTop: 10, marginBottom: 0, paddingLeft: 20, color: '#4B5563', fontSize: 14 }}>
          {step.actions.map((action, index) => (
            <li key={`${step.number}-${action}-${index}`} style={{ marginBottom: 4 }}>
              {action}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function WorkflowView() {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, padding: 16, background: '#F9FAFB' }}>
        <h2 style={{ marginTop: 0, marginBottom: 6, fontSize: 24, color: '#111827' }}>Incident Workflow</h2>
        <p style={{ marginTop: 0, marginBottom: 20, color: '#4B5563' }}>
          E·OVR incident lifecycle from report intake through closure.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <StepCard step={TIMELINE_STEPS[0]} />
          <StepCard step={TIMELINE_STEPS[1]} />
          <StepCard step={TIMELINE_STEPS[2]} />

          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 700,
                  fontSize: 14,
                  flexShrink: 0,
                }}
                aria-label="More Info Needed branch loop"
                role="img"
              >
                ↺
              </div>
              <div
                aria-hidden="true"
                style={{ width: 2, minHeight: 84, backgroundColor: '#E5E7EB', marginTop: 8 }}
              />
            </div>
            <div
              style={{
                flex: 1,
                border: '1px solid #FCA5A5',
                borderRadius: 10,
                padding: 14,
                background: '#FEF2F2',
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 700, color: '#B91C1C' }}>More Info Needed</div>
              <div style={{ marginTop: 6, color: '#991B1B', fontSize: 14 }}>
                Case is sent back for clarification and returns to Evaluating after updates.
              </div>
              <ul style={{ marginTop: 10, marginBottom: 0, paddingLeft: 20, color: '#991B1B', fontSize: 14 }}>
                <li style={{ marginBottom: 4 }}>Clarification request is sent to reporter or responsible team.</li>
                <li style={{ marginBottom: 4 }}>Missing evidence or context is collected.</li>
                <li style={{ marginBottom: 4 }}>Case loops back to Evaluating for final scoring and CAPA refinement.</li>
              </ul>
            </div>
          </div>

          <StepCard step={TIMELINE_STEPS[3]} />
          <StepCard step={TIMELINE_STEPS[4]} isLast />
        </div>
      </div>

      <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, padding: 16, background: '#FFFFFF' }}>
        <h3 style={{ marginTop: 0, marginBottom: 10, fontSize: 20, color: '#111827' }}>Risk Matrix (Reference)</h3>
        <p style={{ marginTop: 0, marginBottom: 12, color: '#4B5563', fontSize: 14 }}>
          Reference-only matrix used during the Evaluating stage.
        </p>
        <RiskMatrix readOnly={true} />

        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, color: '#111827', marginBottom: 8 }}>Score Reference Guide</div>
          <p style={{ marginTop: 0, marginBottom: 8, color: '#6B7280', fontSize: 13 }}>
            Guide reflects matrix outcomes only; scores 5, 7, and 8 are not produced by this 3x3 model.
          </p>
          <ul style={{ margin: 0, paddingLeft: 20, color: '#4B5563' }}>
            {RISK_SCORE_GUIDE.map((entry, index) => (
              <li key={`risk-level-${index}`}>
                <span
                  aria-hidden="true"
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: entry.color,
                    marginRight: 8,
                  }}
                />
                <strong>{entry.level}</strong> — Scores: {entry.scores.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
