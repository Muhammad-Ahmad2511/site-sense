# Test Plan and Failure Scenarios

## Automated tests included

- Missing page title creates a page-specific SEO finding.
- Strong page evidence can produce a 90+ on-page technical SEO score.
- Missing title, description, H1, useful content, and mobile fundamentals cannot receive an inflated score.
- `noindex` utility pages and intentionally canonicalized URLs are excluded from the representative SEO average.
- Redirected pages use their final URL for finding-to-score matching.
- Finding-only fallback scoring remains deterministic and labelled as a heuristic.

Run with:

```bash
npm test
```

## Manual functional tests

| Test | Input or setup | Expected result |
|---|---|---|
| Valid public site | A normal HTTPS marketing site | Homepage and selected same-origin pages are reviewed; results contain evidence and URLs. |
| Address without scheme | `example.com` | Address is normalized to HTTPS. |
| Invalid address | Invalid text | Clear validation error; no report is fabricated. |
| Localhost | `http://localhost` | Request is rejected. |
| Private IPv4 | `http://127.0.0.1` or `http://10.0.0.1` | Request is rejected. |
| Private IPv6 | `http://[::1]` | Request is rejected. |
| URL credentials | `https://user:pass@example.com` | Request is rejected. |
| Non-standard port | `https://example.com:8443` | Request is rejected with a safety explanation. |
| Missing title | Test page without `<title>` | SEO finding includes the final affected URL; the page score is capped. |
| Intentional noindex utility page | Cart/search/account page with `noindex` | Page remains visible in the audit but is excluded from the SEO average. |
| Canonicalized parameter URL | URL canonicalized to a representative page | Canonical is advisory and the duplicate URL does not lower the representative score. |
| Strong evidence page | Complete metadata, headings, content, schema, links, and mobile metrics | On-page technical SEO score can reach 90–100. |
| Weak evidence page | Missing metadata/H1, thin content, poor mobile metrics | SEO score remains around the low range instead of clustering near 70. |
| Missing labels | Form controls without labels | Accessibility finding reports the count and sample selectors. |
| Mobile overflow | Fixed-width element wider than viewport | Mobile usability finding reports measured overflow. |
| Slow page | Deliberately delayed page | Performance observation is reported with the measured value and medium confidence. |
| Blocked page | Page returning 403/anti-bot challenge | Inaccessibility or status is reported; no content findings are guessed. |
| Login-only page | Authentication required | Audit remains incomplete and states the limitation. |
| Broken resources | Page with failed script/image requests | Technical finding lists captured request failures. |
| Long form | More than seven visible editable fields | Conversion-friction heuristic appears with medium confidence. |
| No matching findings after filtering | Apply narrow filters | Empty-state message appears. |
| Edit recommendation | Change recommendation text | Exported JSON contains the edited text. |
| AI not configured | No API key | AI button is hidden; normal audit still works. |
| AI configured | Valid API key | AI explanation references existing finding IDs only and remains editable. |
| AI service failure | Invalid key or provider error | Verified audit remains visible; error states that only the explanation failed. |

## Human verification checklist

- Reproduce high-priority findings in browser developer tools.
- Confirm the reported page and selector/evidence.
- Review axe-core findings for false positives and incomplete coverage.
- Repeat performance measurements before making major decisions.
- Test keyboard navigation and screen-reader behavior manually.
- Review conversion heuristics against the actual business goal.
