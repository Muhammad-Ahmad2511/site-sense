import { useState } from 'react';
import { motion } from 'framer-motion';
import OverviewSection from './OverviewSection';
import SeoSection from './SeoSection';
import AccessibilitySection from './AccessibilitySection';
import TechnicalSection from './TechnicalSection';

const TABS = [
  { key: 'overview', label: 'Overview', Component: OverviewSection },
  { key: 'seo', label: 'SEO', Component: SeoSection },
  { key: 'accessibility', label: 'Accessibility', Component: AccessibilitySection },
  { key: 'technical', label: 'Technical & Conversion', Component: TechnicalSection }
];

export default function AuditResultsSection(props) {
  const [tab, setTab] = useState('overview');
  const ActiveComponent = TABS.find((t) => t.key === tab)?.Component || OverviewSection;

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Audit result categories" className="flex flex-wrap gap-1.5 rounded-xl track-bg p-1.5">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={`relative min-h-[36px] rounded-lg px-3.5 text-sm font-medium transition-colors ${
                active ? 'text-white' : 'text-muted hover:text-current'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="results-tab-pill"
                  className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary-500 to-secondary-500"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <span className="relative z-10">{t.label}</span>
            </button>
          );
        })}
      </div>

      <ActiveComponent {...props} />
    </div>
  );
}
