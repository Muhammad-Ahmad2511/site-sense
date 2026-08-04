import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCrawlProgress } from '../src/crawl-progress.js';

test('crawl progress never moves backwards when the discovered queue grows', () => {
  const first = computeCrawlProgress({
    pagesReviewed: 20, pagesQueued: 20, maxPages: 120,
    elapsedMs: 30_000, budgetMs: 240_000, previousPercent: 12
  });
  const second = computeCrawlProgress({
    pagesReviewed: 20, pagesQueued: 200, maxPages: 120,
    elapsedMs: 31_000, budgetMs: 240_000, previousPercent: first.percent
  });
  assert.ok(second.percent >= first.percent);
});

test('time heartbeat advances progress even while page count is unchanged', () => {
  const early = computeCrawlProgress({
    pagesReviewed: 70, pagesQueued: 100, maxPages: 120,
    elapsedMs: 100_000, budgetMs: 240_000, previousPercent: 12
  });
  const later = computeCrawlProgress({
    pagesReviewed: 70, pagesQueued: 100, maxPages: 120,
    elapsedMs: 200_000, budgetMs: 240_000, previousPercent: early.percent
  });
  assert.ok(later.percent > early.percent);
});

test('crawl stage reaches 90 at the configured safety budget', () => {
  const result = computeCrawlProgress({
    pagesReviewed: 80, pagesQueued: 180, maxPages: 120,
    elapsedMs: 240_000, budgetMs: 240_000, previousPercent: 66
  });
  assert.equal(result.percent, 90);
});
