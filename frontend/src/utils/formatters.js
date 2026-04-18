const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return DATE_FORMATTER.format(date);
}

export function formatDateTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return DATE_TIME_FORMATTER.format(date).replace(',', '');
}

export function formatIncidentId(id) {
  return id;
}

export function truncateText(text, maxChars) {
  if (typeof text !== 'string') return '';
  if (!Number.isFinite(maxChars) || maxChars < 0) return text;
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}...`;
}

export function formatEnumLabel(val) {
  if (typeof val !== 'string') return '';
  return val.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
}
