import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRuleFindings, calculateScores } from '../src/rules.js';

function basePage(overrides = {}) {
  return {
    url: 'https://example.com/',
    finalUrl: 'https://example.com/',
    status: 200,
    accessible: true,
    errors: [],
    axe: [],
    metrics: {
      load: 1000,
      ttfb: 100,
      fcp: 500,
      lcp: 1200,
      cls: 0.02,
      transferBytes: 500000,
      requestCount: 20
    },
    facts: {
      title: 'A useful and descriptive page title for testing',
      description: 'A useful description that accurately explains the purpose of this page and gives a reader enough context before opening it.',
      canonical: 'https://example.com/',
      lang: 'en',
      viewportMeta: 'width=device-width, initial-scale=1',
      h1Count: 1,
      headings: [{ tag: 'h1', level: 1, text: 'Example' }, { tag: 'h2', level: 2, text: 'Details' }],
      textLength: 1000,
      imageCount: 2,
      imagesWithoutAlt: 0,
      internalLinkCount: 10,
      externalLinkCount: 2,
      structuredDataCount: 1,
      openGraph: { title: true, description: true, image: true },
      twitterCard: true,
      favicon: true,
      hreflangCount: 0,
      imageAltSamples: [],
      unlabelledControls: 0,
      unlabelledControlSamples: [],
      emptyInteractive: 0,
      horizontalOverflow: 0,
      smallTapTargets: 0,
      smallTapTargetSamples: [],
      smallInputText: 0,
      hasClearCta: true,
      hasContactPath: true,
      hasTrustSignal: true,
      maxFormFields: 2,
      internalLinks: []
    },
    ...overrides
  };
}

test('missing title produces page-specific evidence', () => {
  const page = basePage({ facts: { ...basePage().facts, title: '' } });
  const findings = buildRuleFindings(page);
  const titleFinding = findings.find((item) => item.ruleId === 'seo-title-missing');
  assert.ok(titleFinding);
  assert.equal(titleFinding.pageUrl, 'https://example.com/');
  assert.match(titleFinding.evidence, /<title>/);
});

test('score explanation is deterministic and documented', () => {
  const page = basePage({ facts: { ...basePage().facts, title: '' } });
  const findings = buildRuleFindings(page);
  const scores = calculateScores(findings);
  assert.ok(scores.overall < 100);
  assert.match(scores.explanation, /verified findings/i);
  assert.equal(scores.seo, scores.categories.SEO);
  assert.equal(scores.categories.SEO, 85);
});


test('widespread SEO defects produce a substantially lower score than isolated defects', () => {
  const pages = Array.from({ length: 10 }, (_, index) => ({
    ...basePage(),
    url: `https://example.com/p${index}`,
    accessible: true,
    facts: { ...basePage().facts, title: '', description: '', h1Count: 0, canonical: '', textLength: 100 }
  }));
  const findings = pages.flatMap(buildRuleFindings);
  const scores = calculateScores(findings, pages);
  assert.ok(scores.seo <= 50, `expected SEO <= 50, got ${scores.seo}`);
  assert.equal(scores.scoringVersion, 'technical-seo-rubric-v6');
});


test('strong page evidence can reach a high SEO score', () => {
  const page = basePage({
    facts: {
      ...basePage().facts,
      textLength: 2600,
      internalLinkCount: 20,
      headings: [
        { tag: 'h1', level: 1, text: 'Example' },
        { tag: 'h2', level: 2, text: 'Details' },
        { tag: 'h2', level: 2, text: 'Benefits' },
        { tag: 'h3', level: 3, text: 'More information' }
      ]
    }
  });
  const scores = calculateScores(buildRuleFindings(page), [page]);
  assert.ok(scores.seo >= 90, `expected SEO >= 90, got ${scores.seo}`);
});

