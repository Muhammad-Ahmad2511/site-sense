import { Search, Accessibility, Gauge, Smartphone, ShieldCheck, Sparkles } from 'lucide-react';
import GlassCard from '../components/GlassCard';

const FEATURES = [
  {
    icon: Search,
    title: 'On-page SEO',
    description: 'Titles, meta descriptions, headings, canonicals, and duplicate content are checked across every crawled page — not just the homepage.'
  },
  {
    icon: Accessibility,
    title: 'Accessibility checks',
    description: 'Automated WCAG-aligned checks powered by axe-core, sampled across pages, surface real violations with evidence attached.'
  },
  {
    icon: Gauge,
    title: 'Core Web Vitals',
    description: 'Load time, LCP, CLS, TTFB, and transfer size are measured in a real emulated mobile browser session, page by page.'
  },
  {
    icon: Smartphone,
    title: 'Mobile & usability',
    description: 'Viewport configuration, tap-target sizing, and horizontal overflow are verified on rendered pages, not just static markup.'
  },
  {
    icon: ShieldCheck,
    title: 'Safe, sandboxed crawling',
    description: 'Every request is validated against private, loopback, and reserved network ranges before it runs — only public websites are ever audited.'
  },
  {
    icon: Sparkles,
    title: 'Grounded AI recommendations',
    description: 'An optional AI pass explains and prioritizes only the findings your audit actually produced — no invented issues, no guessed fixes.'
  }
];

export default function FeaturesSection() {
  return (
    <section id="section-features" className="scroll-mt-24 py-6">
      <div className="mb-8 text-center">
        <span className="text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-accent">What Site-Sense checks</span>
        <h2 className="mt-2 text-[clamp(1.6rem,4vw,2.25rem)] font-extrabold tracking-tight">
          Every audit, backed by evidence
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted sm:text-base">
          One crawl of your whole site produces six categories of findings — each one traceable back to the page and
          data that produced it.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, description }, index) => (
          <GlassCard key={title} hover delay={index * 0.06} className="p-[clamp(1.25rem,3.5vw,1.75rem)]">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/15 to-secondary-500/15 text-primary-600 dark:text-primary-300">
              <Icon size={20} strokeWidth={2} />
            </span>
            <h3 className="mt-4 font-semibold">{title}</h3>
            <p className="mt-1.5 text-sm text-muted">{description}</p>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}
