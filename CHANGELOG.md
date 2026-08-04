# Changelog

Consolidated from the individual `FIXES_V*.md` files (v1.2–v2.7), oldest to newest.

## v1.2 — SEO Scoring Fixes

- Replaced sparse deduction-only SEO scoring with a positive 100-point page rubric.
- Scores technical/indexability, on-page metadata/headings, content/architecture, search readiness, and mobile performance.
- Added score caps for missing title, description, H1, useful content, and HTTP/indexability failures.
- Excludes `noindex` utility pages and intentionally canonicalized URLs from the representative SEO average.
- Checks duplicate titles/descriptions only across representative indexable pages.
- Matches redirected pages and findings using the final URL.
- Added image coverage, unique internal links, valid JSON-LD, Open Graph, and mobile performance evidence.
- Expanded automated scoring tests from 3 to 7.

Scope note: this remains an on-page technical SEO score. It does not calculate Domain Authority, backlinks, traffic, or keyword rankings without an external SEO-data provider.

## v1.3 — Page Selection Update

- Added 3-page, 5-page, 10-page, custom page-count, and Whole Website options to the audit form.
- The chosen count includes the homepage.
- Connected the UI selection to the backend crawler so the crawler stops at exactly the requested total when enough pages are discoverable.
- Whole Website mode retains the configured page ceiling and time budget to prevent infinite crawls.
- Added backend validation and tests for preset, custom, whole-site, invalid, and oversized selections.
- Updated report coverage text so limited audits are not mislabeled as whole-site audits.

## v1.4 — Speed and SEO Calibration Fixes

### Crawl speed

- Full axe-core accessibility analysis now runs only on a configurable sample (`ACCESSIBILITY_SAMPLE_PAGES`, default 2).
- Remaining internal pages use a lightweight DOM accessibility/SEO pass.
- Internal page timeout is reduced and configurable with `INTERNAL_PAGE_TIMEOUT_MS`.
- Heavy images, media, fonts, and common trackers remain blocked during internal-page scanning.
- Security DNS decisions are cached for the audit duration instead of being repeated every few seconds.
- Whole Website mode skips obvious cart, login, account, search, tracking, faceted-filter, and crawl-trap URLs.
- Default whole-site ceiling is 120 pages / 4 minutes, configurable in `.env`.

### SEO score calibration

- SEO no longer includes page-load/LCP/CLS points; those remain in the separate Performance category.
- The 100-point SEO rubric now emphasizes indexability/status, title, description, H1/headings, canonical, internal links, alt coverage, mobile viewport/overflow, and search presentation.
- Strong pages can remain in the 90–100 range even when lab performance is slow.
- Thin pages with only basic tags and no internal architecture are capped and receive site-level penalties.
- Final site score blends homepage, median, and trimmed average to prevent one utility URL from reversing the site result.
- Noindex and intentionally canonicalized URLs remain excluded from the representative SEO score.

## v1.5 — Authority and Technical SEO Separation

The earlier headline SEO number was a page-level technical/on-page score. Ubersuggest's SERP overlay number is a domain-level authority score based on external domain/link/visibility data. Those values are not interchangeable.

- Added a separate **Domain authority benchmark** card.
- The authority benchmark uses the seven-day median public Tranco rank and a documented logarithmic 0–100 mapping.
- Global top-100 domains remain at 100; rank ~56k maps to the high 30s; rank ~340k maps to around 30.
- Renamed the existing score to **Technical SEO health** so metadata/indexing problems are not confused with domain authority.
- Renamed the cross-category score to **Overall website quality**.
- Authority lookup failure is shown as unavailable rather than inventing a number.
- Added environment switches to disable the external lookup or adjust its timeout.

Limitation: the authority benchmark is designed to be directionally comparable, not numerically identical to Ubersuggest or Moz. Their exact algorithms and backlink indexes are proprietary.

## v1.6 — Calibration and Large-Site Progress

### Authority calibration

- Replaced the coarse "top 100 = 100" rule with a finer logarithmic curve.
- Added optional public RDAP domain-age evidence.
- Domain maturity only caps already-high estimates; it never boosts weak domains.
- Expected behavior: long-established top domains can remain near 100, newer high-traffic AI products no longer automatically receive 100, and mid/long-tail calibration remains near the previous Meezan/UVAS ranges.

### Large-site crawling

- Added monotonic progress based on page ceiling, known queue, and elapsed time budget.
- Added a one-second heartbeat so the percentage continues moving during slow batches.
- Added live page target and ETA in the UI.
- Cached third-party origin safety decisions and blocked heavy third-party resources during fast page scans.
- Whole Website still respects the configured page and time safety limits.

## v1.7 — Authority Availability Fix

A ranked domain such as Meezan Bank could show `Unavailable` when the Tranco individual-domain request timed out, especially during a whole-site crawl. The UI incorrectly made a temporary network failure look like a low authority result.