test('missing fundamentals and thin content cannot receive an inflated score', () => {
  const page = basePage({
    facts: {
      ...basePage().facts,
      title: '',
      description: '',
      canonical: '',
      lang: '',
      viewportMeta: '',
      h1Count: 0,
      headings: [],
      textLength: 80,
      imageCount: 8,
      imagesWithoutAlt: 7,
      internalLinkCount: 0,
      structuredDataCount: 0,
      openGraph: { title: false, description: false, image: false },
      horizontalOverflow: 80
    },
    metrics: { ...basePage().metrics, load: 6000, lcp: 5000, cls: 0.4 }
  });
  const scores = calculateScores(buildRuleFindings(page), [page]);
  assert.ok(scores.seo <= 40, `expected SEO <= 40, got ${scores.seo}`);
});

test('noindex and intentionally canonicalized utility pages do not lower representative SEO score', () => {
  const home = basePage({
    facts: {
      ...basePage().facts,
      textLength: 2600,
      internalLinkCount: 20,
      headings: [
        { tag: 'h1', level: 1, text: 'Example' },
        { tag: 'h2', level: 2, text: 'Details' },
        { tag: 'h2', level: 2, text: 'Benefits' },
        { tag: 'h3', level: 3, text: 'More information' }
      ]
    }
  });
  const noindex = basePage({
    url: 'https://example.com/cart',
    finalUrl: 'https://example.com/cart',
    facts: { ...basePage().facts, robots: 'noindex,follow', title: '', description: '', h1Count: 0, textLength: 20 }
  });
  const canonicalized = basePage({
    url: 'https://example.com/?sort=price',
    finalUrl: 'https://example.com/?sort=price',
    facts: { ...basePage().facts, canonical: 'https://example.com/', title: '', description: '', h1Count: 0, textLength: 20 }
  });
  const pages = [home, noindex, canonicalized];
  const findings = pages.flatMap(buildRuleFindings);
  const scores = calculateScores(findings, pages);
  assert.ok(scores.seo >= 90, `expected representative SEO >= 90, got ${scores.seo}`);
  assert.equal(scores.coverage.pagesScored, 1);
  assert.equal(scores.coverage.excludedFromSeo, 2);
});

test('redirected pages use the final URL for score matching', () => {
  const page = basePage({
    url: 'http://example.com/',
    finalUrl: 'https://example.com/',
    facts: { ...basePage().facts, title: '' }
  });
  const finding = buildRuleFindings(page).find((item) => item.ruleId === 'seo-title-missing');
  assert.equal(finding.pageUrl, 'https://example.com/');
  const scores = calculateScores(buildRuleFindings(page), [page]);
  assert.ok(scores.seo < 90, `expected missing title to affect final URL score, got ${scores.seo}`);
});


test('thin pages with only basic tags do not receive an inflated SEO score', () => {
  const page = basePage({
    facts: {
      ...basePage().facts,
      canonical: '',
      textLength: 100,
      internalLinkCount: 0,
      structuredDataCount: 0,
      openGraph: { title: false, description: false, image: false },
      twitterCard: false,
      favicon: false
    }
  });
  const scores = calculateScores(buildRuleFindings(page), [page]);
  assert.ok(scores.seo <= 50, `expected thin/basic page SEO <= 50, got ${scores.seo}`);
});

test('slow performance metrics do not invert an otherwise strong technical SEO score', () => {
  const page = basePage({
    metrics: {
      ...basePage().metrics,
      load: 12000,
      ttfb: 4000,
      fcp: 7000,
      lcp: 9000,
      cls: 0.5,
      transferBytes: 9 * 1024 * 1024,
      requestCount: 250
    },
    facts: {
      ...basePage().facts,
      textLength: 1800,
      internalLinkCount: 20,
      headings: [
        { tag: 'h1', level: 1, text: 'Example' },
        { tag: 'h2', level: 2, text: 'Details' },
        { tag: 'h2', level: 2, text: 'Benefits' }
      ]
    }
  });
  const scores = calculateScores(buildRuleFindings(page), [page]);
  assert.ok(scores.seo >= 90, `expected technical SEO >= 90 despite slow lab metrics, got ${scores.seo}`);
  assert.ok(scores.categories.Performance < 100, 'performance category should still report the slow page');
});
