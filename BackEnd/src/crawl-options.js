function parsePositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function resolveCrawlSelection(_input = {}, operationalCeiling = 120) {
  const ceiling = Math.max(1, parsePositiveInteger(operationalCeiling) || 120);
  return {
    mode: 'all-discoverable',
    maxPages: ceiling,
    requestedPageLimit: null,
    label: 'Whole website'
  };
}