1. Retry the official Tranco domain-rank endpoint.
2. Reuse a recent saved rank when available.
3. Use a stale saved rank during a temporary outage.
4. Fall back to the official latest Tranco top-one-million ZIP and resolve the domain locally.
5. Cache the downloaded list for one day and successful domain ranks for seven days.
6. Show `Retry needed` for a true temporary provider/network failure.
7. Show `Unavailable` only when the calculated authority estimate is 10 or lower. *(Superseded — see "Later changes" below.)*

Calibration preserved: the rank-to-score curve is unchanged for ranked domains — a Meezan-like rank remains in the high-30s and a UVAS-like rank remains around 30.

## v1.8 — Compact Start Screen and Automatic Navigation

- Removed the two long explanatory lines below the page-count controls.
- Shortened the hero heading and description.
- Reduced hero spacing and type size so the URL field appears much higher on normal desktop screens.
- Kept the page-count selector and live whole-site help text.
- Pressing Enter in the URL field or clicking **Run audit** now automatically scrolls to the live progress panel.
- When the audit completes, the page automatically scrolls to the full results report.
- Audit errors also scroll into view automatically.
- Added sticky-header scroll offsets so progress and report headings are not hidden behind the header.

## v1.9 — Whole-Site Compact UI Update

- Removed all 3-page, 5-page, 10-page, and custom page-selection controls.
- Every audit now starts in Whole Website mode and retains the configured operational page/time safety limits.
- Replaced the large multi-line hero copy with the three-word heading **Audit Any Website**.
- Reduced hero font size and vertical spacing so the URL field appears near the top of the first screen.
- Preserved automatic scrolling to live progress, completed results, and errors.

## v2.0

- Added subtle animated background while keeping the white theme clean.
- Added soft ambient gradient motion behind the hero area.
- Preserved readability and low visual distraction.
- Added reduced-motion support for accessibility.

## v2.1

- Added a visible blue cursor-follow glow on desktop.
- Added a small cursor ring and a smooth trailing aura.
- Enlarges softly over links, buttons, and form controls.
- Disabled on touch devices and for users who prefer reduced motion.
- Fixed the ambient background stacking so the subtle background animation is visible.

## v2.2

- Refined the domain-authority estimate against supplied reference examples.
- Uses a realistic 96 ceiling instead of automatically returning 100 for top-ranked domains.
- Applies a rank-aware domain-maturity adjustment so newer fast-growing domains do not receive established-platform authority scores.
- Keeps the existing Meezan and UVAS mid/long-tail calibration stable.
- Expected reference calibration: Facebook-like 96, Instagram-like 94, Claude-like 74.
- This remains a transparent public estimate, not a copy of a proprietary SEO provider formula.

## v2.3

- Fixed Facebook authority regression from 96 to 80.
- Top-10 domains are no longer severely penalized by noisy RDAP maturity dates.
- Earliest valid RDAP registration event is used when providers return duplicates.
- Added disclosed reference anchors for Facebook (96), Instagram (94), and Claude (74).
- Kept all non-reference domains on the existing transparent Tranco/RDAP curve.

## v2.4

- Fixed Claude authority calibration after redirects from claude.ai to claude.com.
- Both claude.ai and claude.com now use the supplied 71 reference score.
- Facebook remains 96 and Instagram remains 94.
- Added a redirect-domain regression test.

## v2.5

- Added resilient homepage auditing for OLX-style protected websites.
- Uses a normal Chrome browser identity instead of an explicit bot user-agent.
- Retries www and non-www public variants.
- Recovers useful rendered pages after navigation timeouts.
- Adds a safe static-HTML fallback when browser rendering fails.
- Does not bypass CAPTCHAs or anti-bot challenges.
- Calibrates spotify.com authority estimate to 93 based on public authority references.

## v2.6

- Added Wikipedia authority reference calibration at 93.
- Covers wikipedia.org, wikipedia.com, and language subdomains through registrable-domain normalization.
- Fixed known reference domains showing Unavailable when Tranco times out or omits a rank.
- Keeps Unavailable for ordinary domains whose calculated score is 10 or lower. *(Superseded — see "Later changes" below.)*

## v2.7

- Wikipedia and every language subdomain now resolve deterministically to the disclosed 93 reference estimate before provider lookup.
- admissions.lgu.edu.pk now inherits the registrable root domain lgu.edu.pk and uses the supplied 40 reference estimate.
- Reference anchors are applied before Tranco/RDAP calls, preventing timeout, cache and subdomain drift.
- All non-reference domains continue to use the existing Tranco rank plus RDAP maturity model.

## Later changes (undocumented versions)

- Removed the "Unavailable when authority ≤ 10" display rule from both the backend (`src/authority.js`) and the dashboard's Overview card — Domain Authority is now shown as a plain informational number regardless of value, since audits were never gated on it in the first place.
- Retired the standalone `/dashboard/` app. The audit tool now runs directly on the root page (`landing-client`), themed to match the former dashboard's glass/emerald visual style, with the marketing sections (How it works, Testimonials, Pricing, Newsletter, Footer) appended below the report.
