function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Crawl progress is based on the two real stop conditions: page ceiling and
 * time budget. It also uses the currently known queue, but never moves
 * backwards when new URLs are discovered.
 */
export function computeCrawlProgress({
  pagesReviewed,
  pagesQueued = 0,
  maxPages,
  elapsedMs,
  budgetMs,
  previousPercent = 12
}) {
  const reviewed = Math.max(0, Number(pagesReviewed) || 0);
  const queued = Math.max(0, Number(pagesQueued) || 0);
  const ceiling = Math.max(1, Number(maxPages) || 1);
  const budget = Math.max(1, Number(budgetMs) || 1);
  const elapsed = Math.max(0, Number(elapsedMs) || 0);

  const pageFraction = clamp(reviewed / ceiling, 0, 1);
  const timeFraction = clamp(elapsed / budget, 0, 1);
  const knownTarget = Math.max(1, Math.min(ceiling, reviewed + queued));
  const knownWorkFraction = clamp(reviewed / knownTarget, 0, 1);

  // Known-work progress is softened because the queue may grow as pages are
  // crawled. Time/page fractions map directly to the actual safety limits.
  const crawlFraction = Math.max(pageFraction, timeFraction, knownWorkFraction * 0.82);
  const calculated = 12 + Math.round(crawlFraction * 78);
  const percent = clamp(Math.max(Number(previousPercent) || 12, calculated), 12, 90);

  const remainingByTime = Math.max(0, budget - elapsed);
  const observedPerPage = reviewed > 1 ? elapsed / (reviewed - 1) : null;
  const remainingPages = Math.max(0, Math.min(ceiling, reviewed + queued) - reviewed);
  const remainingByPages = observedPerPage ? remainingPages * observedPerPage : null;
  const etaMs = remainingByPages == null
    ? remainingByTime
    : Math.max(0, Math.min(remainingByTime, remainingByPages));

  return {
    percent,
    etaMs: Math.round(etaMs),
    pageTarget: knownTarget,
    pageFraction,
    timeFraction,
    knownWorkFraction
  };
}

export function formatEta(etaMs) {
  const seconds = Math.max(0, Math.ceil((Number(etaMs) || 0) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}
