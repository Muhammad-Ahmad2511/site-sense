import { forwardRef, useState } from 'react';
import Input from './Input';

const PasswordInput = forwardRef(function PasswordInput({ id, label, ...props }, ref) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      ref={ref}
      id={id}
      label={label}
      type={visible ? 'text' : 'password'}
      autoComplete={props.autoComplete}
      {...props}
      rightElement={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-current focus-visible:outline-none"
        >
          {visible ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.3 5.3A9.9 9.9 0 0112 5c5.5 0 9 5 9.9 7-.4.9-1.2 2.2-2.4 3.4M6.2 6.9C3.6 8.5 2.1 10.7 2.1 12c.9 2 4.4 7 9.9 7 1.4 0 2.7-.3 3.9-.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M2.1 12S5.6 5 12 5s9.9 7 9.9 7-3.5 7-9.9 7-9.9-7-9.9-7z" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      }
    />
  );
});

export default PasswordInput;
