import GlassCard from '../components/GlassCard';
import FindingCard from '../components/FindingCard';
import EmptyState from '../components/EmptyState';
import { formatMetric, formatBytes } from '../utils/format';
import { sortBySeverity } from '../utils/auditGrouping';

function StatTile({ label, value }) {
  return (
    <div className="rounded-xl track-bg px-4 py-3 text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function PageBar({ page, maxLcp }) {
  const lcp = page.metrics?.lcp;
  const widthPct = Number.isFinite(lcp) && maxLcp ? Math.max(4, (lcp / maxLcp) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-1/3 truncate text-xs text-muted" title={page.finalUrl || page.url}>
        {page.title || page.finalUrl || page.url}
      </span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full track-bg">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary-400 to-secondary-400 transition-[width] duration-700"
          style={{ width: `${widthPct}%` }}
        />
      </div>
      <span className="w-16 shrink-0 text-right text-xs font-medium">{formatMetric(lcp)}</span>
    </div>
  );
}

export default function PerformanceSection({ audit, onRecommendationChange }) {
  const homepage = audit.pages[0];
  const perfFindings = sortBySeverity(audit.findings.filter((item) => item.category === 'Performance'));
  const mobileFindings = sortBySeverity(audit.findings.filter((item) => item.category === 'Mobile & Usability'));
  const pagesWithLcp = audit.pages.filter((page) => Number.isFinite(page.metrics?.lcp));
  const maxLcp = Math.max(...pagesWithLcp.map((page) => page.metrics.lcp), 1);

  return (
    <div className="space-y-6">
      <GlassCard className="p-[clamp(1.25rem,4vw,1.75rem)]">
        <h3 className="font-semibold">Core Web Vitals & speed — homepage</h3>
        <p className="mt-1 text-xs text-muted">Measured in one emulated mobile browser session on the audited homepage.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Load" value={formatMetric(homepage?.metrics?.load)} />
          <StatTile label="LCP" value={formatMetric(homepage?.metrics?.lcp)} />
          <StatTile label="CLS" value={Number.isFinite(homepage?.metrics?.cls) ? homepage.metrics.cls.toFixed(3) : 'Unavailable'} />
          <StatTile label="TTFB" value={formatMetric(homepage?.metrics?.ttfb)} />
          <StatTile label="FCP" value={formatMetric(homepage?.metrics?.fcp)} />
          <StatTile label="Transferred" value={formatBytes(homepage?.metrics?.transferBytes)} />
          <StatTile label="Requests" value={homepage?.metrics?.requestCount ?? '—'} />
        </div>
      </GlassCard>

      {pagesWithLcp.length > 1 && (
        <GlassCard className="p-[clamp(1.25rem,4vw,1.75rem)]">
          <h3 className="mb-4 font-semibold">Largest Contentful Paint by page</h3>
          <div className="space-y-3">
            {pagesWithLcp.slice(0, 12).map((page) => (
              <PageBar key={page.url} page={page} maxLcp={maxLcp} />
            ))}
          </div>
        </GlassCard>
      )}

      <div>
        <h3 className="mb-3 font-semibold">Performance recommendations</h3>
        {perfFindings.length ? (
          <div className="space-y-3">
            {perfFindings.map((finding) => (
              <FindingCard key={finding.id} finding={finding} onRecommendationChange={onRecommendationChange} />
            ))}
          </div>
        ) : (
          <EmptyState>No performance findings were raised for this audit.</EmptyState>
        )}
      </div>

      <div>
        <h3 className="mb-3 font-semibold">Mobile &amp; Usability</h3>
        {mobileFindings.length ? (
          <div className="space-y-3">
            {mobileFindings.map((finding) => (
              <FindingCard key={finding.id} finding={finding} onRecommendationChange={onRecommendationChange} />
            ))}
          </div>
        ) : (
          <EmptyState>No mobile usability findings were raised for this audit.</EmptyState>
        )}
      </div>
    </div>
  );
}
