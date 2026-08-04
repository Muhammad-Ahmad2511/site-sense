import { SEVERITY_ORDER } from './format';

export function groupByCategory(findings) {
  const map = new Map();
  for (const item of findings) {
    const list = map.get(item.category) || [];
    list.push(item);
    map.set(item.category, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  }
  return map;
}

export function sortBySeverity(findings) {
  return [...findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

export function severityCounts(findings) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const item of findings) if (counts[item.severity] !== undefined) counts[item.severity] += 1;
  return counts;
}

// Roadmap buckets ("Now" / "Next" / "Later") are a deterministic presentation
// of each finding's real `severity` and `effort` fields from the backend —
// nothing here is invented. Difficulty shown to the user IS the backend's
// `effort` value; "impact" shown is the backend's `severity` value.
const EFFORT_RANK = { low: 1, medium: 2, high: 3, unknown: 2 };

export function buildRoadmap(findings) {
  const scored = findings
    .filter((item) => Number(item.scoreImpact) > 0)
    .map((item) => {
      const severityRank = 4 - SEVERITY_ORDER[item.severity]; // critical=4 ... low=1
      const effortRank = EFFORT_RANK[item.effort] ?? 2;
      return { ...item, priorityScore: severityRank * 10 - effortRank };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const now = scored.filter(
    (item) => item.severity === 'critical' || (item.severity === 'high' && item.effort !== 'high')
  );
  const later = scored.filter(
    (item) => item.severity === 'low' || (item.severity === 'medium' && item.effort === 'high')
  );
  const nowIds = new Set(now.map((item) => item.id));
  const laterIds = new Set(later.map((item) => item.id));
  const next = scored.filter((item) => !nowIds.has(item.id) && !laterIds.has(item.id));

  return { now, next, later };
}
