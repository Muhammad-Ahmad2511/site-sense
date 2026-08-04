export function formatDuration(ms) {
  if (!Number.isFinite(ms)) return '—';
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

export function formatMetric(value, unit = 'ms') {
  return Number.isFinite(value) ? `${Math.round(value)} ${unit}` : 'Unavailable';
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return 'Unavailable';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

export const SEVERITY_COLORS = {
  critical: { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', ring: 'ring-red-400/40' },
  high: { text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10', ring: 'ring-orange-400/40' },
  medium: { text: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500/10', ring: 'ring-yellow-400/40' },
  low: { text: 'text-secondary-500 dark:text-secondary-300', bg: 'bg-secondary-500/10', ring: 'ring-secondary-400/40' }
};

export function scoreColor(score) {
  if (score >= 90) return { stroke: '#05b084', text: 'text-primary-600 dark:text-primary-300' };
  if (score >= 70) return { stroke: '#5cdaac', text: 'text-primary-600 dark:text-primary-300' };
  if (score >= 50) return { stroke: '#eab308', text: 'text-yellow-600 dark:text-yellow-400' };
  return { stroke: '#ef4444', text: 'text-red-600 dark:text-red-400' };
}
