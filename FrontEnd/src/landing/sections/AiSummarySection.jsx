import { useState } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';
import { requestAiSummary } from '../services/auditService';
import { buildRoadmap } from '../utils/auditGrouping';

const ROADMAP_COLUMNS = [
  { key: 'now', title: 'Now', subtitle: 'Critical or high-impact, low/medium effort' },
  { key: 'next', title: 'Next', subtitle: 'Everything else worth planning for' },
  { key: 'later', title: 'Later', subtitle: 'Low severity, or high-effort/medium-severity' }
];

function downloadJson(audit) {
  const blob = new Blob([JSON.stringify(audit, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  const hostname = (() => {
    try {
      return new URL(audit.normalizedUrl).hostname;
    } catch {
      return 'report';
    }
  })();
  link.download = `website-audit-${hostname}-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function AiSummarySection({ audit, aiConfigured, onApplyAiExplanations }) {
  const [state, setState] = useState('idle'); // idle | loading | loaded | error
  const [error, setError] = useState('');
  const [summary, setSummary] = useState('');
  const [priorityOrder, setPriorityOrder] = useState([]);

  const roadmap = buildRoadmap(audit.findings);
  const findingMap = new Map(audit.findings.map((item) => [item.id, item]));

  async function generate() {
    setState('loading');
    setError('');
    try {
      const explanation = await requestAiSummary(audit);
      setSummary(explanation.executiveSummary);
      setPriorityOrder(explanation.priorityOrder || []);
      onApplyAiExplanations(explanation.findingExplanations || []);
      setState('loaded');
    } catch (err) {
      setError(err.message || 'The AI explanation failed. Verified findings remain unchanged.');
      setState('error');
    }
  }

  return (
    <div className="space-y-6">
      <GlassCard className="relative overflow-hidden p-[clamp(1.5rem,5vw,2.5rem)]">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-400/10 via-accentc-300/10 to-secondary-400/10" />
        <div className="relative">
          <h3 className="text-xl font-bold">Executive Summary</h3>
          {!aiConfigured ? (
            <EmptyState>AI explanations are not configured on this deployment. Verified findings above remain fully available.</EmptyState>
          ) : state === 'idle' ? (
            <div className="mt-3">
              <p className="text-sm text-muted">Generate a grounded executive summary from only this audit's verified finding IDs.</p>
              <button
                type="button"
                onClick={generate}
                className="mt-3 min-h-[44px] rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 px-5 text-sm font-semibold text-white shadow-lg shadow-primary-500/30"
              >
                Generate grounded AI explanation
              </button>
            </div>
          ) : state === 'loading' ? (
            <p className="mt-3 text-sm text-muted">Generating…</p>
          ) : state === 'error' ? (
            <div className="mt-3">
              <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
              <button type="button" onClick={generate} className="mt-3 min-h-[40px] rounded-lg glass-input px-4 text-sm font-medium">
                Retry
              </button>
            </div>
          ) : (
            <>
              <textarea
                rows={5}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                aria-label="Editable AI executive summary"
                className="glass-input mt-3 w-full rounded-xl px-4 py-3 text-sm"
              />
              <button
                type="button"
                onClick={generate}
                className="mt-2 min-h-[36px] rounded-lg glass-input px-4 text-xs font-medium"
              >
                Regenerate
              </button>
            </>
          )}
        </div>
      </GlassCard>

      {state === 'loaded' && priorityOrder.length > 0 && (
        <GlassCard className="p-[clamp(1.25rem,4vw,1.75rem)]">
          <h3 className="font-semibold">Priority fixes</h3>
          <ol className="mt-3 space-y-2">
            {priorityOrder.map((item, index) => {
              const finding = findingMap.get(item.findingId);
              return (
                <li key={item.findingId} className="flex gap-3 rounded-xl track-bg px-4 py-3 text-sm">
                  <span className="font-bold text-primary-600 dark:text-primary-300">{index + 1}.</span>
                  <span>
                    <strong>{finding?.title || item.findingId}</strong> — {item.reason}
                  </span>
                </li>
              );
            })}
          </ol>
        </GlassCard>
      )}

      <div>
        <h3 className="mb-1 font-semibold">Roadmap &amp; action plan</h3>
        <p className="mb-3 text-xs text-muted">
          Grouped from each finding's real severity (impact) and effort (difficulty) — nothing here is estimated beyond the
          audit's own data.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {ROADMAP_COLUMNS.map((column, columnIndex) => (
            <motion.div
              key={column.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: columnIndex * 0.1, duration: 0.4 }}
              className="glass-panel rounded-2xl p-4"
            >
              <h4 className="font-semibold">{column.title}</h4>
              <p className="mb-3 text-xs text-muted">{column.subtitle}</p>
              {roadmap[column.key].length ? (
                <ul className="space-y-2">
                  {roadmap[column.key].slice(0, 6).map((item) => (
                    <li key={item.id} className="rounded-lg track-bg px-3 py-2 text-xs">
                      <div className="font-medium">{item.title}</div>
                      <div className="mt-1 flex gap-3 text-muted">
                        <span>Impact: {item.severity}</span>
                        <span>Difficulty: {item.effort}</span>
                      </div>
                    </li>
                  ))}
                  {roadmap[column.key].length > 6 && (
                    <li className="text-xs text-muted">+{roadmap[column.key].length - 6} more</li>
                  )}
                </ul>
              ) : (
                <p className="text-xs text-muted">Nothing in this bucket.</p>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <GlassCard className="flex flex-wrap items-center justify-between gap-3 p-[clamp(1.25rem,4vw,1.75rem)]">
        <div>
          <h3 className="font-semibold">Export report</h3>
          <p className="text-xs text-muted">Download the complete evidence-based audit as JSON, or print/save as PDF.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => downloadJson(audit)} className="min-h-[40px] rounded-lg glass-input px-4 text-sm font-medium">
            Export JSON
          </button>
          <button type="button" onClick={() => window.print()} className="min-h-[40px] rounded-lg glass-input px-4 text-sm font-medium">
            Print / Save PDF
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
