# ClearSite Audit

A light-theme, single-page website audit application that collects real evidence from public websites. It reports inaccessible or missing data honestly instead of creating placeholder or fake findings.

## What it checks

- URL validation and blocked-page handling
- Homepage plus selected same-origin internal pages
- SEO: titles, descriptions, headings, canonical URLs, and readable content
- Accessibility: axe-core violations, image alt attributes, labels, document language, and accessible names
- Performance observations: load timing, LCP, CLS, transfer size, and request count from the audit run
- Mobile usability: viewport configuration, horizontal overflow, tap targets, and form text sizing
- Conversion heuristics: calls to action, contact paths, trust-language indicators, and form length
- Technical status, browser errors, and failed resources
- Editable recommendations, category filters, JSON export, and print/PDF output
- Optional AI explanation that is generated only from verified finding IDs


## Page-count selection

Every audit now runs in **Whole Website** mode. It follows representative same-origin SEO pages while skipping obvious cart, login, search, tracking, faceted-filter, and crawl-trap URLs. The configured `MAX_CRAWL_PAGES` and time budget remain as safety limits for very large or infinite sites.

## Important honesty and scope notes

No tool can successfully audit every website. Login pages, CAPTCHA, anti-bot systems, consent walls, geo restrictions, robots policies, and network failures can prevent collection. ClearSite Audit surfaces those limitations and does not guess missing content.

The score is a documented prioritization heuristic, not an external benchmark. Automated accessibility testing does not replace keyboard, screen-reader, cognitive, or user testing.

## Requirements

- Node.js 20 or newer
- A machine that can run Chromium

## Project layout

```text
BackEnd/    Express server, audit engine (src/), tests, and the pre-built
            static frontend it serves (public/) — this is the only folder
            you need to run the app.
FrontEnd/   Source for the two Vite + React apps that build into
            BackEnd/public: landing-client (marketing site + the audit tool
            itself) and auth-client (sign in / sign up).
docs/       Project documentation.
```

## Setup

```bash
cd BackEnd
npm install
npm run setup-browser
cp .env.example .env
npm start
```

Open `http://localhost:3000`.

On Windows PowerShell, create `.env` manually or use:

```powershell
Copy-Item .env.example .env
```

The application works without an AI key. To enable the optional grounded explanation, set `OPENAI_API_KEY` and, if needed, `OPENAI_MODEL` in your environment before starting the server.

`BackEnd/public` is already built and committed, so `BackEnd/` alone is enough
to run the app. Only touch `FrontEnd/landing-client` or `FrontEnd/auth-client`
(each needs its own `npm install`) if you're changing the UI — `npm run
build` in either outputs straight back into `BackEnd/public`.

## Test

```bash
cd BackEnd
npm test
```

## Architecture

```text
Single-page browser UI
        |
        | POST /api/audit
        v
Express API and safety validation
        |
        v
Playwright Chromium crawler (mobile viewport)
   |          |             |
   |          |             +--> runtime timing and browser errors
   |          +----------------> axe-core accessibility checks
   +---------------------------> deterministic SEO/usability/conversion rules
        |
        v
Structured evidence + transparent score + editable recommendations
        |
        +--> JSON export / browser print-to-PDF
        |
        +--> optional, explicit /api/ai-summary request
             (only verified findings are sent; AI output is labelled and editable)
