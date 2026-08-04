import { chromium } from 'playwright';
import axe from 'axe-core';
import { normalizeInputUrl, PublicUrlGuard } from './security.js';
import { buildRuleFindings, calculateScores, finding } from './rules.js';
import { fetchAuthorityBenchmark } from './authority.js';
import { computeCrawlProgress, formatEta } from './crawl-progress.js';
import { buildHomepageCandidates, looksLikeProtectionPage } from './resilient-navigation.js';

const DEFAULT_TIMEOUT = Number(process.env.AUDIT_TIMEOUT_MS || 25000);
const INTERNAL_PAGE_TIMEOUT_MS = Math.max(4000, Number(process.env.INTERNAL_PAGE_TIMEOUT_MS || 9000));
const MAX_CRAWL_PAGES = Math.max(1, Number(process.env.MAX_CRAWL_PAGES || 120));
const MAX_CRAWL_DURATION_MS = Math.max(30_000, Number(process.env.MAX_CRAWL_DURATION_MS || 240_000));
const CRAWL_CONCURRENCY = Math.min(8, Math.max(1, Number(process.env.CRAWL_CONCURRENCY || 6)));
const FAST_PAGE_SETTLE_MS = Math.max(50, Number(process.env.FAST_PAGE_SETTLE_MS || 100));
const FAST_RENDER_WAIT_MS = Math.max(300, Number(process.env.FAST_RENDER_WAIT_MS || 900));
const ACCESSIBILITY_SAMPLE_PAGES = Math.min(10, Math.max(1, Number(process.env.ACCESSIBILITY_SAMPLE_PAGES || 2)));
const AUDIT_BROWSER_USER_AGENT = process.env.AUDIT_BROWSER_USER_AGENT ||
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';

const INIT_METRICS_SCRIPT = `
(() => {
  window.__auditVitals = { lcp: null, cls: 0 };
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) window.__auditVitals.lcp = last.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__auditVitals.cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {}
})();
`;

function cleanText(value, max = 180) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function makePageFailure(url, message) {
  return {
    url,
    finalUrl: url,
    title: '',
    status: 0,
    accessible: false,
    error: message,
    facts: {
      title: '', description: '', canonical: '', robots: '', lang: '', viewportMeta: '',
      h1Count: 0, headings: [], textLength: 0, imageCount: 0, imagesWithoutAlt: 0,
      imageAltSamples: [], internalLinkCount: 0, externalLinkCount: 0,
      structuredDataCount: 0, openGraph: { title: false, description: false, image: false },
      twitterCard: false, favicon: false, hreflangCount: 0,
      unlabelledControls: 0, unlabelledControlSamples: [],
      emptyInteractive: 0, horizontalOverflow: 0, smallTapTargets: 0,
      smallTapTargetSamples: [], interactiveCount: 0, smallInputText: 0, hasClearCta: false,
      hasContactPath: false, hasTrustSignal: false, maxFormFields: 0,
      internalLinks: []
    },
    metrics: { load: null, ttfb: null, fcp: null, lcp: null, cls: null, transferBytes: null, requestCount: 0 },
    axe: [],
    errors: [message]
  };
}


async function pageHasUsableEvidence(page) {
  try {
    return await page.evaluate(() => {
      const title = (document.title || '').trim();
      const text = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
      const links = document.querySelectorAll('a[href]').length;
      return Boolean(title) || text.length >= 120 || links >= 3;
    });
  } catch {
    return false;
  }
}

function injectBaseHref(html, finalUrl) {
  const base = `<base href="${String(finalUrl).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">`;
  if (/<head(?:\s[^>]*)?>/i.test(html)) return html.replace(/<head(\s[^>]*)?>/i, (match) => `${match}${base}`);
  return `<!doctype html><html><head>${base}</head><body>${html}</body></html>`;
}

