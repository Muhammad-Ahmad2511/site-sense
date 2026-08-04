import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCrawlSelection } from '../src/crawl-options.js';

test('the application always uses whole-website mode', () => {
  assert.deepEqual(resolveCrawlSelection({}, 120), {
    mode: 'all-discoverable',
    maxPages: 120,
    requestedPageLimit: null,
    label: 'Whole website'
  });
});

test('legacy page-selection values cannot reduce the crawl scope', () => {
  for (const input of [
    { crawlScope: '3' },
    { crawlScope: '5' },
    { crawlScope: '10' },
    { crawlScope: 'custom', customPages: 1 }
  ]) {
    const result = resolveCrawlSelection(input, 120);
    assert.equal(result.mode, 'all-discoverable');
    assert.equal(result.maxPages, 120);
  }
});

test('whole website keeps the configured operational safety ceiling', () => {
  assert.equal(resolveCrawlSelection({ crawlScope: 'whole' }, 250).maxPages, 250);
  assert.equal(resolveCrawlSelection({ crawlScope: 'whole' }, 0).maxPages, 120);
});
