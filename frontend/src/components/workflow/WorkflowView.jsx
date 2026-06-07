// frontend/src/components/workflow/WorkflowView.jsx

import { useTranslation } from 'react-i18next';
import { useDirection }   from '../../hooks/useDirection';
import RiskMatrix         from '../incidents/RiskMatrix';
import WorkflowStep       from './WorkflowStep';

// ── Risk score guide ─────────────────────────────────────────────────────────
// Levels are derived via t() inside the component; only the static data lives here.
const RISK_SCORE_COLORS = [
  { scores: [9],    key: 'critical', color: '#DC2626' },
  { scores: [4, 6], key: 'high',     color: '#D97706' },
  { scores: [3],    key: 'medium',   color: '#1B6CA8' },
  { scores: [2, 1], key: 'low',      color: '#059669' },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function WorkflowView() {
  const { t }     = useTranslation();
  const { isRTL } = useDirection();

  // Step labels are resolved here so they can also be reused as transition strings.
  const L = {
    created:       t('workflow.steps.created.label',          'Created'),
    inProgress:    t('workflow.steps.in_progress.label',      'In Progress'),
    evaluating:    t('workflow.steps.evaluating.label',       'Evaluating'),
    actionTaken:   t('workflow.steps.action_taken.label',     'Action Taken'),
    completed:     t('workflow.steps.completed.label',        'Completed'),
    moreInfoNeeded:t('workflow.steps.more_info_needed.label', 'More Info Needed'),
  };

  // ── Step definitions ──────────────────────────────────────────────────────
  const TIMELINE_STEPS = [
    {
      key: 'created',
      number: 1,
      label: L.created,
      color: '#1B6CA8',
      description: t('workflow.steps.created.description'),
      actions: [
        t('workflow.steps.created.actions.captured'),
        t('workflow.steps.created.actions.identity_protected'),
        t('workflow.steps.created.actions.quality_queue'),
      ],
      transitions: [L.inProgress],
    },
    {
      key: 'inProgress',
      number: 2,
      label: L.inProgress,
      color: '#D97706',
      description: t('workflow.steps.in_progress.description'),
      actions: [
        t('workflow.steps.in_progress.actions.facts_reviewed'),
        t('workflow.steps.in_progress.actions.stakeholders'),
        t('workflow.steps.in_progress.actions.ownership_assigned'),
      ],
      transitions: [L.evaluating, L.moreInfoNeeded],
    },
    {
      key: 'evaluating',
      number: 3,
      label: L.evaluating,
      color: '#7C3AED',
      description: t('workflow.steps.evaluating.description'),
      actions: [
        t('workflow.steps.evaluating.actions.assessments'),
        t('workflow.steps.evaluating.actions.risk_documented'),
        t('workflow.steps.evaluating.actions.capa_draft'),
      ],
      transitions: [L.actionTaken, L.moreInfoNeeded],
    },
    {
      key: 'actionTaken',
      number: 4,
      label: L.actionTaken,
      color: '#059669',
      description: t('workflow.steps.action_taken.description'),
      actions: [
        t('workflow.steps.action_taken.actions.actions_executed'),
        t('workflow.steps.action_taken.actions.evidence_collected'),
        t('workflow.steps.action_taken.actions.effectiveness_checks'),
      ],
      transitions: [L.completed],
    },
    {
      key: 'completed',
      number: 5,
      label: L.completed,
      color: '#111827',
      description: t('workflow.steps.completed.description'),
      actions: [
        t('workflow.steps.completed.actions.outcomes_finalized'),
        t('workflow.steps.completed.actions.report_submitted'),
        t('workflow.steps.completed.actions.incident_closed'),
      ],
      transitions: [],
    },
  ];

  // MoreInfoNeeded is a loop/branch, not a sequential step.
  const MORE_INFO_STEP = {
    icon:         '↺',
    label:        L.moreInfoNeeded,
    color:        '#DC2626',
    bg:           '#FEF2F2',
    borderColor:  '#FCA5A5',
    headingColor: '#B91C1C',
    description:  t('workflow.steps.more_info_needed.description'),
    actions: [
      t('workflow.steps.more_info_needed.actions.clarification_request'),
      t('workflow.steps.more_info_needed.actions.missing_evidence'),
      t('workflow.steps.more_info_needed.actions.loop_back'),
    ],
    transitions: [L.evaluating],
  };

  const nextLabel         = t('workflow.next_label', 'Next:');
  const stepsBeforeBranch = TIMELINE_STEPS.slice(0, 3);
  const stepsAfterBranch  = TIMELINE_STEPS.slice(3);

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 18, direction: isRTL ? 'rtl' : 'ltr' }}>

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
          {t('workflow.title')}
        </h2>
        <p style={{ marginTop: 0, marginBottom: 20, color: '#4B5563' }}>
          {t('workflow.intro')}
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
              nextLabel={nextLabel}
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
            nextLabel={nextLabel}
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
              nextLabel={nextLabel}
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
          {t('workflow.risk_matrix_title')}
        </h3>
        <p style={{ marginTop: 0, marginBottom: 12, color: '#4B5563', fontSize: 14 }}>
          {t('workflow.risk_matrix_description')}
        </p>
        <RiskMatrix readOnly={true} />

        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, color: '#111827', marginBottom: 8 }}>
            {t('workflow.score_reference_title')}
          </div>
          <p style={{ marginTop: 0, marginBottom: 8, color: '#6B7280', fontSize: 13 }}>
            {t('workflow.score_reference_note')}
          </p>
          <ul
            style={{
              margin: 0,
              paddingInlineStart: 20,
              color: '#4B5563',
            }}
          >
            {RISK_SCORE_COLORS.map((entry, i) => (
              <li key={`risk-${i}`}>
                <span
                  aria-hidden="true"
                  style={{
                    display:         'inline-block',
                    width:           10,
                    height:          10,
                    borderRadius:    '50%',
                    backgroundColor: entry.color,
                    marginInlineEnd: 8,
                  }}
                />
                <strong>{t(`workflow.risk_levels.${entry.key}`, entry.key)}</strong>
                {' — '}
                {t('workflow.scores_label')} {entry.scores.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}