async function staticHtmlFallback(page, context, url, guard, siteOrigin, options, originalError) {
  const response = await context.request.get(url, {
    timeout: options.fastMode ? Math.min(DEFAULT_TIMEOUT, INTERNAL_PAGE_TIMEOUT_MS) : DEFAULT_TIMEOUT,
    failOnStatusCode: false,
    maxRedirects: 10,
    headers: {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
      'user-agent': AUDIT_BROWSER_USER_AGENT
    }
  });
  const finalUrl = response.url();
  await guard.assertUrl(finalUrl);
  const status = response.status();
  const headers = response.headers();
  const contentType = String(headers['content-type'] || '').toLowerCase();
  if (status >= 400) throw new Error(`HTTP ${status} from the website protection or origin server.`);
  if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
    throw new Error(`The fallback response was not HTML (${contentType}).`);
  }
  const html = await response.text();
  if (!html || html.length < 80) throw new Error('The fallback response did not contain enough HTML to audit.');
  if (looksLikeProtectionPage({ status, html, text: html.replace(/<[^>]+>/g, ' ') })) {
    throw new Error('The website returned an anti-bot, CAPTCHA, or access-protection page.');
  }

  await page.setContent(injectBaseHref(html, finalUrl), { waitUntil: 'domcontentloaded', timeout: 10_000 });
  const evidenceOrigin = siteOrigin || new URL(finalUrl).origin;
  const extracted = await extractPageFacts(page, evidenceOrigin);
  if (!extracted.facts.title && extracted.facts.textLength < 120 && extracted.facts.internalLinkCount < 2) {
    throw new Error('The fallback HTML did not contain enough public page evidence.');
  }

  return {
    url,
    finalUrl,
    title: extracted.facts.title,
    status,
    accessible: true,
    error: null,
    facts: extracted.facts,
    metrics: { load: null, ttfb: null, fcp: null, lcp: null, cls: null, transferBytes: Buffer.byteLength(html), requestCount: 1 },
    axe: [],
    checks: {
      mode: 'static-html-fallback',
      accessibility: 'lightweight-dom-only',
      fallback: true,
      fallbackReason: cleanText(originalError?.message || originalError || 'Browser navigation did not complete.', 240)
    },
    errors: [`Browser rendering fallback used: ${cleanText(originalError?.message || originalError || 'navigation failed', 220)}`]
  };
}

