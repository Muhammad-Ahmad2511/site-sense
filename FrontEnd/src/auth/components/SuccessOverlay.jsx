import { motion } from 'framer-motion';

export default function SuccessOverlay({ message }) {
  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass-panel absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-[clamp(1rem,3vw,1.75rem)] text-center px-6"
    >
      <motion.div
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 text-white shadow-lg shadow-primary-500/40"
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>
      <p className="text-lg font-semibold">{message}</p>
    </motion.div>
  );
}
