import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { validateEmail } from '../utils/validation';
import Input from '../components/Input';
import Button from '../components/Button';
import AlertBanner from '../components/AlertBanner';

export default function ForgotPasswordForm({ onSwitchToSignIn }) {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    setFormError('');
    const validationError = validateEmail(email);
    setError(validationError);
    if (validationError) return;

    setIsSubmitting(true);
    try {
      const result = await forgotPassword(email);
      setMessage(result.message);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <p className="text-sm text-muted">
        Enter the email associated with your account and we&apos;ll send you a link to reset your password.
      </p>

      <AlertBanner tone="error">{formError}</AlertBanner>
      <AlertBanner tone="success">{message}</AlertBanner>

      <Input
        id="forgot-email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (error) setError('');
        }}
        error={error}
        disabled={isSubmitting || Boolean(message)}
      />

      <Button type="submit" loading={isSubmitting} disabled={isSubmitting || Boolean(message)}>
        {isSubmitting ? 'Sending…' : message ? 'Link sent' : 'Send Reset Link'}
      </Button>

      <p className="text-center text-sm text-muted">
        <button type="button" onClick={onSwitchToSignIn} className="font-medium text-primary-600 hover:underline dark:text-primary-300">
          ← Back to sign in
        </button>
      </p>
    </form>
  );
}
