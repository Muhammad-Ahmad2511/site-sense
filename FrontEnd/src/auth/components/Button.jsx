import { motion } from 'framer-motion';

export default function Button({
  children,
  loading = false,
  disabled = false,
  variant = 'primary',
  type = 'button',
  className = '',
  ...props
}) {
  const isDisabled = disabled || loading;
  const base =
    'relative flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-[15px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-60';
  const variants = {
    primary: 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg shadow-primary-500/30 hover:opacity-90 active:opacity-100',
    secondary: 'glass-input hover:bg-white/70 dark:hover:bg-white/10'
  };

  return (
    <motion.button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      whileHover={isDisabled ? {} : { scale: 1.015 }}
      whileTap={isDisabled ? {} : { scale: 0.985 }}
      transition={{ duration: 0.15 }}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && (
        <svg
          className="h-5 w-5 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      <span>{children}</span>
    </motion.button>
  );
}
