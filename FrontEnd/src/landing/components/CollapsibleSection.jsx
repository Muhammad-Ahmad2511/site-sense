import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CollapsibleSection({ id, icon, title, subtitle = '', expanded, everExpanded, onToggle, children }) {
  const headerId = `${id}-header`;
  const panelId = `${id}-panel`;
  const contentRef = useRef(null);

  return (
    <div id={id} className="scroll-mt-24">
      <div className="glass-header rounded-2xl overflow-hidden">
        <h2>
          <button
            id={headerId}
            type="button"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => onToggle(id)}
            className="flex w-full min-h-[64px] items-center justify-between gap-4 px-[clamp(1rem,4vw,1.75rem)] py-4 text-left focus-visible:outline-none"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400/20 to-secondary-400/20 text-primary-600 dark:text-primary-300">
                {icon}
              </span>
              <span>
                <span className="block text-lg font-semibold">{title}</span>
                {subtitle && <span className="block text-xs text-muted">{subtitle}</span>}
              </span>
            </span>
            <motion.svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="shrink-0 text-muted"
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.25 }}
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          </button>
        </h2>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="content"
              id={panelId}
              role="region"
              aria-labelledby={headerId}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div ref={contentRef} className="px-[clamp(1rem,4vw,1.75rem)] pb-[clamp(1.25rem,4vw,2rem)] pt-2">
                {/* Lazy-render: heavy children only ever mount once this section
                    has been expanded at least once, then stay mounted so
                    re-collapsing doesn't lose scroll position or re-fetch. */}
                {everExpanded ? children : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
