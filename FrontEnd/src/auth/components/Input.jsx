import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  { id, label, error, hint, type = 'text', rightElement, className = '', ...props },
  ref
) {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-muted">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={type}
          aria-invalid={Boolean(error)}
          aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
          className={`glass-input w-full min-h-[44px] rounded-xl px-4 py-2.5 text-[16px] transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-0 ${
            error ? 'border-red-400/70 focus-visible:ring-red-400' : ''
          } ${rightElement ? 'pr-11' : ''} ${className}`}
          {...props}
        />
        {rightElement}
      </div>
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-red-500 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
});

export default Input;
