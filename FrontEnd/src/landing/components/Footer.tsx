import { Radar, GitBranch } from 'lucide-react';

const FAQS = [
  {
    q: 'Does running an audit require an account?',
    a: 'No. Enter a public website address and Site-Sense runs the audit immediately — sign-in is only needed for future premium features.'
  },
  {
    q: 'Can findings be invented or guessed?',
    a: 'No. Every finding is produced by a deterministic rule against real, collected page evidence. Anything the AI adds only explains findings that already exist.'
  },
  {
    q: 'Which sites can be audited?',
    a: 'Any publicly reachable website. Local, private, and reserved network addresses are blocked before a crawl ever starts.'
  }
];

const QUICK_LINKS = [
  { label: 'Home', href: '#section-home' },
  { label: 'Features', href: '#section-features' },
  { label: 'Technology', href: '#section-technology' }
];

const RESOURCES = [
  { label: 'Sign in', href: '/auth/' },
  { label: 'API status', href: '/api/status' },
  { label: 'GitHub', href: 'https://github.com/Muhammad-Ahmad2511/site-sense', external: true }
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer id="section-footer" className="glass-header scroll-mt-24 border-t">
      <div className="mx-auto max-w-5xl px-[clamp(1rem,5vw,2rem)] py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.3fr_repeat(3,1fr)]">
          <div id="footer-about" className="scroll-mt-24">
            <a href="#section-home" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 text-white shadow shadow-primary-500/30">
                <Radar size={17} strokeWidth={2.4} />
              </span>
              <span className="text-[1.05rem] font-bold tracking-tight">Site-Sense</span>
            </a>
            <p className="mt-4 max-w-xs text-[0.9rem] leading-relaxed text-muted">
              Website audits that cite their evidence. No invented findings, no guessing when a page can&apos;t be
              reached — just what the crawl actually found.
            </p>
          </div>

          <div>
            <h3 className="text-[0.8rem] font-semibold uppercase tracking-wide text-muted">Quick Links</h3>
            <ul className="mt-4 space-y-3">
              {QUICK_LINKS.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-[0.9rem] text-current/80 transition-colors hover:text-primary-600 dark:hover:text-primary-300">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[0.8rem] font-semibold uppercase tracking-wide text-muted">Resources</h3>
            <ul className="mt-4 space-y-3">
              {RESOURCES.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="text-[0.9rem] text-current/80 transition-colors hover:text-primary-600 dark:hover:text-primary-300"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div id="footer-contact" className="scroll-mt-24">
            <h3 className="text-[0.8rem] font-semibold uppercase tracking-wide text-muted">Legal &amp; Contact</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <a href="#" className="text-[0.9rem] text-current/80 transition-colors hover:text-primary-600 dark:hover:text-primary-300">Privacy policy</a>
              </li>
              <li>
                <a href="#" className="text-[0.9rem] text-current/80 transition-colors hover:text-primary-600 dark:hover:text-primary-300">Terms of service</a>
              </li>
              <li>
                <a href="mailto:mahmadimran383@gmail.com" className="text-[0.9rem] text-current/80 transition-colors hover:text-primary-600 dark:hover:text-primary-300">mahmadimran383@gmail.com</a>
              </li>
            </ul>
          </div>
        </div>

        <div id="footer-faq" className="mt-14 scroll-mt-24 border-t border-[var(--glass-border)] pt-10">
          <h3 className="text-[0.8rem] font-semibold uppercase tracking-wide text-muted">Frequently asked questions</h3>
          <div className="mt-4 grid gap-6 sm:grid-cols-3">
            {FAQS.map((item) => (
              <div key={item.q}>
                <p className="text-sm font-semibold">{item.q}</p>
                <p className="mt-1.5 text-[0.85rem] leading-relaxed text-muted">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-[var(--glass-border)] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.85rem] text-muted">© {year} Site-Sense. All rights reserved.</p>
          <a
            href="https://github.com/Muhammad-Ahmad2511/site-sense"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[0.85rem] text-muted transition-colors hover:text-current"
          >
            <GitBranch size={15} /> GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
