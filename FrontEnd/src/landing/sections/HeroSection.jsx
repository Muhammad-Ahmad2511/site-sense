import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ArrowRight, Sparkles } from 'lucide-react';

const EXAMPLE_URL = 'https://example.com';
const BADGES = [
  { label: 'AI-Powered Analysis', top: '10%', left: '4%', delay: 0 },
  { label: 'Evidence-Based Scoring', top: '68%', left: '2%', delay: 0.4 },
  { label: 'Real-Time Crawl', top: '18%', right: '4%', delay: 0.2 },
  { label: 'No Invented Results', top: '62%', right: '3%', delay: 0.6 }
];

export default function HeroSection({ onAnalyze, isBusy, error, inputId = 'hero-url' }) {
  const [url, setUrl] = useState('');
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const headlineRef = useRef(null);

  useEffect(() => {
    const handler = (event) => {
      setParallax({
        x: (event.clientX / window.innerWidth - 0.5) * 16,
        y: (event.clientY / window.innerHeight - 0.5) * 16
      });
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !headlineRef.current) return undefined;
    const words = headlineRef.current.querySelectorAll('[data-word]');
    const ctx = gsap.context(() => {
      gsap.fromTo(
        words,
        { yPercent: 120, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.9, ease: 'power4.out', stagger: 0.06, delay: 0.15 }
      );
    });
    return () => ctx.revert();
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    if (isBusy || !url.trim()) return;
    onAnalyze(url.trim());
  }

  const headline = 'See your website the way an auditor does';

  return (
    <section
      id="section-home"
      className="relative flex min-h-screen scroll-mt-24 flex-col items-center justify-center overflow-hidden px-[clamp(1rem,5vw,2rem)] pt-24 pb-16"
    >
      {BADGES.map((badge) => (
        <motion.div
          key={badge.label}
          className="glass-panel absolute hidden items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium text-muted md:flex animate-float"
          style={{
            top: badge.top,
            left: badge.left,
            right: badge.right,
            animationDelay: `${badge.delay}s`,
            transform: `translate(${parallax.x * (badge.left ? 1 : -1)}px, ${parallax.y}px)`
          }}
        >
          <Sparkles size={12} className="text-primary-500" />
          {badge.label}
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="z-10 flex max-w-2xl flex-col items-center gap-5 text-center"
      >
        <span className="rounded-full glass-panel px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-secondary-500 dark:text-accent">
          Site-Sense · AI Audit Dashboard
        </span>
        <h1
          ref={headlineRef}
          className="text-[clamp(2rem,6vw,3.5rem)] font-extrabold leading-[1.05] tracking-tight"
        >
          {headline.split(' ').map((word, i) => (
            <span key={i} className="inline-block overflow-hidden pb-1 pr-[0.3em] align-bottom">
              <span data-word className="inline-block">
                {word}
              </span>
            </span>
          ))}
        </h1>
        <p className="max-w-lg text-[clamp(0.95rem,2vw,1.1rem)] text-muted">
          Enter a public website address and get an evidence-based report across performance, accessibility, SEO, and
          technical health — every finding traceable to real, collected data.
        </p>

        <form onSubmit={handleSubmit} className="mt-2 w-full max-w-xl">
          <div className="glass-panel gradient-border flex flex-col gap-2 rounded-2xl p-2 sm:flex-row">
            <label htmlFor={inputId} className="sr-only">
              Public website address
            </label>
            <input
              id={inputId}
              type="text"
              inputMode="url"
              autoComplete="url"
              placeholder={`e.g. ${EXAMPLE_URL}`}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isBusy}
              className="glass-input min-h-[48px] flex-1 rounded-xl px-4 text-[16px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
            />
            <motion.button
              type="submit"
              disabled={isBusy || !url.trim()}
              whileHover={isBusy ? {} : { scale: 1.02, y: -1 }}
              whileTap={isBusy ? {} : { scale: 0.98 }}
              className="glow-primary flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 px-6 font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBusy ? 'Analysing…' : 'Run Audit'}
              {!isBusy && <ArrowRight size={16} />}
            </motion.button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Try{' '}
            <button
              type="button"
              onClick={() => setUrl(EXAMPLE_URL)}
              className="font-medium text-primary-600 underline-offset-2 hover:underline dark:text-primary-300"
            >
              {EXAMPLE_URL}
            </button>
          </p>
          {error && (
            <p role="alert" className="mt-3 rounded-xl bg-red-500/10 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </form>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="absolute bottom-8 flex flex-col items-center gap-1 text-xs text-muted"
      >
        <span>Scroll to explore</span>
        <motion.svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          animate={{ y: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity }}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </motion.div>
    </section>
  );
}
