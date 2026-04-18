import { useMemo } from 'react';

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

function getRiskLevel(score) {
  if (score === null || score === undefined) return 'Not Selected';
  if (score >= 4) return 'High Risk';
  if (score === 3) return 'Medium Risk';
  return 'Low Risk';
}

export default function RiskMatrix({ severity, probability, onChange, readOnly = false }) {
  const selectedScore = useMemo(() => getRiskScore(severity, probability), [severity, probability]);
  const clickable = !readOnly && typeof onChange === 'function';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {ROWS.map((rowSeverity) =>
          COLS.map((colProbability) => {
            const score = getRiskScore(rowSeverity, colProbability);
            const selected = rowSeverity === severity && colProbability === probability;

            return (
              <button
                key={`${rowSeverity}-${colProbability}`}
                type="button"
                aria-label={`${rowSeverity} severity, ${colProbability} probability${selected ? ', selected' : ''}`}
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
                <div>{rowSeverity}</div>
                <div>{colProbability}</div>
                <div>{score}</div>
              </button>
            );
          })
        )}
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
        Risk Score: {selectedScore ?? '—'} — {getRiskLevel(selectedScore)}
      </div>
    </div>
  );
}
