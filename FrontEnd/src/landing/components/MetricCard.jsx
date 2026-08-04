import GlassCard from './GlassCard';
import CircularScore from './CircularScore';

export default function MetricCard({ label, score, description, delay = 0 }) {
  return (
    <GlassCard
      delay={delay}
      hover
      className="relative flex flex-col items-center gap-3 overflow-hidden p-[clamp(1rem,3vw,1.5rem)] text-center"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-400 via-accentc-300 to-secondary-400 opacity-80" />
      <CircularScore score={score} />
      <div>
        <h3 className="font-semibold">{label}</h3>
        {description && <p className="mt-1 text-xs text-muted">{description}</p>}
      </div>
    </GlassCard>
  );
}
