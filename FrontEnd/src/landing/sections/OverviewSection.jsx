import GlassCard from '../components/GlassCard';
import MetricCard from '../components/MetricCard';
import { formatDuration } from '../utils/format';

const CATEGORY_DESCRIPTIONS = {
  SEO: 'On-page technical SEO',
  Accessibility: 'Automated WCAG-aligned checks',
  Performance: 'Load, Core Web Vitals, payload',
  'Mobile & Usability': 'Viewport, tap targets, overflow',
  Conversion: 'Heuristic UX/CTA signals',
  Technical: 'HTTP status & runtime errors'
};

function authorityDisplay(authority = {}) {
  if (authority.available && Number.isFinite(authority.score)) {
    const note = Number.isFinite(authority.rank)
      ? `${authority.provider} rank #${Number(authority.rank).toLocaleString()}`
      : authority.note || authority.reason || authority.provider;
    return { text: `${authority.score}/100`, note };
  }
  if (authority.disabled) {
    return { text: 'Disabled', note: authority.reason || 'Authority lookup is disabled in this environment.' };
  }
  return { text: 'Retry needed', note: authority.reason || 'Authority providers could not be reached.' };
}

export default function OverviewSection({ audit, aiConfigured, onJumpToAiSummary }) {
  const { scores, pages, findings, durationMs, auditedAt, finalOrigin, normalizedUrl } = audit;
  const authority = authorityDisplay(scores.authority);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <span>{finalOrigin || normalizedUrl}</span>
        <span>
          {new Date(auditedAt).toLocaleString()} · {pages.length} page(s) · {findings.length} finding(s) · {formatDuration(durationMs)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard label="Overall Score" score={scores.overall} description="Weighted across all categories" />
        {Object.entries(scores.categories).map(([category, score], index) => (
          <MetricCard
            key={category}
            label={category}
            score={score}
            description={CATEGORY_DESCRIPTIONS[category]}
            delay={0.05 * (index + 1)}
          />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <GlassCard className="p-[clamp(1.25rem,4vw,1.75rem)]">
          <h3 className="font-semibold">Domain Authority Estimate</h3>
          <p className="mt-1 text-2xl font-bold">{authority.text}</p>
          <p className="mt-1 text-xs text-muted">{authority.note} · public popularity estimate, separate from technical SEO.</p>
        </GlassCard>

        <GlassCard className="flex flex-col justify-between gap-3 p-[clamp(1.25rem,4vw,1.75rem)]">
          <div>
            <h3 className="font-semibold">AI Summary</h3>
            <p className="mt-1 text-xs text-muted">
              {aiConfigured
                ? 'A grounded executive summary and priority action plan generated only from verified finding IDs.'
                : 'AI explanations are not configured on this deployment — verified findings remain fully available below.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onJumpToAiSummary}
            className="min-h-[40px] self-start rounded-lg bg-gradient-to-r from-primary-500 to-secondary-500 px-4 text-sm font-semibold text-white shadow shadow-primary-500/30"
          >
            Go to AI Recommendations →
          </button>
        </GlassCard>
      </div>
    </div>
  );
}
