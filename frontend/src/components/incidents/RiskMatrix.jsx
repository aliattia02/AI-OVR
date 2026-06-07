/**
 * frontend/src/components/incidents/RiskMatrix.jsx
 *
 * GAHAR SAC (Safety Assessment Code) risk matrix — 4 × 4 grid, score 1–3.
 *
 * Layout (columns = severity, rows = probability):
 *
 *             │ Catastrophic │  Major  │ Moderate │  Minor
 * ────────────┼──────────────┼─────────┼──────────┼────────
 * Frequent    │    SAC 3     │  SAC 3  │  SAC 2   │ SAC 1
 * Occasional  │    SAC 3     │  SAC 2  │  SAC 1   │ SAC 1
 * Uncommon    │    SAC 3     │  SAC 2  │  SAC 1   │ SAC 1
 * Remote      │    SAC 3     │  SAC 2  │  SAC 1   │ SAC 1
 *
 * SAC 3 = Critical (red)  |  SAC 2 = Intermediate (amber)  |  SAC 1 = Low (green)
 *
 * Replaces the previous JCI 3×3 matrix (severity × probability → score 1–9).
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../../hooks/useDirection'; // RTL

// ── Matrix definition ──────────────────────────────────────────────────────────

/** Probability labels are rendered as row headers (outer loop). */
const PROBABILITY_ROWS = ['Frequent', 'Occasional', 'Uncommon', 'Remote'];

/** Severity labels are rendered as column headers (inner loop). */
const SEVERITY_COLS = ['Catastrophic', 'Major', 'Moderate', 'Minor'];

/** Full SAC lookup table. */
const SAC_MATRIX = {
  Catastrophic: { Frequent: 3, Occasional: 3, Uncommon: 3, Remote: 3 },
  Major:        { Frequent: 3, Occasional: 2, Uncommon: 2, Remote: 2 },
  Moderate:     { Frequent: 2, Occasional: 1, Uncommon: 1, Remote: 1 },
  Minor:        { Frequent: 1, Occasional: 1, Uncommon: 1, Remote: 1 },
};

// ── i18n key maps ──────────────────────────────────────────────────────────────

const SEVERITY_LABEL_KEYS = {
  Catastrophic: 'incidents.severity.catastrophic',
  Major:        'incidents.severity.major',
  Moderate:     'incidents.severity.moderate',
  Minor:        'incidents.severity.minor',
};

