import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SEVERITY_COLORS } from '../utils/format';

export default function FindingCard({ finding, onRecommendationChange, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const colors = SEVERITY_COLORS[finding.severity] || SEVERITY_COLORS.low;

  return (
    <div className={`rounded-xl border border-white/10 ${colors.bg} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full min-h-[52px] items-start justify-between gap-3 px-4 py-3 text-left focus-visible:outline-none"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${colors.text} ${colors.bg} ring-1 ${colors.ring}`}>
              {finding.severity}
            </span>
            <span className="text-[11px] text-muted">
              {finding.scoreImpact > 0 ? 'Verified · affects score' : 'Advisory · not scored'}
            </span>
          </div>
          <h4 className="mt-1 truncate font-semibold">{finding.title}</h4>
          <p className="truncate text-xs text-muted" title={finding.pageUrl}>{finding.pageUrl}</p>
        </div>
        <motion.svg
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}
          className="mt-1 shrink-0 text-muted" aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 px-4 pb-4 text-sm">
              <div>
                <h5 className="text-xs font-semibold uppercase tracking-wide text-muted">Collected evidence</h5>
                <p className="mt-1">{finding.evidence}</p>
              </div>
              <div>
                <h5 className="text-xs font-semibold uppercase tracking-wide text-muted">Recommended action — editable</h5>
                <textarea
                  rows={2}
                  value={finding.recommendation}
                  onChange={(e) => onRecommendationChange?.(finding.id, e.target.value)}
                  aria-label={`Editable recommendation for ${finding.title}`}
                  className="glass-input mt-1 w-full rounded-lg px-3 py-2 text-sm"
                />
              </div>
              {finding.aiExplanation && (
                <div>
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-muted">AI explanation</h5>
                  <p className="mt-1">{finding.aiExplanation}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted">
                <span>Category: {finding.category}</span>
                <span>Effort: {finding.effort}</span>
                <span>Confidence: {finding.confidence}</span>
                <span>Rule: {finding.ruleId}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
