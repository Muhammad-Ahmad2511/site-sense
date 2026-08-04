import { getPasswordStrength } from '../utils/validation';

const COLORS = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-primary-400', 'bg-primary-500'];

export default function PasswordStrengthMeter({ password }) {
  if (!password) return null;
  const { score, label } = getPasswordStrength(password);
  const filled = Math.max(score, 1);
  const color = COLORS[score];

  return (
    <div className="flex flex-col gap-1" aria-live="polite">
      <div className="flex h-1.5 w-full gap-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
        {[0, 1, 2, 3].map((step) => (
          <div
            key={step}
            className={`h-full flex-1 rounded-full transition-colors duration-300 ${step < filled ? color : 'bg-transparent'}`}
          />
        ))}
      </div>
      <span className="text-xs text-muted">Password strength: {label}</span>
    </div>
  );
}
