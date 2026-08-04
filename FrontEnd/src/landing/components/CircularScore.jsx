import { useEffect, useRef, useState } from 'react';
import { useCountUp } from '../hooks/useCountUp';
import { scoreColor } from '../utils/format';

export default function CircularScore({ score, size = 96, label }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const value = useCountUp(score, { start: visible });
  const { stroke, text } = scoreColor(score);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - (visible ? score : 0) / 100);

  return (
    <div ref={ref} className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth="8" className="track-bg" fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth="8"
            fill="none"
            stroke={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xl font-bold ${text}`}>{value}</span>
        </div>
      </div>
      {label && <span className="text-sm font-medium text-muted text-center">{label}</span>}
    </div>
  );
}
