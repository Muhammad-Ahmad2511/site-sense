import GlassCard from '../components/GlassCard';
import FindingCard from '../components/FindingCard';
import EmptyState from '../components/EmptyState';
import { severityCounts, sortBySeverity } from '../utils/auditGrouping';

export default function AccessibilitySection({ audit, onRecommendationChange }) {
  const findings = sortBySeverity(audit.findings.filter((item) => item.category === 'Accessibility'));
  const counts = severityCounts(findings);
  const coverageNote = audit.limitations.find((item) => item.toLowerCase().includes('axe-core'));

  return (
    <div className="space-y-6">
      <GlassCard className="p-[clamp(1.25rem,4vw,1.75rem)]">
        <h3 className="font-semibold">Violations by severity</h3>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(counts).map(([severity, count]) => (
            <div key={severity} className="rounded-xl track-bg px-4 py-3 text-center">
              <div className="text-lg font-bold">{count}</div>
              <div className="text-xs capitalize text-muted">{severity}</div>
            </div>
          ))}
        </div>
        {coverageNote && <p className="mt-4 text-xs text-muted">{coverageNote}</p>}
      </GlassCard>

      <div>
        <h3 className="mb-3 font-semibold">Accessibility findings</h3>
        {findings.length ? (
          <div className="space-y-3">
            {findings.map((finding) => (
              <FindingCard key={finding.id} finding={finding} onRecommendationChange={onRecommendationChange} />
            ))}
          </div>
        ) : (
          <EmptyState>No accessibility findings were raised for this audit.</EmptyState>
        )}
      </div>
    </div>
  );
}
