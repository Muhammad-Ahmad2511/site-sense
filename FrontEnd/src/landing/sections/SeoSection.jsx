import GlassCard from '../components/GlassCard';
import FindingCard from '../components/FindingCard';
import EmptyState from '../components/EmptyState';
import { sortBySeverity } from '../utils/auditGrouping';

const COMPONENT_LABELS = {
  technical: 'Technical (status, HTTPS, indexability)',
  onPage: 'On-page (title, description, headings)',
  content: 'Content (length, links, image alt)',
  searchReadiness: 'Search readiness (Open Graph, uniqueness)',
  mobilePerformance: 'Mobile usability'
};

export default function SeoSection({ audit, onRecommendationChange }) {
  const findings = sortBySeverity(audit.findings.filter((item) => item.category === 'SEO'));
  const breakdown = audit.scores.seoBreakdown || {};

  return (
    <div className="space-y-6">
      <GlassCard className="p-[clamp(1.25rem,4vw,1.75rem)]">
        <h3 className="font-semibold">On-page SEO breakdown</h3>
        <div className="mt-4 space-y-3">
          {Object.entries(COMPONENT_LABELS).map(([key, label]) => {
            const value = Number(breakdown[key]) || 0;
            return (
              <div key={key}>
                <div className="mb-1 flex justify-between text-xs text-muted">
                  <span>{label}</span>
                  <span>{value}/100</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full track-bg">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-400 to-secondary-400 transition-[width] duration-700"
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {breakdown.note && <p className="mt-4 text-xs text-muted">{breakdown.note}</p>}
        {Boolean(breakdown.pagesExcludedFromSeo) && (
          <p className="mt-1 text-xs text-muted">
            {breakdown.pagesExcludedFromSeo} noindex or intentionally canonicalized page(s) excluded from scoring.
          </p>
        )}
      </GlassCard>

      <div>
        <h3 className="mb-3 font-semibold">SEO findings</h3>
        {findings.length ? (
          <div className="space-y-3">
            {findings.map((finding) => (
              <FindingCard key={finding.id} finding={finding} onRecommendationChange={onRecommendationChange} />
            ))}
          </div>
        ) : (
          <EmptyState>No SEO findings were raised for this audit.</EmptyState>
        )}
      </div>
    </div>
  );
}