const PROBABILITY_LABEL_KEYS = {
  Frequent:   'incidents.probability.frequent',
  Occasional: 'incidents.probability.occasional',
  Uncommon:   'incidents.probability.uncommon',
  Remote:     'incidents.probability.remote',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function getSACScore(severity, probability) {
  return SAC_MATRIX[severity]?.[probability] ?? null;
}

function getSACColor(score) {
  if (score === 3) return '#DC2626'; // Critical  — red
  if (score === 2) return '#D97706'; // Intermediate — amber
  if (score === 1) return '#059669'; // Low       — green
  return '#9CA3AF';                  // unknown
}

function getSACLabel(score, t) {
  if (score === null || score === undefined) return t('incidents.risk.not_selected');
  if (score === 3) return t('incidents.risk.sac3_critical');
  if (score === 2) return t('incidents.risk.sac2_intermediate');
  return t('incidents.risk.sac1_low');
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function RiskMatrix({ severity, probability, onChange, readOnly = false }) {
  const selectedScore = useMemo(
    () => getSACScore(severity, probability),
    [severity, probability],
  );

  // True once a cell has been committed (both axes have a value)
  const hasSelection = severity != null && severity !== '' && probability != null && probability !== '';

  const clickable = !readOnly && typeof onChange === 'function';
  const { isRTL } = useDirection(); // RTL
  const { t } = useTranslation();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Column header row (severity labels) ─────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `80px repeat(4, 1fr)`,
          gap: 4,
          direction: isRTL ? 'ltr' : undefined, // RTL — keep matrix LTR
        }}
      >
        {/* empty top-left corner cell */}
        <div />
        {SEVERITY_COLS.map((sev) => (
          <div
            key={sev}
            style={{
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#374151',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '4px 2px',
            }}
          >
            {t(SEVERITY_LABEL_KEYS[sev])}
          </div>
        ))}
      </div>

      {/* ── Grid rows (probability × severity cells) ────────────────────── */}
      {PROBABILITY_ROWS.map((prob) => (
        <div
          key={prob}
          style={{
            display: 'grid',
            gridTemplateColumns: `80px repeat(4, 1fr)`,
            gap: 4,
            direction: isRTL ? 'ltr' : undefined, // RTL
          }}
        >
          {/* Row header — probability label */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingInlineEnd: 8,
              fontSize: 11,
              fontWeight: 700,
              color: '#374151',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {t(PROBABILITY_LABEL_KEYS[prob])}
          </div>

          {/* Severity cells for this probability row */}
          {SEVERITY_COLS.map((sev) => {
            const score    = getSACScore(sev, prob);
            const selected = sev === severity && prob === probability;

            return (
              <button
                key={`${sev}-${prob}`}
                type="button"
                aria-label={`${t(SEVERITY_LABEL_KEYS[sev])} ${t('incidents.detail.fields.severity')}, ${t(PROBABILITY_LABEL_KEYS[prob])} ${t('incidents.detail.fields.probability')}${selected ? ', selected' : ''}`}
                aria-current={selected ? 'true' : undefined}
                onClick={() => {
                  if (!clickable) return;
                  onChange({ severity: sev, probability: prob, riskScore: score });
                }}
                disabled={!clickable}
                style={{
                  height: 58,
                  borderRadius: 10,
                  border: selected ? '3px solid #FFFFFF' : '1px solid #E5E7EB',
                  boxShadow: selected
                    ? '0 0 0 5px rgba(17,24,39,0.55)'
                    : '0 1px 2px rgba(0,0,0,0.06)',
                  backgroundColor: getSACColor(score),
                  color: '#FFFFFF',
                  cursor: clickable ? 'pointer' : 'default',
                  fontSize: 11,
                  fontWeight: selected ? 800 : 600,
                  lineHeight: 1.25,
                  padding: '6px 4px',
                  opacity: hasSelection && !selected ? 0.28 : (clickable ? 1 : 0.92),
                  transform: selected ? 'scale(1.04)' : 'scale(1)',
                  transition: 'opacity 0.25s ease, transform 0.2s ease, box-shadow 0.1s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                }}
              >
                {selected && (
                  <div aria-hidden="true" style={{ fontSize: 13 }}>✓</div>
                )}
                <div style={{ fontWeight: 800, fontSize: 13 }}>
                  SAC {score}
                </div>
              </button>
            );
          })}
        </div>
      ))}

      {/* ── SAC legend ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          paddingTop: 4,
          direction: isRTL ? 'rtl' : 'ltr', // RTL
        }}
      >
        {[
          { score: 3, label: t('incidents.risk.sac3_critical'),     color: '#DC2626' },
          { score: 2, label: t('incidents.risk.sac2_intermediate'), color: '#D97706' },
          { score: 1, label: t('incidents.risk.sac1_low'),          color: '#059669' },
        ].map(({ score, label, color }) => (
          <span
            key={score}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11,
              color: '#374151',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                backgroundColor: color,
                flexShrink: 0,
              }}
            />
            SAC {score} — {label}
          </span>
        ))}
      </div>

      {/* ── Selected score summary ────────────────────────────────────────── */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#111827',
          textAlign: 'start', // RTL
        }}
      >
        {t('incidents.risk.risk_score_prefix')}{' '}
        {selectedScore != null ? (
          <span style={{ color: getSACColor(selectedScore) }}>
            SAC {selectedScore}
          </span>
        ) : (
          t('common.placeholder_dash')
        )}
        {' '}{t('incidents.risk.risk_separator')}
        {getSACLabel(selectedScore, t)}
      </div>
    </div>
  );
}