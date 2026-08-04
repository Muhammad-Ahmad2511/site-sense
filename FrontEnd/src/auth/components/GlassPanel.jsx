import { motion } from 'framer-motion';

export default function GlassPanel({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`glass-panel rounded-[clamp(1rem,3vw,1.75rem)] p-[clamp(1.25rem,4vw,2.5rem)] ${className}`}
    >
      {children}
    </motion.div>
  );
}
