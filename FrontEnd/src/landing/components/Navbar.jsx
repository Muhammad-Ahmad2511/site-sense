import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { Radar, Menu, X, LogOut } from 'lucide-react';
import { signInUrl } from '../services/session';

// "Audit" scrolls to the same hero section as "Home" but never shows the
// active pill itself — two nav items simultaneously claiming the shared
// framer-motion layoutId would fight over which one actually renders it.
const NAV_ITEMS = [
  { id: 'section-home', label: 'Home' },
  { id: 'section-features', label: 'Features' },
  { id: 'section-home', label: 'Audit', noHighlight: true },
  { id: 'section-audit-results', label: 'Results', requiresAudit: true },
  { id: 'footer-about', label: 'About' },
  { id: 'footer-faq', label: 'FAQ' },
  { id: 'footer-contact', label: 'Contact' }
];

export default function Navbar({ hasResults, activeId, onNavigate, onRunAudit, user, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shrunk, setShrunk] = useState(false);
  const listRef = useRef(null);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => setShrunk(latest > 48));

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const closeOnResize = () => setMobileOpen(false);
    window.addEventListener('resize', closeOnResize);
    return () => window.removeEventListener('resize', closeOnResize);
  }, [mobileOpen]);

  function handleKeyDown(event, index) {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % NAV_ITEMS.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + NAV_ITEMS.length) % NAV_ITEMS.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = NAV_ITEMS.length - 1;
    const buttons = listRef.current?.querySelectorAll('[data-nav-item]');
    buttons?.[nextIndex]?.focus();
  }

  return (
    <motion.nav
      aria-label="Primary"
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0, scale: shrunk ? 0.96 : 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="fixed inset-x-0 top-[clamp(0.6rem,3vw,1.1rem)] z-40 mx-auto flex w-fit max-w-[94vw] justify-center"
    >
      <motion.div
        layout
        className="glass-panel flex items-center gap-1 rounded-full py-1.5 pl-2 pr-1.5 transition-[padding] duration-300"
        style={{ paddingTop: shrunk ? 4 : 6, paddingBottom: shrunk ? 4 : 6 }}
      >
        <a href="#section-home" onClick={(e) => { e.preventDefault(); onNavigate('section-home'); }} className="mr-1 flex items-center gap-1.5 rounded-full px-2 py-1.5 sm:px-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 text-white shadow shadow-primary-500/30">
            <Radar size={15} strokeWidth={2.4} />
          </span>
          <span className="hidden text-sm font-bold tracking-tight sm:inline">Site-Sense</span>
        </a>

        <div ref={listRef} role="tablist" className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item, index) => {
            const active = activeId === item.id && !item.noHighlight;
            const dim = item.requiresAudit && !hasResults;
            return (
              <button
                key={`${item.id}-${item.label}`}
                data-nav-item
                role="tab"
                aria-selected={active}
                tabIndex={active || (!activeId && index === 0) ? 0 : -1}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onClick={() => onNavigate(item.id)}
                className={`relative min-h-[34px] rounded-full px-3.5 text-[0.83rem] font-medium transition-colors duration-200 focus-visible:outline-none ${
                  active ? 'text-white' : dim ? 'text-muted/50 hover:text-muted' : 'text-muted hover:text-current'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 shadow"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </div>

        {user ? (
          <button
            type="button"
            onClick={onLogout}
            className="hidden min-h-[34px] items-center gap-1 rounded-full px-3 text-xs font-medium text-muted hover:text-current lg:flex"
            title={`Sign out ${user.name || user.email}`}
          >
            <LogOut size={14} /> Sign out
          </button>
        ) : (
          <a
            href={signInUrl('/')}
            className="hidden min-h-[34px] items-center gap-1 rounded-full px-3 text-xs font-medium text-muted hover:text-current lg:flex"
          >
            Sign in
          </a>
        )}

        <button
          type="button"
          onClick={onRunAudit}
          className="ml-1 hidden min-h-[34px] items-center rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 px-4 text-[0.83rem] font-semibold text-white shadow shadow-primary-500/30 transition-transform hover:scale-[1.03] active:scale-95 sm:flex"
        >
          Run Audit
        </button>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-label="Open section navigation"
          className="flex min-h-[34px] min-w-[34px] items-center justify-center rounded-full lg:hidden"
        >
          {mobileOpen ? <X size={17} /> : <Menu size={17} />}
        </button>
      </motion.div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass-panel absolute top-14 flex w-64 flex-col gap-1 rounded-2xl p-2 lg:hidden"
          >
            {NAV_ITEMS.map((item) => (
              <button
                key={`m-${item.id}-${item.label}`}
                onClick={() => {
                  onNavigate(item.id);
                  setMobileOpen(false);
                }}
                className={`min-h-[44px] rounded-xl px-3 text-left text-sm font-medium ${
                  activeId === item.id && !item.noHighlight ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white' : 'text-muted hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => {
                onRunAudit();
                setMobileOpen(false);
              }}
              className="mt-1 min-h-[44px] rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 px-3 text-left text-sm font-semibold text-white"
            >
              Run Audit
            </button>
            {user ? (
              <button
                onClick={onLogout}
                className="min-h-[44px] rounded-xl px-3 text-left text-sm font-medium text-muted hover:bg-black/5 dark:hover:bg-white/5"
              >
                Sign out
              </button>
            ) : (
              <a
                href={signInUrl('/')}
                className="flex min-h-[44px] items-center rounded-xl px-3 text-left text-sm font-medium text-muted hover:bg-black/5 dark:hover:bg-white/5"
              >
                Sign in
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
