import crypto from 'node:crypto';

export const CATEGORIES = [
  'SEO',
  'Accessibility',
  'Performance',
  'Mobile & Usability',
  'Conversion',
  'Technical'
];

const SEVERITY_DEDUCTION = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3
};

const CATEGORY_WEIGHTS = {
  SEO: 0.2,
  Accessibility: 0.2,
  Performance: 0.2,
  'Mobile & Usability': 0.15,
  Conversion: 0.15,
  Technical: 0.1
};

function idFor(parts) {
  return crypto.createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 12);
}

export function finding({
  pageUrl,
  category,
  severity,
  effort,
  title,
  evidence,
  recommendation,
  confidence = 'high',
  source = 'automated',
  ruleId,
  details = null,
  scoreImpact = null
}) {
  return {
    id: idFor([pageUrl, category, ruleId || title, evidence]),
    ruleId: ruleId || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    pageUrl,
    category,
    severity,
    effort,
    title,
    evidence,
    recommendation,
    confidence,
    source,
    details,
    scoreImpact: scoreImpact ?? (confidence === 'high' ? 1 : confidence === 'medium' ? 0.5 : 0)
  };
}

function add(findings, data) {
  findings.push(finding(data));
}

function headingSkips(headings) {
  const skips = [];
  for (let i = 1; i < headings.length; i += 1) {
    const previous = Number(headings[i - 1].level);
    const current = Number(headings[i].level);
    if (current > previous + 1) {
      skips.push(`${headings[i - 1].tag} → ${headings[i].tag}`);
    }
  }
  return skips;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return 'unavailable';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function formatMs(ms) {
  if (!Number.isFinite(ms)) return 'unavailable';
  return `${Math.round(ms)} ms`;
}

export function buildRuleFindings(page) {
  const findings = [];
  const pageUrl = page.finalUrl || page.url;
  const { facts, metrics, axe, errors = [] } = page;

  if (!facts.title) {
    add(findings, {
      pageUrl, category: 'SEO', severity: 'high', effort: 'low',
      title: 'Page title is missing',
      evidence: 'No non-empty <title> element was found in the rendered document.',
      recommendation: 'Add a unique, descriptive page title that clearly states the page topic.',
      ruleId: 'seo-title-missing'
    });
  } else {
    const length = facts.title.length;
    if (length < 30 || length > 60) {
      add(findings, {
        pageUrl, category: 'SEO', severity: 'low', effort: 'low',
        title: 'Page title length may reduce search clarity',
        evidence: `The rendered title contains ${length} characters: “${facts.title.slice(0, 120)}”.`,
        recommendation: 'Review the title for clarity and uniqueness. A concise title that fully describes the page is usually easier to scan in search results.',
        confidence: 'medium', scoreImpact: 0, ruleId: 'seo-title-length'
      });
    }
  }

  if (!facts.description) {
    add(findings, {
      pageUrl, category: 'SEO', severity: 'medium', effort: 'low',
      title: 'Meta description is missing',
      evidence: 'No non-empty meta description was found.',
      recommendation: 'Add a page-specific meta description that accurately summarizes the content and purpose.',
      scoreImpact: 1,
      ruleId: 'seo-description-missing'
    });
  } else if (facts.description.length < 70 || facts.description.length > 170) {
    add(findings, {
      pageUrl, category: 'SEO', severity: 'low', effort: 'low',
      title: 'Meta description length should be reviewed',
      evidence: `The description contains ${facts.description.length} characters.`,
      recommendation: 'Rewrite the description to be concise, page-specific, and meaningful without keyword stuffing.',
      confidence: 'medium', scoreImpact: 0, ruleId: 'seo-description-length'
    });
  }

  if (facts.h1Count === 0) {
    add(findings, {
      pageUrl, category: 'SEO', severity: 'high', effort: 'low',
      title: 'Primary heading is missing',
      evidence: 'The rendered page contains no <h1> element.',
      recommendation: 'Add one clear primary heading that describes the main page topic.',
      ruleId: 'seo-h1-missing'
    });
  } else if (facts.h1Count > 1) {
    add(findings, {
      pageUrl, category: 'SEO', severity: 'medium', effort: 'low',
      title: 'Multiple primary headings detected',
      evidence: `The rendered page contains ${facts.h1Count} <h1> elements.`,
      recommendation: 'Confirm that the heading hierarchy communicates one clear primary topic; convert secondary headings to the appropriate lower level when needed.',
      confidence: 'medium', scoreImpact: 0, ruleId: 'seo-multiple-h1'
    });
  }

  const skips = headingSkips(facts.headings || []);
  if (skips.length) {
    add(findings, {
      pageUrl, category: 'SEO', severity: 'medium', effort: 'low',
      title: 'Heading levels are skipped',
      evidence: `Detected heading jumps: ${[...new Set(skips)].slice(0, 5).join(', ')}.`,
      recommendation: 'Use headings in a logical outline without skipping levels solely for visual styling.',
      ruleId: 'seo-heading-order'
    });
  }

  if (!facts.canonical) {
    add(findings, {
      pageUrl, category: 'SEO', severity: 'low', effort: 'low',
      title: 'Canonical URL is not declared',
      evidence: 'No rel="canonical" link was found in the rendered document.',
      recommendation: 'Add a canonical URL when duplicate or parameterized versions of this page may be accessible.',
      confidence: 'high', scoreImpact: 1, ruleId: 'seo-canonical-missing'
    });
  }

  if (facts.textLength < 200) {
    add(findings, {
      pageUrl, category: 'SEO', severity: 'low', effort: 'medium',
      title: 'Very little readable text was detected',
      evidence: `Approximately ${facts.textLength} visible text characters were found in the rendered body.`,
      recommendation: 'Confirm that the page provides enough useful, indexable information to satisfy its purpose. Do not add filler content.',
      confidence: 'high', scoreImpact: 1, ruleId: 'seo-thin-text'
    });
  }

  if (!facts.lang) {
    add(findings, {
      pageUrl, category: 'Accessibility', severity: 'medium', effort: 'low',
      title: 'Document language is missing',
      evidence: 'The <html> element has no lang attribute.',
      recommendation: 'Set the document language, for example <html lang="en">, so assistive technologies can pronounce content correctly.',
      ruleId: 'a11y-lang-missing'
    });
  }

  if (facts.imagesWithoutAlt > 0) {
    add(findings, {
      pageUrl, category: 'Accessibility', severity: 'high', effort: 'medium',
      title: 'Images without alt attributes were found',
      evidence: `${facts.imagesWithoutAlt} rendered image(s) have no alt attribute. Examples: ${(facts.imageAltSamples || []).join(', ') || 'not available'}.`,
      recommendation: 'Add meaningful alternative text to informative images and an empty alt attribute to decorative images.',
      ruleId: 'a11y-image-alt'
    });
  }

  if (facts.unlabelledControls > 0) {
    add(findings, {
      pageUrl, category: 'Accessibility', severity: 'high', effort: 'medium',
      title: 'Form controls lack accessible labels',
      evidence: `${facts.unlabelledControls} rendered form control(s) have no associated label or accessible name. Examples: ${(facts.unlabelledControlSamples || []).join(', ') || 'not available'}.`,
      recommendation: 'Associate each control with a visible <label> or a suitable accessible name. Placeholder text alone is not a label.',
      ruleId: 'a11y-form-label'
    });
  }

  if (facts.emptyInteractive > 0) {
    add(findings, {
      pageUrl, category: 'Accessibility', severity: 'high', effort: 'low',
      title: 'Interactive elements have no accessible name',
      evidence: `${facts.emptyInteractive} visible link or button element(s) have no text or accessible name.`,
      recommendation: 'Give every interactive control a descriptive visible label or accessible name that communicates its destination or action.',
      ruleId: 'a11y-empty-interactive'
    });
  }

  for (const violation of axe || []) {
    const severity = ({ critical: 'critical', serious: 'high', moderate: 'medium', minor: 'low' })[violation.impact] || 'medium';
    const targets = violation.nodes.flatMap((node) => node.target || []).slice(0, 6);
    add(findings, {
      pageUrl,
      category: 'Accessibility',
      severity,
      effort: severity === 'critical' || severity === 'high' ? 'medium' : 'low',
      title: violation.help,
      evidence: `${violation.nodes.length} affected element(s). Selectors: ${targets.join(', ') || 'not available'}. ${violation.description}`,
      recommendation: violation.helpUrl
        ? `Fix the affected elements according to the rule guidance: ${violation.helpUrl}`
        : 'Review the affected elements and apply the accessibility rule guidance.',
      ruleId: `axe-${violation.id}`,
      details: { helpUrl: violation.helpUrl, targets }
    });
  }

  if (Number.isFinite(metrics.load) && metrics.load > 4000) {
    add(findings, {
      pageUrl, category: 'Performance', severity: 'high', effort: 'high',
      title: 'Page load completed slowly in the audit browser',
      evidence: `The load event completed after ${formatMs(metrics.load)} in this run.`,
      recommendation: 'Profile the page with a performance tool, then reduce blocking work, large assets, and unnecessary third-party requests. Re-test after changes.',
      confidence: 'medium', ruleId: 'perf-load-slow'
    });
  } else if (Number.isFinite(metrics.load) && metrics.load > 2500) {
    add(findings, {
      pageUrl, category: 'Performance', severity: 'medium', effort: 'medium',
      title: 'Page load time should be reviewed',
      evidence: `The load event completed after ${formatMs(metrics.load)} in this run.`,
      recommendation: 'Review the request waterfall and main-thread work to identify avoidable delay. Confirm with repeated tests before prioritizing.',
      confidence: 'medium', ruleId: 'perf-load-review'
    });
  }

  if (Number.isFinite(metrics.lcp) && metrics.lcp > 4000) {
    add(findings, {
      pageUrl, category: 'Performance', severity: 'high', effort: 'high',
      title: 'Largest contentful paint was slow',
      evidence: `Observed LCP: ${formatMs(metrics.lcp)} in the emulated mobile viewport.`,
      recommendation: 'Identify the largest above-the-fold element and optimize its delivery, image size, server response, and render-blocking dependencies.',
      confidence: 'medium', ruleId: 'perf-lcp-poor'
    });
  } else if (Number.isFinite(metrics.lcp) && metrics.lcp > 2500) {
    add(findings, {
      pageUrl, category: 'Performance', severity: 'medium', effort: 'medium',
      title: 'Largest contentful paint needs improvement',
      evidence: `Observed LCP: ${formatMs(metrics.lcp)} in the emulated mobile viewport.`,
      recommendation: 'Optimize the main above-the-fold content and validate improvement with repeated measurements.',
      confidence: 'medium', ruleId: 'perf-lcp-needs-improvement'
    });
  }

  if (Number.isFinite(metrics.cls) && metrics.cls > 0.25) {
    add(findings, {
      pageUrl, category: 'Performance', severity: 'high', effort: 'medium',
      title: 'Significant layout movement was observed',
      evidence: `Observed cumulative layout shift: ${metrics.cls.toFixed(3)} during this audit run.`,
      recommendation: 'Reserve space for images, embeds, banners, and dynamically inserted content. Avoid moving existing content after it becomes visible.',
      confidence: 'medium', ruleId: 'perf-cls-poor'
    });
  } else if (Number.isFinite(metrics.cls) && metrics.cls > 0.1) {
    add(findings, {
      pageUrl, category: 'Performance', severity: 'medium', effort: 'medium',
      title: 'Layout stability should be improved',
      evidence: `Observed cumulative layout shift: ${metrics.cls.toFixed(3)} during this audit run.`,
      recommendation: 'Find elements that change size or appear late and reserve their final layout space.',
      confidence: 'medium', ruleId: 'perf-cls-needs-improvement'
    });
  }

  if (Number.isFinite(metrics.transferBytes) && metrics.transferBytes > 5 * 1024 ** 2) {
    add(findings, {
      pageUrl, category: 'Performance', severity: 'high', effort: 'high',
      title: 'Large transferred payload detected',
      evidence: `Resources reported approximately ${formatBytes(metrics.transferBytes)} transferred in this run.`,
      recommendation: 'Compress and resize media, remove unused assets, use efficient formats, and defer non-critical resources.',
      confidence: 'medium', ruleId: 'perf-transfer-large'
    });
  } else if (Number.isFinite(metrics.transferBytes) && metrics.transferBytes > 2 * 1024 ** 2) {
    add(findings, {
      pageUrl, category: 'Performance', severity: 'medium', effort: 'medium',
      title: 'Transferred payload should be reviewed',
      evidence: `Resources reported approximately ${formatBytes(metrics.transferBytes)} transferred in this run.`,
      recommendation: 'Review the largest media, font, script, and stylesheet responses and remove avoidable bytes.',
      confidence: 'medium', ruleId: 'perf-transfer-review'
    });
  }

  if (metrics.requestCount > 120) {
    add(findings, {
      pageUrl, category: 'Performance', severity: 'medium', effort: 'medium',
      title: 'High number of network resources',
      evidence: `${metrics.requestCount} resource entries were recorded during this page load.`,
      recommendation: 'Remove unnecessary requests, consolidate small assets where appropriate, and defer resources that are not needed initially.',
      confidence: 'medium', ruleId: 'perf-request-count'
    });
  }

  if (!facts.viewportMeta) {
    add(findings, {
      pageUrl, category: 'Mobile & Usability', severity: 'high', effort: 'low',
      title: 'Mobile viewport configuration is missing',
      evidence: 'No <meta name="viewport"> element was found.',
      recommendation: 'Add a responsive viewport declaration and verify the layout on real mobile devices.',
      ruleId: 'mobile-viewport-missing'
    });
  }

  if (facts.horizontalOverflow > 4) {
    add(findings, {
      pageUrl, category: 'Mobile & Usability', severity: 'high', effort: 'medium',
      title: 'Horizontal overflow detected on mobile',
      evidence: `The rendered document is ${facts.horizontalOverflow}px wider than the emulated mobile viewport.`,
      recommendation: 'Find fixed-width or off-screen elements and make them responsive so users do not need horizontal scrolling.',
      ruleId: 'mobile-horizontal-overflow'
    });
  }

  if (facts.smallTapTargets >= 3) {
    add(findings, {
      pageUrl, category: 'Mobile & Usability', severity: 'medium', effort: 'medium',
      title: 'Several tap targets are small',
      evidence: `${facts.smallTapTargets} visible interactive element(s) were smaller than 44×44 CSS pixels. Examples: ${(facts.smallTapTargetSamples || []).join(', ') || 'not available'}.`,
      recommendation: 'Increase the clickable area and spacing of frequently used mobile controls, then verify they remain easy to activate.',
      confidence: 'medium', ruleId: 'mobile-small-targets'
    });
  }

  if (facts.smallInputText > 0) {
    add(findings, {
      pageUrl, category: 'Mobile & Usability', severity: 'low', effort: 'low',
      title: 'Small text was detected in form controls',
      evidence: `${facts.smallInputText} visible input or textarea element(s) use text smaller than 16px in the emulated mobile viewport.`,
      recommendation: 'Increase form-control text size and test whether mobile browsers zoom unexpectedly during input.',
      confidence: 'medium', ruleId: 'mobile-input-text-small'
    });
  }

  if (!facts.hasClearCta) {
    add(findings, {
      pageUrl, category: 'Conversion', severity: 'medium', effort: 'low',
      title: 'No clear action was detected',
      evidence: 'No visible button or link matched common action language such as contact, buy, book, request, start, subscribe, or sign up.',
      recommendation: 'Confirm the page goal and present one clear, descriptive primary action. This is a heuristic and should be reviewed in context.',
      confidence: 'low', ruleId: 'conversion-cta-missing'
    });
  }

  if (!facts.hasContactPath) {
    add(findings, {
      pageUrl, category: 'Conversion', severity: 'low', effort: 'low',
      title: 'Contact path was not detected',
      evidence: 'No visible email, telephone link, contact-labelled link, or common messaging link was found in the rendered page.',
      recommendation: 'When contact is relevant to the page goal, make the path easy to find and clearly label what happens next.',
      confidence: 'low', ruleId: 'conversion-contact-path'
    });
  }

  if (facts.maxFormFields > 7) {
    add(findings, {
      pageUrl, category: 'Conversion', severity: 'medium', effort: 'medium',
      title: 'A form may create unnecessary friction',
      evidence: `The largest rendered form contains ${facts.maxFormFields} user-editable fields.`,
      recommendation: 'Remove non-essential fields, explain why sensitive information is needed, and consider progressive collection for longer processes.',
      confidence: 'medium', ruleId: 'conversion-long-form'
    });
  }

  if (!facts.hasTrustSignal && facts.hasClearCta) {
    add(findings, {
      pageUrl, category: 'Conversion', severity: 'low', effort: 'medium',
      title: 'Trust evidence was not detected near the page content',
      evidence: 'No visible text matched common trust indicators such as reviews, testimonials, guarantees, certifications, privacy, security, or client/customer proof.',
      recommendation: 'When users must commit money or personal information, add relevant and verifiable trust evidence. This heuristic requires human review.',
      confidence: 'low', ruleId: 'conversion-trust-signal'
    });
  }

  if (page.status >= 400) {
    add(findings, {
      pageUrl, category: 'Technical', severity: 'critical', effort: 'medium',
      title: 'Page returned an error status',
      evidence: `The main document returned HTTP status ${page.status}.`,
      recommendation: 'Restore the page, redirect intentionally removed URLs, and verify internal links do not send users to this response.',
      ruleId: 'technical-http-error'
    });
  }

  if (errors.length) {
    add(findings, {
      pageUrl, category: 'Technical', severity: 'medium', effort: 'medium',
      title: 'Browser errors occurred during rendering',
      evidence: `${errors.length} browser or network error(s) were captured. Examples: ${errors.slice(0, 4).join(' | ')}`,
      recommendation: 'Reproduce the errors in browser developer tools and fix failures that affect content, interaction, or required resources.',
      confidence: 'medium', ruleId: 'technical-browser-errors'
    });
  }

  return findings;
}

export function calculateScores(findings, pages = []) {
  const accessiblePages = pages.filter((page) => page.accessible !== false);
  const pageCount = Math.max(1, accessiblePages.length || new Set(findings.map((item) => item.pageUrl)).size);
  const categories = Object.fromEntries(CATEGORIES.map((category) => [category, 100]));
  const deductions = Object.fromEntries(CATEGORIES.map((category) => [category, []]));
  const scoredFindings = findings.filter((item) => Number(item.scoreImpact) > 0);

  const normalizeSeoUrl = (value, base) => {
    try {
      const url = new URL(value, base);
      url.hash = '';
      for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid']) url.searchParams.delete(key);
      url.searchParams.sort();
      if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '');
      return url.href;
    } catch {
      return String(value || '');
    }
  };
  const pageKey = (page) => normalizeSeoUrl(page.finalUrl || page.url);
  const findingKey = (item) => normalizeSeoUrl(item.pageUrl);
  const isNoindex = (page) => /\bnoindex\b/i.test(page.facts?.robots || '');
  const canonicalState = (page) => {
    const current = page.finalUrl || page.url;
    const canonical = page.facts?.canonical;
    if (!canonical) return 'missing';
    try {
      new URL(canonical, current);
      return normalizeSeoUrl(canonical, current) === normalizeSeoUrl(current) ? 'self' : 'other';
    } catch {
      return 'invalid';
    }
  };
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const grouped = new Map();
  for (const item of scoredFindings) {
    if (!(item.category in categories)) continue;
    const key = `${item.category}|${item.ruleId}`;
    const group = grouped.get(key) || {
      category: item.category, ruleId: item.ruleId, severity: item.severity, title: item.title,
      pageUrls: new Set(), findingIds: [], scoreImpact: 0
    };
    group.pageUrls.add(findingKey(item));
    group.findingIds.push(item.id);
    group.scoreImpact = Math.max(group.scoreImpact, item.scoreImpact);
    const rank = { low: 1, medium: 2, high: 3, critical: 4 };
    if ((rank[item.severity] || 0) > (rank[group.severity] || 0)) group.severity = item.severity;
    grouped.set(key, group);
  }

  const categoryRuleWeights = {
    'a11y-lang-missing': 8, 'a11y-image-alt': 18, 'a11y-form-label': 20,
    'a11y-empty-interactive': 18, 'mobile-viewport-missing': 28,
    'mobile-horizontal-overflow': 22, 'technical-http-error': 35,
    'technical-browser-errors': 12
  };
  const defaultWeight = { critical: 26, high: 17, medium: 9, low: 4 };

  for (const group of grouped.values()) {
    if (group.category === 'SEO') continue;
    const prevalence = Math.min(1, group.pageUrls.size / pageCount);
    const weight = categoryRuleWeights[group.ruleId] ?? defaultWeight[group.severity] ?? 0;
    const points = Math.max(1, Math.round(weight * Math.pow(prevalence, 0.72) * group.scoreImpact));
    categories[group.category] = Math.max(0, categories[group.category] - points);
    deductions[group.category].push({
      ruleId: group.ruleId, findingIds: group.findingIds, severity: group.severity,
      affectedPages: group.pageUrls.size, totalPages: pageCount,
      prevalence: Number(prevalence.toFixed(3)), points, title: group.title,
      scoreImpact: group.scoreImpact
    });
  }

  if (!accessiblePages.length) {
    const FALLBACK_POINTS = {
      'seo-http-error': 35, 'seo-title-missing': 15, 'seo-description-missing': 10,
      'seo-h1-missing': 12, 'seo-heading-order': 5, 'seo-canonical-missing': 4,
      'seo-thin-text': 14, 'seo-duplicate-title': 10,
      'seo-duplicate-description': 6, 'seo-no-indexable-pages': 70
    };
    let seoScore = 100;
    for (const group of grouped.values()) {
      if (group.category !== 'SEO') continue;
      const points = Math.round((FALLBACK_POINTS[group.ruleId] ?? defaultWeight[group.severity] ?? 0) * group.scoreImpact);
      seoScore = Math.max(0, seoScore - points);
      deductions.SEO.push({
        ruleId: group.ruleId, findingIds: group.findingIds, severity: group.severity,
        affectedPages: group.pageUrls.size, totalPages: pageCount, prevalence: 1,
        points, title: group.title, scoreImpact: group.scoreImpact
      });
    }
    categories.SEO = Math.round(seoScore);
    const overall = Math.round(Object.entries(categories).reduce((sum, [category, score]) => sum + score * CATEGORY_WEIGHTS[category], 0));
    const advisory = findings.length - scoredFindings.length;
    return {
      overall, seo: categories.SEO, categories, deductions,
      seoBreakdown: {
        technical: categories.SEO, onPage: categories.SEO, content: categories.SEO,
        searchReadiness: categories.SEO, mobilePerformance: categories.SEO,
        pagesExcludedFromSeo: 0,
        note: 'On-page technical SEO only; backlinks, authority and rankings require an external data provider.'
      },
      coverage: { pagesScored: pageCount, accessiblePages: 0, totalPages: pages.length },
      confidence: 'low', scoreEligibleFindings: scoredFindings.length,
      advisoryFindings: advisory, scoringVersion: 'technical-seo-rubric-v6',
      explanation: `No complete page evidence was supplied, so the fallback used verified findings only. ${advisory} advisory finding(s) did not change the score.`
    };
  }

  const indexablePages = accessiblePages.filter((page) => !isNoindex(page));
  const representativePages = indexablePages.filter((page) => canonicalState(page) !== 'other');
  const seoPages = representativePages;

  const findingsByPage = new Map();
  for (const item of scoredFindings.filter((entry) => entry.category === 'SEO')) {
    const key = findingKey(item);
    const ruleSet = findingsByPage.get(key) || new Set();
    ruleSet.add(item.ruleId);
    findingsByPage.set(key, ruleSet);
  }

  const titlePoints = (title) => {
    const length = String(title || '').trim().length;
    if (!length) return 0;
    if (length >= 15 && length <= 65) return 15;
    if (length >= 8 && length <= 75) return 12;
    return 7;
  };
  const descriptionPoints = (description) => {
    const length = String(description || '').trim().length;
    if (!length) return 0;
    if (length >= 50 && length <= 200) return 10;
    if (length >= 25 && length <= 240) return 7;
    return 4;
  };
  const visibleContentPoints = (length) => {
    if (length >= 300) return 5;
    if (length >= 150) return 4;
    if (length >= 80) return 2;
    if (length > 0) return 1;
    return 0;
  };
  const internalLinkPoints = (count) => count >= 3 ? 3 : count >= 1 ? 2 : 0;

  const pageResults = seoPages.map((page) => {
    const facts = page.facts || {};
    const rules = findingsByPage.get(pageKey(page)) || new Set();
    const state = canonicalState(page);
    const url = page.finalUrl || page.url;

    let technical = 0;
    technical += page.status >= 200 && page.status < 400 ? 12 : page.status > 0 ? 3 : 0;
    technical += /^https:/i.test(url) ? 5 : 0;
    technical += !isNoindex(page) ? 5 : 0;
    technical += state === 'self' ? 5 : state === 'missing' ? 3 : 0;
    technical += facts.lang ? 3 : 0;

    const skips = headingSkips(facts.headings || []);
    let onPage = titlePoints(facts.title) + descriptionPoints(facts.description);
    onPage += Number(facts.h1Count) === 1 ? 7 : Number(facts.h1Count) > 1 ? 4 : 0;
    onPage += (facts.headings || []).length && !skips.length ? 3 : (facts.headings || []).length ? 1 : 0;

    const textLength = Number(facts.textLength) || 0;
    const internalLinks = Number(facts.internalLinkCount ?? facts.internalLinks?.length) || 0;
    const imageCount = Number(facts.imageCount) || 0;
    const imagesWithoutAlt = Number(facts.imagesWithoutAlt) || 0;
    const altCoverage = imageCount === 0 ? 1 : clamp((imageCount - imagesWithoutAlt) / imageCount, 0, 1);
    let content = visibleContentPoints(textLength) + internalLinkPoints(internalLinks);
    content += 5 * altCoverage;
    content += Number(facts.structuredDataCount) > 0 ? 2 : 0;

    let searchReadiness = 0;
    searchReadiness += rules.has('seo-duplicate-title') ? 0 : 4;
    searchReadiness += rules.has('seo-duplicate-description') ? 0 : 3;
    const openGraph = facts.openGraph || {};
    const openGraphCount = [openGraph.title, openGraph.description, openGraph.image].filter(Boolean).length;
    searchReadiness += (openGraphCount / 3) * 2;
    searchReadiness += facts.twitterCard || facts.favicon ? 1 : 0;

    let mobilePerformance = 0;
    mobilePerformance += facts.viewportMeta ? 6 : 0;
    mobilePerformance += Number(facts.horizontalOverflow) <= 4 ? 4 : 0;

    technical = clamp(technical, 0, 30);
    onPage = clamp(onPage, 0, 35);
    content = clamp(content, 0, 15);
    searchReadiness = clamp(searchReadiness, 0, 10);
    mobilePerformance = clamp(mobilePerformance, 0, 10);

    let score = technical + onPage + content + searchReadiness + mobilePerformance;
    const coreMissing = [!facts.title, !facts.description, Number(facts.h1Count) === 0].filter(Boolean).length;
    if (page.status >= 400) score = Math.min(score, 15);
    if (coreMissing === 3) score = Math.min(score, 35);
    else if (coreMissing === 2) score = Math.min(score, 55);
    if (!facts.title) score = Math.min(score, 72);
    if (Number(facts.h1Count) === 0) score = Math.min(score, 78);
    if (!facts.description) score = Math.min(score, 88);
    if (textLength < 80) score = Math.min(score, 62);
    else if (textLength < 150) score = Math.min(score, 72);
    if (internalLinks === 0 && textLength < 300) score = Math.min(score, 68);
    if (!facts.viewportMeta) score = Math.min(score, 88);
    if (state === 'invalid') score = Math.min(score, 85);
    if (rules.has('seo-duplicate-title') && rules.has('seo-duplicate-description')) score = Math.min(score, 78);
    else if (rules.has('seo-duplicate-title')) score = Math.min(score, 88);

    return {
      url, score: Math.round(clamp(score, 0, 100)),
      components: {
        technical: Number(technical.toFixed(2)), onPage: Number(onPage.toFixed(2)),
        content: Number(content.toFixed(2)), searchReadiness: Number(searchReadiness.toFixed(2)),
        mobilePerformance: Number(mobilePerformance.toFixed(2))
      }
    };
  });

  const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const median = (values) => {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  };
  const trimmedMean = (values) => {
    if (values.length < 8) return average(values);
    const sorted = [...values].sort((a, b) => a - b);
    const trim = Math.max(1, Math.floor(sorted.length * 0.1));
    return average(sorted.slice(trim, -trim));
  };

  const pageScoreValues = pageResults.map((item) => item.score);
  let seoScore = pageResults.length
    ? Math.round(pageResults.length === 1
      ? pageScoreValues[0]
      : pageScoreValues[0] * 0.35 + median(pageScoreValues) * 0.35 + trimmedMean(pageScoreValues) * 0.30)
    : indexablePages.length ? 25 : 10;

  const prevalence = (predicate) => seoPages.length ? seoPages.filter(predicate).length / seoPages.length : 0;
  const thinRatio = prevalence((page) => (Number(page.facts?.textLength) || 0) < 150);
  const noInternalLinksRatio = prevalence((page) => (Number(page.facts?.internalLinkCount ?? page.facts?.internalLinks?.length) || 0) === 0);
  const missingTitleRatio = prevalence((page) => !page.facts?.title);
  const missingDescriptionRatio = prevalence((page) => !page.facts?.description);
  const missingH1Ratio = prevalence((page) => Number(page.facts?.h1Count) === 0);

  seoScore -= Math.round(12 * thinRatio);
  seoScore -= Math.round(7 * noInternalLinksRatio);
  if (thinRatio >= 0.8 && noInternalLinksRatio >= 0.8) seoScore = Math.min(seoScore, 45);
  if (missingTitleRatio >= 0.7) seoScore = Math.min(seoScore, 58);
  if (missingH1Ratio >= 0.7) seoScore = Math.min(seoScore, 65);
  if (missingDescriptionRatio >= 0.7) seoScore = Math.min(seoScore, 75);
  seoScore = Math.round(clamp(seoScore, 0, 100));
  categories.SEO = seoScore;

  const SEO_DISPLAY_POINTS = {
    'seo-http-error': 35, 'seo-title-missing': 15, 'seo-description-missing': 10,
    'seo-h1-missing': 12, 'seo-heading-order': 5, 'seo-canonical-missing': 4,
    'seo-thin-text': 12, 'seo-duplicate-title': 8,
    'seo-duplicate-description': 5, 'seo-no-indexable-pages': 70
  };
  for (const group of grouped.values()) {
    if (group.category !== 'SEO') continue;
    const affected = [...group.pageUrls].filter((url) => seoPages.some((page) => pageKey(page) === url)).length;
    const ratio = seoPages.length ? Math.min(1, affected / seoPages.length) : 1;
    const points = Math.round((SEO_DISPLAY_POINTS[group.ruleId] ?? defaultWeight[group.severity] ?? 0) * ratio * group.scoreImpact);
    deductions.SEO.push({
      ruleId: group.ruleId, findingIds: group.findingIds, severity: group.severity,
      affectedPages: affected, totalPages: seoPages.length,
      prevalence: Number(ratio.toFixed(3)), points, title: group.title,
      scoreImpact: group.scoreImpact
    });
  }

  const componentAverage = (name, maximum) => pageResults.length
    ? Math.round((average(pageResults.map((item) => item.components[name])) / maximum) * 100)
    : 0;
  const excludedNoindex = accessiblePages.length - indexablePages.length;
  const excludedCanonical = indexablePages.length - representativePages.length;
  const seoBreakdown = {
    technical: componentAverage('technical', 30), onPage: componentAverage('onPage', 35),
    content: componentAverage('content', 15), searchReadiness: componentAverage('searchReadiness', 10),
    mobilePerformance: componentAverage('mobilePerformance', 10),
    pagesExcludedFromSeo: excludedNoindex + excludedCanonical,
    excludedNoindexPages: excludedNoindex, excludedCanonicalizedPages: excludedCanonical,
    pageScores: pageResults,
    note: 'This measures on-page technical SEO only. Backlinks, authority, keyword rankings and search demand are not available without an external SEO data provider.'
  };

  const overall = Math.round(Object.entries(categories).reduce((sum, [category, score]) => sum + score * CATEGORY_WEIGHTS[category], 0));
  const advisory = findings.length - scoredFindings.length;
  const completed = pages.length > 0 && accessiblePages.length === pages.length;
  const confidence = !seoPages.length ? 'low' : seoPages.length >= 10 && completed ? 'high' : seoPages.length >= 3 ? 'medium' : 'low';

  return {
    overall, seo: categories.SEO, categories, deductions, seoBreakdown,
    coverage: {
      pagesScored: seoPages.length, accessiblePages: accessiblePages.length,
      totalPages: pages.length, excludedFromSeo: excludedNoindex + excludedCanonical
    },
    confidence, scoreEligibleFindings: scoredFindings.length,
    advisoryFindings: advisory, scoringVersion: 'technical-seo-rubric-v6',
    explanation: `The SEO score now uses a Lighthouse-style on-page technical rubric rather than treating content length or one slow load as the main signal. It combines status/indexability, title and description, H1/headings, canonical, internal architecture, image-alt coverage, mobile usability and search presentation. The homepage, median page and trimmed site average are blended so one utility URL cannot reverse a strong or weak result. ${excludedNoindex} noindex page(s) and ${excludedCanonical} intentionally canonicalized page(s) were excluded. ${advisory} advisory finding(s) remain visible without changing the score. It is not Domain Authority and does not estimate backlinks or rankings.`
  };
}
