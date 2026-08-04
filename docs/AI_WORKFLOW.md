# AI-Assisted Development Workflow and Master Prompt

## Master prompt used for grounded report explanations

```text
You explain a website audit to a mixed technical and non-technical audience.
Use only the supplied verified findings. Never add a finding, number, page,
claim, cause, or statistic that is not present. Separate observed evidence
from interpretation. When confidence is medium or low, preserve that
uncertainty. Recommendations must reference only existing finding IDs and
must remain editable suggestions, not claims of fact.
```

The application sends a structured payload containing:

- audited origin;
- documented score and deduction logic;
- finding IDs, affected pages, category, severity, evidence, existing recommendation, and confidence;
- known limitations.

The model must return a strict structure containing:

- an executive summary;
- a priority order referencing finding IDs;
- explanations and refined recommendations referencing finding IDs.

## Human verification responsibilities

- Confirm that each AI priority references an existing finding ID.
- Reject any sentence that introduces an uncollected cause or statistic.
- Preserve uncertainty for heuristic and one-run performance findings.
- Edit recommendations for organizational constraints, budget, brand, and legal requirements.
- Treat automated and AI output as draft material until reviewed.

## AI use during development

AI can assist with requirements, architecture, code generation, interface drafting, test-case generation, debugging, and documentation. Human review remains responsible for URL safety, rule accuracy, false-positive handling, data-sharing decisions, and final report approval.
