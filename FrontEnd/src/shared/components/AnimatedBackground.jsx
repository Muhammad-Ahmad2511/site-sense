import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';

/**
 * Shared floating-blob + light-particle background used by both the landing
 * app (with mouse-parallax) and the auth app (static). Blob hues are the
 * Site-Sense brand colors (primary teal, secondary blue, accent mint) —
 * kept subtle so they never compete with foreground content.
 */
export default function AnimatedBackground({ parallax = false, particleCount = 14, leftStep = 41, topStep = 59, sizeMod = 5 }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const blobRefs = useRef([]);

  const particles = useMemo(
    () =>
      Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        left: `${(i * leftStep) % 100}%`,
        top: `${(i * topStep) % 100}%`,
        size: 3 + ((i * 13) % sizeMod),
        delay: `${(i % 6) * 0.8}s`,
        duration: `${8 + (i % 5) * 2}s`
      })),
    [particleCount, leftStep, topStep, sizeMod]
  );

  useEffect(() => {
    if (!parallax) return undefined;
    const handler = (event) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 24;
      const y = (event.clientY / window.innerHeight - 0.5) * 24;
      setOffset({ x, y });
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [parallax]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return undefined;

    const ctx = gsap.context(() => {
      blobRefs.current.forEach((el, index) => {
        if (!el) return;
        gsap.to(el, {
          scale: 1.12,
          opacity: '+=0.06',
          duration: 6 + index * 1.4,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay: index * 0.6
        });
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div
        ref={(el) => (blobRefs.current[0] = el)}
        className="absolute -top-32 -left-24 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-primary-300/40 dark:bg-primary-500/15 blur-3xl animate-blob"
        style={parallax ? { transform: `translate(${offset.x}px, ${offset.y}px)` } : undefined}
      />
      <div
        ref={(el) => (blobRefs.current[1] = el)}
        className="absolute top-1/3 -right-24 h-72 w-72 sm:h-[26rem] sm:w-[26rem] rounded-full bg-secondary-300/35 dark:bg-secondary-500/15 blur-3xl animate-blob [animation-delay:4s]"
        style={parallax ? { transform: `translate(${-offset.x}px, ${-offset.y}px)` } : undefined}
      />
      <div
        ref={(el) => (blobRefs.current[2] = el)}
        className="absolute bottom-0 left-1/4 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-accentc-300/45 dark:bg-accentc-400/10 blur-3xl animate-blob [animation-delay:8s]"
        style={parallax ? { transform: `translate(${offset.x * 0.5}px, ${offset.y * 0.5}px)` } : undefined}
      />

      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full bg-white/60 dark:bg-white/20 animate-float"
          style={{ left: p.left, top: p.top, width: p.size, height: p.size, animationDelay: p.delay, animationDuration: p.duration }}
        />
      ))}
    </div>
  );
}
