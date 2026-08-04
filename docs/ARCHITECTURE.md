# System Architecture and Data Flow

## Components

1. **Single-page interface** — URL input, audit controls, status feedback, filters, editable recommendations, report export, and optional AI explanation.
2. **Express API** — accepts audit requests, applies request limits, validates input, and serves the application.
3. **Public URL safety guard** — permits HTTP/HTTPS on ports 80/443 and rejects credentials, local/private/reserved addresses, and unsupported protocols.
4. **Playwright crawler** — renders the homepage and selected same-origin internal pages in an emulated mobile Chromium session.
5. **Evidence collectors** — collect metadata, headings, links, forms, visible text indicators, browser errors, request failures, and runtime performance observations.
6. **axe-core runner** — performs automated accessibility checks against the rendered document.
7. **Deterministic rule engine** — converts collected facts into page-specific findings with transparent evidence, severity, effort, confidence, and suggested action.
8. **Scoring module** — calculates a documented heuristic score and records each deduction.
9. **Optional AI explanation** — receives only verified finding IDs and evidence after explicit user action. It cannot create new findings and its output is labelled and editable.

## Data flow

```text
User URL
  ↓
Input normalization and public-network validation
  ↓
Chromium page rendering and same-origin link selection
  ↓
DOM facts + axe results + performance observations + browser errors
  ↓
Deterministic findings
  ↓
Transparent scoring and limitations
  ↓
Single-page report
  ├─ editable recommendations
  ├─ category/severity/page filters
  ├─ JSON export
  ├─ browser print/PDF
  └─ optional grounded AI explanation
```

## Finding data structure

```json
{
  "id": "stable finding identifier",
  "ruleId": "deterministic rule name",
  "pageUrl": "affected page",
  "category": "SEO | Accessibility | Performance | Mobile & Usability | Conversion | Technical",
  "severity": "critical | high | medium | low",
  "effort": "low | medium | high | unknown",
  "title": "clear issue name",
  "evidence": "collected page-specific fact",
  "recommendation": "editable suggested action",
  "confidence": "high | medium | low",
  "source": "automated",
  "details": "optional structured details"
}
```

## Trust boundaries

- The browser never intentionally submits forms or credentials.
- Private and non-public network destinations are blocked.
- The optional AI request is separate from the audit and requires explicit user action.
- AI receives verified findings, score logic, and limitations—not raw credentials or hidden page data.
- AI output never replaces the original collected evidence.
