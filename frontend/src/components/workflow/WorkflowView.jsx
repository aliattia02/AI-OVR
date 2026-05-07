// frontend/src/components/workflow/WorkflowView.jsx

import RiskMatrix from '../incidents/RiskMatrix';
import WorkflowStep from './WorkflowStep';

// ── Step definitions ─────────────────────────────────────────────────────────
// `transitions` lists the INCIDENT_STATUSES labels reachable from this step.
// The MoreInfoNeeded branch is rendered separately as a pulsing variant between
// Evaluating and Action Taken, matching the loop-back semantics of the model.

const TIMELINE_STEPS = [
  {
    key: 'created',
    number: 1,
    label: 'Created',
    color: '#1B6CA8',
    description: 'Submitted by patient (anonymous) or staff (authenticated).',
    actions: [
      'Incident details are captured and time-stamped.',
      'Reporter identity is protected for anonymous patient submissions.',
      'Incident enters the Quality queue for triage.',
    ],
    transitions: ['In Progress'],
  },
  {
    key: 'inProgress',
    number: 2,
    label: 'In Progress',
    color: '#D97706',
    description: 'Quality Admin opens the case and begins review.',
    actions: [
      'Initial facts and supporting evidence are reviewed.',
      'Stakeholders are identified for follow-up.',
      'Case ownership and next review checkpoints are assigned.',
    ],
    transitions: ['Evaluating', 'More Info Needed'],
  },
  {
    key: 'evaluating',
    number: 3,
    label: 'Evaluating',
    color: '#7C3AED',
    description: 'Risk matrix is assigned and CAPA is drafted.',
    actions: [
      'Severity and probability are assessed.',
      'Risk score and priority level are documented.',
      'Corrective and Preventive Action (CAPA) draft is prepared.',
    ],
    transitions: ['Action Taken', 'More Info Needed'],
  },
  {
    key: 'actionTaken',
    number: 4,
    label: 'Action Taken',
    color: '#059669',
    description: 'CAPA is implemented by the facility.',
    actions: [
      'Approved actions are executed by responsible teams.',
      'Evidence of implementation is collected.',
      'Effectiveness checks are scheduled and tracked.',
    ],
    transitions: ['Completed'],
  },
  {
    key: 'completed',
    number: 5,
    label: 'Completed',
    color: '#111827',
    description: 'Final report is written and submitted.',
    actions: [
      'Outcome summary and lessons learned are finalized.',
      'Final report is submitted for record and audit trail.',
      'Incident is formally closed in the workflow.',
    ],
    transitions: [],
  },
];

// MoreInfoNeeded is a loop/branch, not a sequential step, so it lives outside
// the main array and is rendered as a pulsing variant.
const MORE_INFO_STEP = {
  icon: '↺',
  label: 'More Info Needed',
  color: '#DC2626',
  bg: '#FEF2F2',
  borderColor: '#FCA5A5',
  headingColor: '#B91C1C',
  description: 'Case is sent back for clarification and returns to Evaluating after updates.',
  actions: [
    'Clarification request is sent to reporter or responsible team.',
    'Missing evidence or context is collected.',
    'Case loops back to Evaluating for final scoring and CAPA refinement.',
  ],
  transitions: ['Evaluating'],
};

// ── Risk score guide ─────────────────────────────────────────────────────────

const RISK_SCORE_GUIDE = [
  { scores: [9],    level: 'Critical', color: '#DC2626' },
  { scores: [4, 6], level: 'High',     color: '#D97706' },
  { scores: [3],    level: 'Medium',   color: '#1B6CA8' },
  { scores: [2, 1], level: 'Low',      color: '#059669' },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function WorkflowView() {
  // Split into before/after the MoreInfoNeeded branch card.
  // Steps 0-2 (Created, In Progress, Evaluating) precede it;
  // Steps 3-4 (Action Taken, Completed) follow it.
  const stepsBeforeBranch = TIMELINE_STEPS.slice(0, 3);
  const stepsAfterBranch  = TIMELINE_STEPS.slice(3);

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* ── Workflow timeline ── */}
      <div
        style={{
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          padding: 16,
          background: '#F9FAFB',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 6, fontSize: 24, color: '#111827' }}>
          Incident Workflow
        </h2>
        <p style={{ marginTop: 0, marginBottom: 20, color: '#4B5563' }}>
          E·OVR incident lifecycle from report intake through closure.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Created → In Progress → Evaluating */}
          {stepsBeforeBranch.map((step) => (
            <WorkflowStep
              key={step.key}
              number={step.number}
              label={step.label}
              color={step.color}
              description={step.description}
              actions={step.actions}
              transitions={step.transitions}
              variant="filled"
            />
          ))}

          {/* ↺  More Info Needed — loop branch */}
          <WorkflowStep
            icon={MORE_INFO_STEP.icon}
            label={MORE_INFO_STEP.label}
            color={MORE_INFO_STEP.color}
            bg={MORE_INFO_STEP.bg}
            borderColor={MORE_INFO_STEP.borderColor}
            headingColor={MORE_INFO_STEP.headingColor}
            description={MORE_INFO_STEP.description}
            actions={MORE_INFO_STEP.actions}
            transitions={MORE_INFO_STEP.transitions}
            variant="pulsing"
          />

          {/* Action Taken → Completed */}
          {stepsAfterBranch.map((step, i) => (
            <WorkflowStep
              key={step.key}
              number={step.number}
              label={step.label}
              color={step.color}
              description={step.description}
              actions={step.actions}
              transitions={step.transitions}
              variant="filled"
              isLast={i === stepsAfterBranch.length - 1}
            />
          ))}
        </div>
      </div>

      {/* ── Risk Matrix reference ── */}
      <div
        style={{
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          padding: 16,
          background: '#FFFFFF',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 10, fontSize: 20, color: '#111827' }}>
          Risk Matrix (Reference)
        </h3>
        <p style={{ marginTop: 0, marginBottom: 12, color: '#4B5563', fontSize: 14 }}>
          Reference-only matrix used during the Evaluating stage.
        </p>
        <RiskMatrix readOnly={true} />

        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, color: '#111827', marginBottom: 8 }}>
            Score Reference Guide
          </div>
          <p style={{ marginTop: 0, marginBottom: 8, color: '#6B7280', fontSize: 13 }}>
            Guide reflects matrix outcomes only; scores 5, 7, and 8 are not produced by this 3×3
            model.
          </p>
          <ul style={{ margin: 0, paddingLeft: 20, color: '#4B5563' }}>
            {RISK_SCORE_GUIDE.map((entry, i) => (
              <li key={`risk-${i}`}>
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