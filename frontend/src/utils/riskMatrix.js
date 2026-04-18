export const RISK_MATRIX = {
  Major: { High: 9, Medium: 6, Low: 3 },
  Moderate: { High: 6, Medium: 4, Low: 2 },
  Minor: { High: 3, Medium: 2, Low: 1 },
};

export function computeRiskScore(severity, probability) {
  return RISK_MATRIX[severity]?.[probability] ?? 0;
}

export function riskLevel(score) {
  if (score >= 7) return { label: 'Critical', color: '#DC2626' };
  if (score >= 5) return { label: 'High', color: '#D97706' };
  if (score >= 3) return { label: 'Medium', color: '#1B6CA8' };
  return { label: 'Low', color: '#059669' };
}
