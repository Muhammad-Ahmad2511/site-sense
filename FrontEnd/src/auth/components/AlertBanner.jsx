import { AnimatePresence, motion } from 'framer-motion';

const STYLES = {
  error: 'bg-red-500/10 border-red-400/40 text-red-600 dark:text-red-300',
  success: 'bg-primary-500/10 border-primary-400/40 text-primary-700 dark:text-primary-300'
};

export default function AlertBanner({ tone = 'error', children }) {
  return (
    <AnimatePresence mode="popLayout">
      {children && (
        <motion.div
          key={children}
          layout
          role={tone === 'error' ? 'alert' : 'status'}
          aria-live={tone === 'error' ? 'assertive' : 'polite'}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className={`mb-4 rounded-xl border px-4 py-3 text-sm font-medium ${STYLES[tone]}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