async function extractPageFacts(page, siteOrigin) {
  return page.evaluate((origin) => {
    const targetOrigin = origin || location.origin;
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    };

    const accessibleName = (element) => (
      element.getAttribute('aria-label') ||
      element.getAttribute('title') ||
      element.innerText ||
      element.textContent ||
      ''
    ).replace(/\s+/g, ' ').trim();

    const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
      .filter(visible)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        level: Number(element.tagName.slice(1)),
        text: (element.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 120)
      }));

    const images = [...document.images].filter(visible);
    const missingAltImages = images.filter((image) => !image.hasAttribute('alt'));

    const controls = [...document.querySelectorAll('input:not([type="hidden"]), select, textarea')].filter(visible);
    const unlabelled = controls.filter((control) => {
      const aria = control.getAttribute('aria-label') || control.getAttribute('aria-labelledby');
      return !(control.labels && control.labels.length) && !aria;
    });

    const interactives = [...document.querySelectorAll('a[href],button,[role="button"],input[type="submit"],input[type="button"]')].filter(visible);
    const unnamed = interactives.filter((element) => !accessibleName(element));
    const smallTargets = interactives.filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width < 44 || rect.height < 44;
    });

    const smallInputText = controls.filter((element) => parseFloat(getComputedStyle(element).fontSize) < 16).length;

    const allLinks = [...document.querySelectorAll('a[href]')]
      .map((anchor) => {
        try {
          const url = new URL(anchor.href, location.href);
          url.hash = '';
          return {
            url: url.href,
            text: accessibleName(anchor).slice(0, 100),
            origin: url.origin,
            protocol: url.protocol
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const internalLinks = [...new Map(
      allLinks
        .filter((link) => link.origin === targetOrigin && ['http:', 'https:'].includes(link.protocol))
        .map((link) => [link.url, link])
    ).values()]
      .filter((link) => !/\.(?:jpg|jpeg|png|gif|webp|svg|pdf|zip|mp4|mp3|css|js|xml)(?:\?|$)/i.test(link.url))
      .slice(0, 100);

    const actionPattern = /\b(contact|buy|shop|book|request|quote|start|get started|subscribe|sign up|register|apply|download|call|message|whatsapp|demo|trial|order|donate)\b/i;
    const contactPattern = /\b(contact|email|call|phone|message|whatsapp|support)\b/i;
    const trustPattern = /\b(review|testimonial|trusted|guarantee|certified|secure|privacy|award|clients?|customers?|years? experience|money back)\b/i;
    const visibleText = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();

    const forms = [...document.forms].filter(visible);
    const formFieldCounts = forms.map((form) => [...form.querySelectorAll('input:not([type="hidden"]),select,textarea')].filter(visible).length);

    const nav = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');
    const paints = performance.getEntriesByType('paint');
    const fcp = paints.find((entry) => entry.name === 'first-contentful-paint');

    return {
      facts: {
        title: (document.title || '').trim(),
        description: (document.querySelector('meta[name="description"]')?.content || '').trim(),
        canonical: document.querySelector('link[rel="canonical"]')?.href || '',
        robots: (document.querySelector('meta[name="robots" i]')?.content || '').trim().toLowerCase(),
        lang: document.documentElement.lang || '',
        viewportMeta: document.querySelector('meta[name="viewport"]')?.content || '',
        h1Count: headings.filter((heading) => heading.level === 1).length,
        headings,
        textLength: visibleText.length,
        imageCount: images.length,
        imagesWithoutAlt: missingAltImages.length,
        imageAltSamples: missingAltImages.slice(0, 5).map((image) => image.currentSrc || image.src || '<img>'),
        internalLinkCount: new Set(allLinks.filter((link) => link.origin === targetOrigin && ['http:', 'https:'].includes(link.protocol)).map((link) => link.url)).size,
        externalLinkCount: new Set(allLinks.filter((link) => link.origin !== targetOrigin && ['http:', 'https:'].includes(link.protocol)).map((link) => link.url)).size,
        structuredDataCount: [...document.querySelectorAll('script[type="application/ld+json"]')].filter((script) => {
          try {
            JSON.parse(script.textContent);
            return true;
          } catch {
            return false;
          }
        }).length,
        openGraph: {
          title: Boolean(document.querySelector('meta[property="og:title"]')?.content?.trim()),
          description: Boolean(document.querySelector('meta[property="og:description"]')?.content?.trim()),
          image: Boolean(document.querySelector('meta[property="og:image"]')?.content?.trim())
        },
        twitterCard: Boolean(document.querySelector('meta[name="twitter:card"]')?.content?.trim()),
        favicon: Boolean(document.querySelector('link[rel~="icon" i]')?.href),
        hreflangCount: document.querySelectorAll('link[rel="alternate"][hreflang]').length,
        unlabelledControls: unlabelled.length,
        unlabelledControlSamples: unlabelled.slice(0, 5).map((control) => `${control.tagName.toLowerCase()}${control.name ? `[name="${control.name}"]` : ''}`),
        emptyInteractive: unnamed.length,
        horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        smallTapTargets: smallTargets.length,
        interactiveCount: interactives.length,
        smallTapTargetSamples: smallTargets.slice(0, 5).map((element) => accessibleName(element).slice(0, 60) || element.tagName.toLowerCase()),
        smallInputText,
        hasClearCta: interactives.some((element) => actionPattern.test(accessibleName(element))),
        hasContactPath: allLinks.some((link) => /^mailto:|^tel:/i.test(link.url) || contactPattern.test(link.text)) || contactPattern.test(visibleText.slice(0, 3000)),
        hasTrustSignal: trustPattern.test(visibleText),
        maxFormFields: formFieldCounts.length ? Math.max(...formFieldCounts) : 0,
        internalLinks
      },
      metrics: {
        load: nav ? nav.loadEventEnd : null,
        ttfb: nav ? nav.responseStart : null,
        fcp: fcp ? fcp.startTime : null,
        lcp: window.__auditVitals?.lcp ?? null,
        cls: window.__auditVitals?.cls ?? null,
        transferBytes: resources.reduce((sum, entry) => sum + (entry.transferSize || 0), nav?.transferSize || 0),
        requestCount: resources.length + 1
      }
    };
  }, siteOrigin);
}

async function runAxe(page) {
  try {
    await page.addScriptTag({ content: axe.source });
    const results = await page.evaluate(async () => {
      const output = await window.axe.run(document, {
        resultTypes: ['violations'],
        rules: {
          'color-contrast': { enabled: true }
        }
      });
      return output.violations;
    });

    return results.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      description: violation.description,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes.slice(0, 10).map((node) => ({
        target: node.target,
        html: cleanText(node.html, 220),
        failureSummary: cleanText(node.failureSummary, 300)
      }))
    }));
  } catch {
    return [];
  }
}


async function externalOriginIsSafe(decisions, parsedUrl, guard) {
  const origin = parsedUrl.origin;
  if (!decisions.has(origin)) {
    const decision = guard.assertUrl(parsedUrl).then(() => true).catch(() => false);
    decisions.set(origin, decision);
  }
  return Boolean(await decisions.get(origin));
}

