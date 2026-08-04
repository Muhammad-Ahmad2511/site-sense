import GlassCard from '../components/GlassCard';
import FindingCard from '../components/FindingCard';
import EmptyState from '../components/EmptyState';
import { sortBySeverity } from '../utils/auditGrouping';

export default function TechnicalSection({ audit, onRecommendationChange }) {
  const technicalFindings = sortBySeverity(audit.findings.filter((item) => item.category === 'Technical'));
  const conversionFindings = sortBySeverity(audit.findings.filter((item) => item.category === 'Conversion'));

  const pages = audit.pages;
  const httpsCount = pages.filter((page) => /^https:/i.test(page.finalUrl || page.url || '')).length;
  const errorStatusCount = pages.filter((page) => Number(page.status) >= 400).length;

  return (
    <div className="space-y-6">
      <GlassCard className="p-[clamp(1.25rem,4vw,1.75rem)]">
        <h3 className="font-semibold">Technical health</h3>
        <p className="mt-1 text-xs text-muted">
          Derived directly from crawled page responses — HTTP status, transport, and runtime errors captured during the audit.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl track-bg px-4 py-3 text-center">
            <div className="text-lg font-bold">{httpsCount}/{pages.length}</div>
            <div className="text-xs text-muted">Pages served over HTTPS</div>
          </div>
          <div className="rounded-xl track-bg px-4 py-3 text-center">
            <div className="text-lg font-bold">{errorStatusCount}</div>
            <div className="text-xs text-muted">Pages with 4xx/5xx status</div>
          </div>
          <div className="rounded-xl track-bg px-4 py-3 text-center">
            <div className="text-lg font-bold">{audit.scores.categories.Technical}/100</div>
            <div className="text-xs text-muted">Technical score</div>
          </div>
        </div>
      </GlassCard>

      <div>
        <h3 className="mb-3 font-semibold">Technical findings</h3>
        {technicalFindings.length ? (
          <div className="space-y-3">
            {technicalFindings.map((finding) => (
              <FindingCard key={finding.id} finding={finding} onRecommendationChange={onRecommendationChange} />
            ))}
          </div>
        ) : (
          <EmptyState>No technical findings were raised for this audit.</EmptyState>
        )}
      </div>

      <div>
        <h3 className="mb-3 font-semibold">Conversion &amp; UX heuristics</h3>
        <p className="mb-3 text-xs text-muted">
          Low-confidence heuristic signals (clear call-to-action, contact path, form length) that require human review.
        </p>
        {conversionFindings.length ? (
          <div className="space-y-3">
            {conversionFindings.map((finding) => (
              <FindingCard key={finding.id} finding={finding} onRecommendationChange={onRecommendationChange} />
            ))}
          </div>
        ) : (
          <EmptyState>No conversion heuristic findings were raised for this audit.</EmptyState>
        )}
      </div>
    </div>
  );
}
