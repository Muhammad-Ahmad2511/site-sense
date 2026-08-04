import { Layers, Server, AppWindow, ScanEye, Bot, ShieldHalf } from 'lucide-react';
import GlassCard from '../components/GlassCard';

const STACK = [
  { icon: Layers, name: 'React 19 + Vite', role: 'Frontend', detail: 'Component architecture and the dev/build pipeline for this dashboard.' },
  { icon: Server, name: 'Express 5 + Node.js', role: 'Backend API', detail: 'Serves the audit endpoints and this built frontend from one process.' },
  { icon: AppWindow, name: 'Playwright (Chromium)', role: 'Real browser crawl', detail: 'Pages are rendered in an emulated mobile browser, not just fetched as raw HTML.' },
  { icon: ScanEye, name: 'axe-core', role: 'Accessibility engine', detail: 'Industry-standard automated WCAG-aligned rule checks, run in-page.' },
  { icon: Bot, name: 'OpenAI', role: 'Grounded AI explanations', detail: 'Summarizes and prioritizes only the findings the audit already produced.' },
  { icon: ShieldHalf, name: 'Helmet', role: 'Security headers', detail: 'Strict CSP and hardened HTTP headers on every response.' }
];

export default function TechnologyStackSection() {
  return (
    <section id="section-technology" className="scroll-mt-24 py-6">
      <div className="mb-8 text-center">
        <span className="text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-accent">Under the hood</span>
        <h2 className="mt-2 text-[clamp(1.6rem,4vw,2.25rem)] font-extrabold tracking-tight">Built on a real crawl, not a guess</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted sm:text-base">
          The exact technologies powering Site-Sense — a rendered-browser crawl feeding deterministic rules, with AI
          layered on top only to explain results already grounded in evidence.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STACK.map(({ icon: Icon, name, role, detail }, index) => (
          <GlassCard key={name} hover delay={index * 0.06} className="p-[clamp(1.25rem,3.5vw,1.75rem)]">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-secondary-500/15 to-primary-500/15 text-secondary-600 dark:text-accent">
                <Icon size={18} strokeWidth={2} />
              </span>
              <div>
                <h3 className="font-semibold leading-tight">{name}</h3>
                <p className="text-[0.7rem] font-medium uppercase tracking-wide text-muted">{role}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted">{detail}</p>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}
