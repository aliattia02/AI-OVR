// frontend/src/components/workflow/WorkflowStep.jsx
//
// WorkflowStep — a single step card in the WorkflowView timeline.
//
// Props
// ─────────────────────────────────────────────────────────────────
//  number       {number}   Numeral shown in the status circle.
//                          Pass any value when using `icon` override.
//  label        {string}   Step heading text.
//  color        {string}   Accent color used for the circle and heading.
//  bg           {string}   Card background color.          Default: '#FFFFFF'
//  borderColor  {string}   Card border color.              Default: '#E5E7EB'
//  headingColor {string}   Heading text color.             Default: '#111827'
//  description  {string}   One-line summary below heading.
//  actions      {string[]} Bulleted list of action items.
//  transitions  {string[]} INCIDENT_STATUSES labels for the "Next:" chips.
//  variant      {'filled'|'pulsing'|'dimmed'}
//                 filled  — solid colored circle (standard step).
//                 pulsing — animated glow ring (branch / loop step).
//                 dimmed  — grey circle (step not yet reached / inactive).
//  isLast       {boolean}  Omits the vertical connector line below the circle.
//  icon         {string}   Replaces the number inside the circle (e.g. '↺').
// ─────────────────────────────────────────────────────────────────

import { INCIDENT_STATUSES } from '../../utils/enums';

export default function WorkflowStep({
  number,
  label,
  color,
  bg = '#FFFFFF',
  borderColor = '#E5E7EB',
  headingColor = '#111827',
  description,
  actions = [],
  transitions = [],
  variant = 'filled',
  isLast = false,
  icon,
}) {
  // ── Circle style ────────────────────────────────────────────────
  const circleBase = {
    width: 34,
    height: 34,
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    fontWeight: 700,
    fontSize: variant === 'pulsing' ? 18 : 14,
    flexShrink: 0,
  };

  let circleStyle;
  if (variant === 'dimmed') {
    circleStyle = {
      ...circleBase,
      backgroundColor: '#E5E7EB',
      border: '2px solid #D1D5DB',
      color: '#9CA3AF',
    };
  } else if (variant === 'pulsing') {
    circleStyle = {
      ...circleBase,
      backgroundColor: color,
      color: '#FFFFFF',
      animation: 'wfPulse 1.8s ease-in-out infinite',
    };
  } else {
    // filled (default)
    circleStyle = {
      ...circleBase,
      backgroundColor: color,
      color: '#FFFFFF',
    };
  }

  // ── Transition chip lookup ───────────────────────────────────────
  // Build a map from label → status object for O(1) lookups.
  const statusByLabel = Object.values(INCIDENT_STATUSES).reduce((acc, s) => {
    acc[s.label] = s;
    return acc;
  }, {});

  return (
    <>
      {variant === 'pulsing' && (
        <style>{`
          @keyframes wfPulse {
            0%,100% { box-shadow: 0 0 0 0px ${color}44; }
            50%      { box-shadow: 0 0 0 8px ${color}11; }
          }
        `}</style>
      )}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* ── Status circle + connector line ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={circleStyle} aria-hidden="true">
            {icon ?? number}
          </div>
          {!isLast && (
            <div
              aria-hidden="true"
              style={{ width: 2, minHeight: 84, backgroundColor: '#E5E7EB', marginTop: 8 }}
            />
          )}
        </div>

        {/* ── Card ── */}
        <div
          style={{
            flex: 1,
            border: `1px solid ${borderColor}`,
            borderRadius: 10,
            padding: 14,
            background: bg,
          }}
        >
          {/* Heading */}
          <div style={{ fontSize: 18, fontWeight: 700, color: headingColor }}>
            {label}
          </div>

          {/* Description */}
          {description && (
            <div style={{ marginTop: 6, color: '#374151', fontSize: 14 }}>
              {description}
            </div>
          )}

          {/* Action bullets */}
          {actions.length > 0 && (
            <ul
              style={{
                marginTop: 10,
                marginBottom: 0,
                paddingLeft: 20,
                color: '#4B5563',
                fontSize: 14,
              }}
            >
              {actions.map((action, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  {action}
                </li>
              ))}
            </ul>
          )}

          {/* Transition chips */}
          {transitions.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                marginTop: 12,
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: '#6B7280',
                  fontWeight: 600,
                  marginRight: 2,
                }}
              >
                Next:
              </span>
              {transitions.map((t) => {
                const s = statusByLabel[t];
                return (
                  <span
                    key={t}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: 999,
                      backgroundColor: s?.bg ?? '#F3F4F6',
                      color: s?.color ?? '#374151',
                      border: `1px solid ${s?.color ?? '#D1D5DB'}44`,
                    }}
                  >
                    {t}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}