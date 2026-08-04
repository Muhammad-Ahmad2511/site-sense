import { motion, AnimatePresence } from 'framer-motion';
import { STAGE_LABELS } from '../services/auditService';

export default function LoadingOverlay({ active, progress }) {
  const percent = Math.max(0, Math.min(100, Number(progress?.percent ?? 0)));
  const title = STAGE_LABELS[progress?.stage] || 'Processing audit…';

  const stats = [];
  if (Number.isFinite(progress?.pagesReviewed) && Number.isFinite(progress?.pageTarget)) {
    stats.push(`${progress.pagesReviewed}/${progress.pageTarget} pages reviewed`);
  } else if (Number.isFinite(progress?.pagesReviewed)) {
    stats.push(`${progress.pagesReviewed} pages reviewed`);
  }
  if (Number.isFinite(progress?.pagesQueued)) stats.push(`${progress.pagesQueued} queued`);
  if (Number.isFinite(progress?.findingsFound)) stats.push(`${progress.findingsFound} findings`);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="glass-panel w-full max-w-md rounded-2xl p-[clamp(1.5rem,5vw,2.5rem)] text-center"
          >
            <div className="relative mx-auto mb-6 h-20 w-20">
              <svg className="h-20 w-20 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" className="text-black/10 dark:text-white/10" />
                <path
                  d="M12 2a10 10 0 0 1 10 10"
                  stroke="#05b084"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">{Math.round(percent)}%</div>
            </div>

            <h2 className="shimmer-text text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted">{progress?.message || 'The backend is analysing the website.'}</p>

            <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full track-bg">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary-400 to-secondary-400"
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>

            {stats.length > 0 && <p className="mt-3 text-xs text-muted">{stats.join(' · ')}</p>}
            {progress?.currentUrl && (
              <code className="mt-2 block truncate text-xs text-muted" title={progress.currentUrl}>
                {progress.currentUrl}
              </code>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
