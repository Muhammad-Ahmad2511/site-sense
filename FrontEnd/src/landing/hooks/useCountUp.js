import { useEffect, useRef, useState } from 'react';

export function useCountUp(target, { duration = 1200, start = false } = {}) {
  const [value, setValue] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!start || !Number.isFinite(target)) return undefined;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setValue(target);
      return undefined;
    }

    const startTime = performance.now();
    const from = 0;
    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration, start]);

  return value;
}