```

## Responsible safety controls

- Accepts only public HTTP/HTTPS URLs on ports 80 and 443
- Rejects credentials in URLs
- Resolves hostnames and blocks local, private, reserved, link-local, multicast, and loopback addresses
- Applies the URL guard to browser requests to reduce SSRF risk
- Reviews only non-destructive page content; it does not submit credentials, exploit vulnerabilities, or bypass access controls
- Limits audit pages and request frequency

## Suggested demonstration

1. Audit a normal public marketing site with three pages.
2. Filter findings by category and severity.
3. Edit a recommendation.
4. Export the JSON report and use Print / Save PDF.
5. Audit a blocked, invalid, or inaccessible address to demonstrate honest failure handling.
6. If an AI key is configured, generate the optional explanation and show that it references only existing finding IDs.

## v3 accuracy and live processing update

- The frontend now reads real backend job progress instead of showing timer-based placeholder messages.
- Live status includes the current stage, percentage, current URL, pages reviewed, queue size, and findings count.
- Scoring remains deterministic and evidence-based. The tool does not "train" itself on a website or invent missing evidence.
- Accuracy is improved by waiting briefly for rendered content, running a full axe-core scan on a small configurable sample, collecting lightweight DOM evidence on the remaining pages, deduplicating URLs, and clearly reporting inaccessible pages and crawl truncation.
- Automated results are still screening results, not a substitute for manual accessibility, SEO, UX, or performance review.

## v4 fast accurate crawl update

- Internal pages are analysed in parallel (default concurrency: 6) instead of one-by-one.
- The homepage keeps a fuller load for more meaningful performance observations.
- Internal pages use a fast evidence pass: CSS and JavaScript still run, while heavy images, video, fonts, and common analytics trackers are blocked.
- SEO metadata, headings, rendered text, links, forms, lightweight accessibility DOM checks, mobile structure, and conversion evidence are still collected from each accessible page. Full axe-core scans are sampled to avoid repeating the slowest check hundreds of times.
- Live backend progress now reports parallel page batches and the configured concurrency.
- Increase `CRAWL_CONCURRENCY` up to 8 on a strong machine. Lower it to 2 if memory is limited.
- `FAST_PAGE_SETTLE_MS` adds a short final settle delay after rendered content appears. `FAST_RENDER_WAIT_MS` is the maximum wait for client-rendered title/body evidence.

Recommended balanced settings:

```env
CRAWL_CONCURRENCY=6
FAST_PAGE_SETTLE_MS=100
FAST_RENDER_WAIT_MS=900
ACCESSIBILITY_SAMPLE_PAGES=2
```

Accuracy changes

## SEO scoring accuracy changes
- The SEO score now uses a positive 100-point evidence rubric instead of starting every page at 100 and subtracting only sparse failures.
- Five areas are scored: technical/indexability, on-page metadata and headings, content/architecture, search readiness, and mobile usability.
- Missing title, description, H1, useful content, or indexability applies sensible score caps so weak pages cannot receive inflated marks.
- `noindex` utility pages and URLs intentionally canonicalized to another page are excluded from the representative SEO average.
- Duplicate titles and descriptions are checked only across representative indexable pages.
- Redirected pages are matched to their final URL, preventing findings from being lost during scoring.
- Reports display score confidence and distinguish “affects score” from “advisory — not scored”.

## Score interpretation

The displayed SEO score is an on-page technical SEO health score based on evidence collected by this crawler. It does not reproduce Ubersuggest Domain Authority, Ahrefs Domain Rating, backlinks, traffic, keyword rankings, or another vendor’s proprietary score; those require external search-index datasets or paid APIs.

## Scoring model v6

Each representative indexable page earns points from technical and on-page evidence. The final site score blends the homepage, median page, and a trimmed site average, so one utility or unusual URL cannot reverse the result. Performance remains a separate category and no longer drags a technically strong SEO score down. Thin pages with no internal architecture receive site-level penalties, while intentional `noindex` and canonicalized duplicate URLs are excluded.

The score remains an on-site technical SEO health score, not an authority or ranking prediction.

## Version 1.5 scoring clarification

The report now separates two different concepts:

- **Domain authority benchmark:** a domain-wide reputation/popularity estimate based on the public Tranco rank. It is useful for comparisons such as YouTube/Wikipedia versus smaller domains.
- **Technical SEO health:** evidence collected from the pages audited, including indexability, metadata, headings, canonical tags, architecture, images and mobile readiness.

These scores can legitimately be very different. A famous domain can have very high authority while a particular page is blocked or difficult to audit; a smaller site can have clean on-page markup while still having modest domain authority.


## v1.6 calibration and large-site progress

- The authority estimate now uses a finer Tranco curve at the top of the ranking instead of assigning every top-100 domain a score of 100.
- When public RDAP registration data is available, a conservative maturity cap prevents very new, viral domains from being overestimated. This cap never increases a low or medium score.
- Large crawls publish a one-second progress heartbeat, page target, queue count, and ETA. Progress is monotonic and uses both actual page coverage and the configured time budget.
- Third-party origin safety decisions are cached and heavy third-party resources are blocked during fast internal-page passes.


## v1.7 resilient authority lookup

- Retries the official Tranco individual-domain API instead of immediately returning `Unavailable` after one timeout.
- Reuses successful authority ranks from a local `.cache/authority` directory for seven days and permits a stale cached rank as a temporary outage fallback for up to 30 days.
- If the individual API still fails, downloads/caches the official latest Tranco top-one-million ZIP and looks up the domain locally.
- A temporary provider/network problem is labelled **Retry needed**, not mistaken for a low-authority website.
- **Unavailable** is reserved for a calculated authority estimate of **10 or lower**, including domains absent from the official top-one-million list.
- The authority result remains a transparent public estimate and not an exact Ubersuggest or Moz proprietary score.


## v1.8 compact start screen and automatic navigation

- The introductory copy is shorter and the URL field is positioned higher so it is visible immediately on common desktop screens.
- The two long protocol/crawl explanation lines under the form were removed.
- Starting an audit by Enter or the Run audit button automatically moves the viewport to live progress.
- Completed reports and errors automatically move into view, with sticky-header-safe scroll spacing.

## v1.9 whole-site-only compact interface

- Removed the 3-page, 5-page, 10-page, and custom page-count interface. Every request now runs in Whole Website mode.
- Legacy page-selection values are ignored by the backend, so the crawl scope cannot be reduced through a manual request.
- Replaced the previous multi-line hero section with the compact three-word heading **Audit Any Website**.
- Reduced the heading size and top spacing so the URL field is visible immediately.
- Whole Website mode still uses `MAX_CRAWL_PAGES` and the time budget as safety ceilings for very large or infinite websites.



## Protected-site resilience (v2.5)

The auditor retries apex/www variants, keeps useful rendered evidence after navigation timeouts, and can fall back to publicly returned static HTML. It does not solve or bypass CAPTCHAs or anti-bot challenges.
