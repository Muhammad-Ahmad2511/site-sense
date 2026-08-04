# User Guide

## Run the application

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Run `npm run setup-browser`.
4. Copy `.env.example` to `.env` and change settings only when needed.
5. Run `npm start`.
6. Open `http://localhost:3000`.

## Run an audit

1. Enter a public HTTP or HTTPS website address.
2. Choose **Run audit** or press Enter.
3. The application automatically runs a Whole Website audit and moves to live progress.
4. Wait while representative same-origin pages are rendered and evidence is collected. Very large sites remain subject to the configured page and time safety limits.

## Read the report

- **Collected evidence** is the observed or automatically measured fact.
- **Recommended action** is an editable suggestion based on that evidence.
- **Confidence** communicates how strongly the automated rule supports the conclusion.
- **Critical/high/medium/low** communicates likely importance, not certainty.
- The overall score is a documented prioritization heuristic, not an external benchmark.

Use the filters to group findings by category, importance, affected page, or search text.

## Export

- **Export JSON** downloads the structured audit, including edited recommendations.
- **Print / Save PDF** opens the browser print dialog for a human-readable report.

## Optional AI explanation

When an OpenAI API key is configured, the **Create grounded AI explanation** button becomes available. Pressing it explicitly sends the verified findings and limitations to the configured model. The model is instructed not to add new findings or unsupported facts. Its summary and recommendations remain editable and are labelled as AI interpretation.

## Inaccessible websites

The tool may be unable to audit pages protected by login, CAPTCHA, consent interaction, anti-bot systems, geographic restrictions, or network policies. These cases are shown as failures or limitations. The system does not invent replacement findings.