async function auditPage(context, url, guard, siteOrigin, options = {}) {
  const fastMode = Boolean(options.fastMode);
  const runAccessibility = options.runAccessibility !== false;
  const externalOriginDecisions = options.externalOriginDecisions || new Map();
  const page = await context.newPage();
  const errors = [];
  page.on('popup', async (popup) => { await popup.close().catch(() => {}); });

  page.on('pageerror', (error) => errors.push(`Page error: ${cleanText(error.message)}`));
  if (!fastMode) {
    page.on('requestfailed', (request) => {
      const failure = request.failure()?.errorText || 'request failed';
      errors.push(`Request failed: ${cleanText(request.url(), 120)} (${failure})`);
    });
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`Console error: ${cleanText(message.text())}`);
    });
  }

  try {
    await guard.assertUrl(url);

    if (fastMode) {
      await page.route('**/*', async (route) => {
        const request = route.request();
        const type = request.resourceType();
        const requestUrl = request.url();
        const isHeavy = ['image', 'media', 'font'].includes(type);
        const isTracker = /(?:google-analytics|googletagmanager|doubleclick|facebook\.net|hotjar|clarity\.ms|segment\.com|mixpanel|amplitude)/i.test(requestUrl);
        if (isHeavy || isTracker) return route.abort('blockedbyclient');

        try {
          const parsed = new URL(requestUrl);
          if (!['http:', 'https:'].includes(parsed.protocol)) return route.continue();
          if (siteOrigin && parsed.origin === siteOrigin) return route.continue();

          // Validate each third-party origin once instead of repeating DNS/security
          // work for every script, stylesheet, XHR, and redirect.
          return await externalOriginIsSafe(externalOriginDecisions, parsed, guard)
            ? route.continue()
            : route.abort('blockedbyclient');
        } catch {
          return route.abort('blockedbyclient');
        }
      });
    }

    let response = null;
    let navigationError = null;
    try {
      response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: fastMode ? Math.min(DEFAULT_TIMEOUT, INTERNAL_PAGE_TIMEOUT_MS) : DEFAULT_TIMEOUT
      });
    } catch (error) {
      navigationError = error;
      if (!(await pageHasUsableEvidence(page))) throw error;
      errors.push(`Navigation timeout recovered from rendered page: ${cleanText(error?.message || error)}`);
    }
    if (fastMode) {
      await page.waitForFunction(() => {
        const text = document.body?.innerText?.trim() || '';
        return Boolean(document.title?.trim()) || text.length >= 60;
      }, null, { timeout: FAST_RENDER_WAIT_MS }).catch(() => {});
      await page.waitForTimeout(FAST_PAGE_SETTLE_MS);
    } else {
      await page.waitForLoadState('networkidle', { timeout: 1800 }).catch(() => {});
      await page.waitForTimeout(250);
    }

    const finalUrl = page.url();
    await guard.assertUrl(finalUrl);

    const extracted = await extractPageFacts(page, siteOrigin);
    const responseStatus = response?.status() || 0;
    const protectionText = `${extracted.facts.title}
${await page.evaluate(() => (document.body?.innerText || '').slice(0, 5000)).catch(() => '')}`;
    if (looksLikeProtectionPage({ status: responseStatus, title: extracted.facts.title, text: protectionText })) {
      throw new Error(`The website returned a protection page${responseStatus ? ` (HTTP ${responseStatus})` : ''}.`);
    }
    const axeViolations = runAccessibility ? await runAxe(page) : [];

    return {
      url,
      finalUrl,
      title: extracted.facts.title,
      status: responseStatus,
      accessible: true,
      error: null,
      facts: extracted.facts,
      metrics: extracted.metrics,
      axe: axeViolations,
      checks: {
        mode: fastMode ? 'fast-seo' : 'full',
        accessibility: runAccessibility ? 'axe' : 'lightweight-dom-only',
        navigationRecovered: Boolean(navigationError)
      },
      errors: [...new Set(errors)].slice(0, 20)
    };
  } catch (error) {
    if (options.allowStaticFallback !== false) {
      try {
        return await staticHtmlFallback(page, context, url, guard, siteOrigin, options, error);
      } catch (fallbackError) {
        const combined = `${cleanText(error?.message || error, 180)} Static fallback: ${cleanText(fallbackError?.message || fallbackError, 180)}`;
        return makePageFailure(url, combined);
      }
    }
    return makePageFailure(url, cleanText(error?.message || 'The page could not be audited.', 300));
  } finally {
    await page.close().catch(() => {});
  }
}

function normalizeCrawlUrl(value) {
  const url = new URL(value);
  url.hash = '';
  const ignored = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
  for (const key of ignored) url.searchParams.delete(key);
  if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/$/, '');
  return url.href;
}

const SKIP_PATH_PATTERN = /\/(?:wp-admin|wp-login|wp-json|xmlrpc\.php|cart|checkout|basket|my-account|account|login|logout|sign-in|sign-out)(?:\/|$)/i;
const SKIP_QUERY_PATTERN = /^(?:s|search|sort|order|orderby|filter|add-to-cart|replytocom|session|sid|phpsessid|preview|share|output)$/i;

