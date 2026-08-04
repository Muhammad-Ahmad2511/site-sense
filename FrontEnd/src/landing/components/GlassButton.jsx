import { motion } from 'framer-motion';

const VARIANTS = {
  solid: 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg shadow-primary-500/30',
  glass: 'glass-input hover:border-primary-400'
};

export default function GlassButton({ as: Component = motion.button, variant = 'solid', className = '', disabled = false, children, ...props }) {
  return (
    <Component
      whileHover={disabled ? {} : { scale: 1.03, y: -2 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      disabled={disabled}
      className={`min-h-[44px] shrink-0 rounded-xl px-6 text-sm font-semibold transition-[opacity,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
