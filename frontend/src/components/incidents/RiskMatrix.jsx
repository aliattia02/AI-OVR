import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../../hooks/useDirection'; // RTL

const ROWS = ['Major', 'Moderate', 'Minor'];
const COLS = ['High', 'Medium', 'Low'];

const SEVERITY_WEIGHT = {
  Major: 3,
  Moderate: 2,
  Minor: 1,
};

const PROBABILITY_WEIGHT = {
  High: 3,
  Medium: 2,
  Low: 1,
};

const SEVERITY_LABEL_KEYS = {
  Major: 'incidents.severity.major',
  Moderate: 'incidents.severity.moderate',
  Minor: 'incidents.severity.minor',
};

const PROBABILITY_LABEL_KEYS = {
  High: 'incidents.probability.high',
  Medium: 'incidents.probability.medium',
  Low: 'incidents.probability.low',
};

function getRiskScore(severity, probability) {
  const severityWeight = SEVERITY_WEIGHT[severity];
  const probabilityWeight = PROBABILITY_WEIGHT[probability];
  if (!severityWeight || !probabilityWeight) return null;
  return severityWeight * probabilityWeight;
}

function getRiskColor(score) {
  if (score === 9) return '#DC2626';
  if (score === 6 || score === 4) return '#D97706';
  if (score === 3) return '#1B6CA8';
  if (score === 2 || score === 1) return '#059669';
  return '#9CA3AF';
}

function getRiskLevel(score, t) {
  if (score === null || score === undefined) return t('incidents.risk.not_selected');
  if (score >= 4) return t('incidents.risk.high_risk');
  if (score === 3) return t('incidents.risk.medium_risk');
  return t('incidents.risk.low_risk');
}

export default function RiskMatrix({ severity, probability, onChange, readOnly = false }) {
  const selectedScore = useMemo(() => getRiskScore(severity, probability), [severity, probability]);
  const clickable = !readOnly && typeof onChange === 'function';
  const { isRTL } = useDirection(); // RTL
  const { t } = useTranslation();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          direction: isRTL ? 'ltr' : undefined, // RTL
        }}
      >
        {ROWS.map((rowSeverity) =>
          COLS.map((colProbability) => {
            const score = getRiskScore(rowSeverity, colProbability);
            const selected = rowSeverity === severity && colProbability === probability;

            return (
              <button
                key={`${rowSeverity}-${colProbability}`}
                type="button"
                aria-label={`${t(SEVERITY_LABEL_KEYS[rowSeverity])} ${t('incidents.detail.fields.severity')}, ${t(PROBABILITY_LABEL_KEYS[colProbability])} ${t('incidents.detail.fields.probability')}${selected ? ', selected' : ''}`}
                aria-current={selected ? 'true' : undefined}
                onClick={() => {
                  if (!clickable) return;
                  onChange({
                    severity: rowSeverity,
                    probability: colProbability,
                    riskScore: score,
                  });
                }}
                disabled={!clickable}
                style={{
                  height: 54,
                  borderRadius: 10,
                  border: selected ? '3px solid #FFFFFF' : '1px solid #E5E7EB',
                  boxShadow: selected ? '0 0 0 5px rgba(17,24,39,0.55)' : 'none',
                  backgroundColor: getRiskColor(score),
                  color: '#FFFFFF',
                  cursor: clickable ? 'pointer' : 'default',
                  fontSize: 12,
                  fontWeight: selected ? 700 : 600,
                  lineHeight: 1.2,
                  padding: 6,
                  opacity: clickable ? 1 : 0.95,
                }}
              >
                {selected && <div aria-hidden="true">✓</div>}
                <div>{t(SEVERITY_LABEL_KEYS[rowSeverity])}</div>
                <div>{t(PROBABILITY_LABEL_KEYS[colProbability])}</div>
                <div>{score}</div>
              </button>
            );
          })
        )}
      </div>

      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#111827',
          textAlign: 'start', // RTL
        }}
      >
        {t('incidents.risk.risk_score_prefix')} {selectedScore ?? t('common.placeholder_dash')}{t('incidents.risk.risk_separator')}{getRiskLevel(selectedScore, t)}
      </div>
    </div>
  );
}