function isUsefulCrawlUrl(value, siteOrigin) {
  try {
    const url = new URL(value);
    if (url.origin !== siteOrigin || !['http:', 'https:'].includes(url.protocol)) return false;
    if (SKIP_PATH_PATTERN.test(url.pathname)) return false;
    if ([...url.searchParams.keys()].some((key) => SKIP_QUERY_PATTERN.test(key))) return false;
    if (url.searchParams.size > 2) return false;
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length > 12) return false;
    return true;
  } catch {
    return false;
  }
}

function crawlPriority(value) {
  try {
    const url = new URL(value);
    const path = url.pathname.toLowerCase();
    const depth = path.split('/').filter(Boolean).length;
    let priority = depth * 10 + url.searchParams.size * 30;
    if (/\/(?:about|services?|products?|shop|blog|news|contact)(?:\/|$)/i.test(path)) priority -= 15;
    if (/\/(?:privacy|terms|cookies?|legal)(?:\/|$)/i.test(path)) priority += 40;
    return priority;
  } catch {
    return 999;
  }
}

function collectDiscoveredUrls(links, siteOrigin, seen, queued) {
  const candidates = [];
  for (const link of links || []) {
    try {
      const normalized = normalizeCrawlUrl(link.url);
      if (!isUsefulCrawlUrl(normalized, siteOrigin) || seen.has(normalized) || queued.has(normalized)) continue;
      queued.add(normalized);
      candidates.push(normalized);
    } catch {}
  }
  candidates.sort((a, b) => crawlPriority(a) - crawlPriority(b));
  return candidates;
}

function comparableSeoUrl(value, base) {
  try {
    const url = new URL(value, base);
    url.hash = '';
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid']) {
      url.searchParams.delete(key);
    }
    url.searchParams.sort();
    if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '');
    return url.href;
  } catch {
    return '';
  }
}

function pageCanonicalState(page) {
  const current = page.finalUrl || page.url;
  const canonical = page.facts?.canonical;
  if (!canonical) return 'missing';
  const normalizedCanonical = comparableSeoUrl(canonical, current);
  if (!normalizedCanonical) return 'invalid';
  return normalizedCanonical === comparableSeoUrl(current) ? 'self' : 'other';
}

function buildSiteSeoFindings(pages) {
  const findings = [];
  const accessible = pages.filter((page) => page.accessible);
  const indexable = accessible.filter((page) => !/\bnoindex\b/i.test(page.facts.robots || ''));
  // Duplicate metadata is assessed only on representative indexable URLs. Pages
  // intentionally canonicalized elsewhere are consolidation signals, not defects.
  const eligible = indexable.filter((page) => pageCanonicalState(page) !== 'other');

  if (accessible.length && !indexable.length) {
    findings.push(finding({
      pageUrl: accessible[0].finalUrl || accessible[0].url,
      category: 'SEO', severity: 'critical', effort: 'low',
      title: 'No indexable pages were detected',
      evidence: `All ${accessible.length} accessible audited page(s) declared a noindex directive.`,
      recommendation: 'Confirm that the website is intentionally excluded from search. Remove noindex from pages that should appear in search results.',
      confidence: 'high', scoreImpact: 1, ruleId: 'seo-no-indexable-pages'
    }));
  }

  if (indexable.length && !eligible.length) {
    findings.push(finding({
      pageUrl: indexable[0].finalUrl || indexable[0].url,
      category: 'SEO', severity: 'high', effort: 'low',
      title: 'All indexable pages are canonicalized elsewhere',
      evidence: `All ${indexable.length} indexable audited page(s) point their canonical URL to a different page.`,
      recommendation: 'Confirm that the site is intentionally consolidating all search signals elsewhere. At least one representative page should normally use a self-referencing canonical.',
      confidence: 'high', scoreImpact: 1, ruleId: 'seo-no-representative-pages'
    }));
  }

  const addDuplicates = (field, label, ruleId) => {
    const groups = new Map();
    for (const page of eligible) {
      const value = String(page.facts[field] || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (!value) continue;
      const list = groups.get(value) || [];
      list.push(page);
      groups.set(value, list);
    }
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      for (const page of group) {
        findings.push(finding({
          pageUrl: page.finalUrl || page.url,
          category: 'SEO', severity: 'medium', effort: 'low',
          title: `Duplicate ${label} detected`,
          evidence: `The same ${label} appears on ${group.length} representative indexable audited pages. Example pages: ${group.slice(0, 4).map((item) => item.finalUrl || item.url).join(', ')}.`,
          recommendation: `Use a unique, page-specific ${label} where these pages serve different search intents. Confirm intentional duplicates before changing templates.`,
          confidence: 'high', scoreImpact: 1, ruleId
        }));
      }
    }
  };

  addDuplicates('title', 'page title', 'seo-duplicate-title');
  addDuplicates('description', 'meta description', 'seo-duplicate-description');

  for (const page of indexable) {
    if (page.status >= 400) {
      findings.push(finding({
        pageUrl: page.finalUrl || page.url, category: 'SEO', severity: 'high', effort: 'medium',
        title: 'Indexable page returned an error status',
        evidence: `The audit navigation returned HTTP status ${page.status}.`,
        recommendation: 'Restore the page, redirect it to the correct replacement, or remove internal links to it as appropriate.',
        confidence: 'high', scoreImpact: 1, ruleId: 'seo-http-error'
      }));
    }

    if (pageCanonicalState(page) === 'other') {
      const current = page.finalUrl || page.url;
      const canonical = comparableSeoUrl(page.facts.canonical, current) || page.facts.canonical;
      findings.push(finding({
        pageUrl: current, category: 'SEO', severity: 'low', effort: 'low',
        title: 'Page is canonicalized to another URL',
        evidence: `Observed canonical: ${canonical}. Current page: ${current}.`,
        recommendation: 'Confirm that the canonical target is intentional. Canonicalized duplicate or parameter URLs are excluded from the SEO score so they do not unfairly reduce it.',
        confidence: 'medium', scoreImpact: 0, ruleId: 'seo-canonical-different'
      }));
    }
  }
  return findings;
}

