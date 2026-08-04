import { motion } from 'framer-motion';

export default function GlassCard({ children, className = '', delay = 0, hover = false, as: Component = motion.div, ...props }) {
  return (
    <Component
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
      className={`glass-panel rounded-2xl ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