export async function auditWebsite(inputUrl, onProgress = () => {}, crawlSelection = {}) {
  const startedAt = Date.now();
  const progress = (stage, message, extra = {}) => {
    try { onProgress({ stage, message, timestamp: new Date().toISOString(), ...extra }); } catch {}
  };
  progress('validation', 'Validating the public URL and network destination.', { percent: 2 });
  const guard = new PublicUrlGuard();
  const initialUrl = normalizeInputUrl(inputUrl);
  await guard.assertUrl(initialUrl);
  progress('browser', 'Starting the isolated browser and preparing evidence collectors.', { percent: 5 });

  // The requested page count includes the homepage. Whole-site mode still uses the
  // configured operational ceiling and time budget to avoid infinite URL spaces.
  const maxPages = Math.min(MAX_CRAWL_PAGES, Math.max(1, Number(crawlSelection.maxPages || MAX_CRAWL_PAGES)));
  const crawlMode = crawlSelection.mode === 'limited' ? 'limited' : 'all-discoverable';
  const requestedPageLimit = crawlMode === 'limited' ? maxPages : null;
  const crawlDeadline = startedAt + MAX_CRAWL_DURATION_MS;
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      locale: 'en-US',
      serviceWorkers: 'block',
      acceptDownloads: false,
      userAgent: AUDIT_BROWSER_USER_AGENT,
      extraHTTPHeaders: {
        'accept-language': 'en-US,en;q=0.9',
        'upgrade-insecure-requests': '1'
      }
    });

    await context.addInitScript({ content: INIT_METRICS_SCRIPT });
    const externalOriginDecisions = new Map();
    const siteOrigins = new Set([initialUrl.origin]);
    await context.route('**/*', async (route) => {
      const request = route.request();
      const requestUrl = request.url();
      try {
        const parsed = new URL(requestUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) return route.continue();
        if (siteOrigins.has(parsed.origin)) return route.continue();

        const type = request.resourceType();
        const isHeavyThirdParty = ['image', 'media', 'font'].includes(type);
        const isTracker = /(?:google-analytics|googletagmanager|doubleclick|facebook\.net|hotjar|clarity\.ms|segment\.com|mixpanel|amplitude)/i.test(requestUrl);
        if (isHeavyThirdParty || isTracker) return route.abort('blockedbyclient');
          return await externalOriginIsSafe(externalOriginDecisions, parsed, guard)
            ? route.continue()
            : route.abort('blockedbyclient');
      } catch {
        return route.abort('blockedbyclient');
      }
    });

    const homepageCandidates = buildHomepageCandidates(initialUrl);
    let first = null;
    const homepageAttemptErrors = [];
    for (const candidate of homepageCandidates) {
      progress('homepage', 'Opening and analysing the homepage.', { percent: 8, currentUrl: candidate });
      const attempt = await auditPage(context, candidate, guard, null, { allowStaticFallback: true });
      if (attempt.accessible) {
        first = attempt;
        break;
      }
      homepageAttemptErrors.push(`${candidate}: ${attempt.error}`);
    }
    if (!first) first = makePageFailure(initialUrl.href, homepageAttemptErrors.join(' | ') || 'The homepage could not be audited.');
    const pages = [first];

    if (!first.accessible) {
      const unavailableFinding = finding({
        pageUrl: initialUrl.href,
        category: 'Technical',
        severity: 'critical',
        effort: 'unknown',
        title: 'Website could not be audited',
        evidence: first.error,
        recommendation: 'Confirm that the address is public and accessible without authentication, then retry. Blocked or inaccessible pages are reported rather than guessed.',
        confidence: 'high',
        ruleId: 'audit-inaccessible'
      });

      const scores = calculateScores([unavailableFinding], pages);
      return {
        requestedUrl: inputUrl,
        normalizedUrl: initialUrl.href,
        finalOrigin: null,
        auditedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        crawlPolicy: { mode: crawlMode, requestedPageLimit, operationalPageCeiling: maxPages, timeBudgetMs: MAX_CRAWL_DURATION_MS, concurrency: CRAWL_CONCURRENCY, internalPageTimeoutMs: INTERNAL_PAGE_TIMEOUT_MS, accessibilitySamplePages: ACCESSIBILITY_SAMPLE_PAGES },
        pages,
        findings: [unavailableFinding],
        scores,
        limitations: [
          'The website was inaccessible, blocked, timed out, or required interaction/authentication.',
          'No findings were invented for content that could not be collected.'
        ]
      };
    }

    const siteOrigin = new URL(first.finalUrl).origin;
    siteOrigins.add(siteOrigin);
    // Authority lookup is independent of the page crawl, so run it in parallel.
    const authorityPromise = fetchAuthorityBenchmark(siteOrigin);
    progress('discovery', 'Discovering representative same-origin SEO pages from rendered links.', { percent: 12, pagesReviewed: 1, pagesDiscovered: (first.facts.internalLinks || []).length });
    const seen = new Set([normalizeCrawlUrl(first.finalUrl)]);
    const queued = new Set();
    const queue = collectDiscoveredUrls(first.facts.internalLinks, siteOrigin, seen, queued);
    let lastCrawlPercent = 12;

    const sendCrawlProgress = (stage, message, extra = {}) => {
      const computed = computeCrawlProgress({
        pagesReviewed: pages.length,
        pagesQueued: queue.length + (extra.activePages?.length || 0),
        maxPages,
        elapsedMs: Date.now() - startedAt,
        budgetMs: MAX_CRAWL_DURATION_MS,
        previousPercent: lastCrawlPercent
      });
      lastCrawlPercent = computed.percent;
      progress(stage, message, {
        percent: computed.percent,
        etaSeconds: Math.ceil(computed.etaMs / 1000),
        pageTarget: computed.pageTarget,
        pagesReviewed: pages.length,
        pagesQueued: queue.length,
        concurrency: CRAWL_CONCURRENCY,
        ...extra
      });
    };

    while (pages.length < maxPages && queue.length && Date.now() < crawlDeadline) {
      const batch = [];
      while (batch.length < CRAWL_CONCURRENCY && queue.length && pages.length + batch.length < maxPages) {
        const candidate = queue.shift();
        queued.delete(candidate);
        if (seen.has(candidate)) continue;
        seen.add(candidate);
        batch.push(candidate);
      }
      if (!batch.length) continue;

      sendCrawlProgress('crawl', `Analysing ${batch.length} page(s) in parallel.`, {
        currentUrl: batch[0], activePages: batch
      });

      const heartbeat = setInterval(() => {
        const current = computeCrawlProgress({
          pagesReviewed: pages.length,
          pagesQueued: queue.length + batch.length,
          maxPages,
          elapsedMs: Date.now() - startedAt,
          budgetMs: MAX_CRAWL_DURATION_MS,
          previousPercent: lastCrawlPercent
        });
        lastCrawlPercent = current.percent;
        progress('crawl', `Still analysing ${batch.length} active page(s) · about ${formatEta(current.etaMs)} remaining.`, {
          percent: current.percent,
          etaSeconds: Math.ceil(current.etaMs / 1000),
          pageTarget: current.pageTarget,
          currentUrl: batch[0],
          activePages: batch,
          pagesReviewed: pages.length,
          pagesQueued: queue.length,
          concurrency: CRAWL_CONCURRENCY
        });
      }, 1000);
      heartbeat.unref?.();

      let results;
      try {
        results = await Promise.all(batch.map((candidate, index) =>
          auditPage(context, candidate, guard, siteOrigin, {
            fastMode: true,
            runAccessibility: pages.length + index < ACCESSIBILITY_SAMPLE_PAGES,
            externalOriginDecisions
          })
        ));
      } finally {
        clearInterval(heartbeat);
      }

      for (const result of results) {
        pages.push(result);
        if (result.accessible) {
          queue.push(...collectDiscoveredUrls(result.facts.internalLinks, siteOrigin, seen, queued));
          queue.sort((a, b) => crawlPriority(a) - crawlPriority(b));
        }
      }

      sendCrawlProgress('evidence', `Collected evidence from ${pages.length} page(s).`, {
        currentUrl: batch[batch.length - 1]
      });
    }

    progress('rules', 'Running deterministic SEO, accessibility, mobile, performance, conversion, and technical rules.', { percent: 92, pagesReviewed: pages.length });
    const findings = pages.flatMap((page) => {
      if (!page.accessible) {
        return [finding({
          pageUrl: page.url,
          category: 'Technical',
          severity: 'high',
          effort: 'unknown',
          title: 'Selected internal page could not be reviewed',
          evidence: page.error,
          recommendation: 'Check whether this page is intentionally blocked, requires authentication, or is linked incorrectly. Do not infer content that was not collected.',
          confidence: 'high',
          ruleId: 'audit-internal-inaccessible'
        })];
      }
      const pageFindings = buildRuleFindings(page);
      const excludedFromSeo = /\bnoindex\b/i.test(page.facts.robots || '') || pageCanonicalState(page) === 'other';
      if (excludedFromSeo) {
        for (const item of pageFindings) {
          if (item.category === 'SEO') item.scoreImpact = 0;
        }
      }
      return pageFindings;
    });
    findings.push(...buildSiteSeoFindings(pages));

    progress('scoring', 'Calculating evidence-weighted overall and SEO scores.', { percent: 96, pagesReviewed: pages.length, findingsFound: findings.length });
    const scores = calculateScores(findings, pages);
    scores.authority = await authorityPromise;

    progress('report', 'Finalising the audit report and limitations.', { percent: 99, pagesReviewed: pages.length, findingsFound: findings.length });
    return {
      requestedUrl: inputUrl,
      normalizedUrl: initialUrl.href,
      finalOrigin: siteOrigin,
      auditedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      crawlPolicy: { mode: crawlMode, requestedPageLimit, operationalPageCeiling: maxPages, timeBudgetMs: MAX_CRAWL_DURATION_MS, concurrency: CRAWL_CONCURRENCY, internalPageTimeoutMs: INTERNAL_PAGE_TIMEOUT_MS, accessibilitySamplePages: ACCESSIBILITY_SAMPLE_PAGES, stoppedByPageCeiling: pages.length >= maxPages && queue.length > 0, stoppedByTimeBudget: Date.now() >= crawlDeadline && queue.length > 0, remainingQueue: queue.length },
      pages,
      findings,
      scores,
      limitations: [
        crawlMode === 'limited'
          ? `This run used the user-selected limit of ${maxPages} total page(s), including the homepage. It also stops after ${Math.round(MAX_CRAWL_DURATION_MS / 60000)} minutes if the time budget is reached.`
          : `Whole Website mode reviews representative same-origin SEO pages and skips obvious utility, faceted-filter, tracking, and crawl-trap URLs. One run stops at ${maxPages} pages or ${Math.round(MAX_CRAWL_DURATION_MS / 60000)} minutes; any truncation is explicitly reported.`,
        'The audit examines rendered pages in one emulated mobile browser session; results can vary by location, device, consent state, and network conditions.',
        `Full axe-core accessibility checks were sampled on up to ${ACCESSIBILITY_SAMPLE_PAGES} page(s); remaining pages received lightweight DOM checks. Automated checks cannot prove full accessibility and require keyboard and screen-reader testing.`,
        'Homepage performance values use a fuller load. Internal pages use a fast evidence pass that blocks heavy media, fonts, and common trackers; their SEO, structure, accessibility DOM, mobile, and conversion checks remain evidence-based, while performance comparisons should rely mainly on the homepage or a dedicated Lighthouse run.',
        pages.some((page) => page.checks?.fallback)
          ? 'One or more pages used a safe static-HTML fallback because browser rendering was blocked or timed out. SEO metadata and links remain evidence-based, but JavaScript-only content, performance, and full accessibility evidence may be incomplete on those pages.'
          : 'Pages requiring login, CAPTCHA, consent interaction, or anti-bot clearance may be incomplete or inaccessible.',
        'CAPTCHAs and anti-bot challenges are not bypassed. The auditor retries normal public URL variants and uses only publicly returned HTML when available.',
        'The domain-authority estimate uses the Tranco rank API, a saved recent rank, and the official latest Tranco top-one-million list as fallbacks. Scores of 10 or lower are displayed as Unavailable. It remains a public estimate, not the proprietary Ubersuggest or Moz score.',
        'Conversion observations use transparent heuristics and require business-context review.'
      ]
    };
  } finally {
    await browser.close();
  }
}
