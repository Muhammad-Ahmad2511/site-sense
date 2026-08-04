import { useState } from 'react';
import { useAuth, getRedirectTarget } from '../context/AuthContext';
import { validateEmail, validatePassword } from '../utils/validation';
import Input from '../components/Input';
import PasswordInput from '../components/PasswordInput';
import Checkbox from '../components/Checkbox';
import Button from '../components/Button';
import AlertBanner from '../components/AlertBanner';
import SuccessOverlay from '../components/SuccessOverlay';

export default function SignInForm({ onSwitchToSignUp, onSwitchToForgot }) {
  const { login } = useAuth();
  const [values, setValues] = useState({ email: '', password: '', rememberMe: false });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  function updateField(field, value) {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: '' }));
  }

  function validate() {
    const nextErrors = {
      email: validateEmail(values.email),
      password: validatePassword(values.password)
    };
    setErrors(nextErrors);
    return !nextErrors.email && !nextErrors.password;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting || success) return; // prevent duplicate submissions
    setFormError('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await login(values);
      setSuccess(true);
      setTimeout(() => {
        window.location.replace(getRedirectTarget());
      }, 1100);
    } catch (error) {
      setFormError(error.message);
      if (error.fields) setErrors((e) => ({ ...e, ...error.fields }));
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative">
      {success && <SuccessOverlay message="Signed in — redirecting..." />}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <AlertBanner tone="error">{formError}</AlertBanner>

        <Input
          id="signin-email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={values.email}
          onChange={(e) => updateField('email', e.target.value)}
          error={errors.email}
          disabled={isSubmitting}
        />

        <PasswordInput
          id="signin-password"
          label="Password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={values.password}
          onChange={(e) => updateField('password', e.target.value)}
          error={errors.password}
          disabled={isSubmitting}
        />

        <div className="flex items-center justify-between">
          <Checkbox
            id="signin-remember"
            label="Remember me"
            checked={values.rememberMe}
            onChange={(e) => updateField('rememberMe', e.target.checked)}
          />
          <button
            type="button"
            onClick={onSwitchToForgot}
            className="min-h-[44px] text-sm font-medium text-primary-600 hover:underline dark:text-primary-300"
          >
            Forgot password?
          </button>
        </div>

        <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign In'}
        </Button>

        <p className="text-center text-sm text-muted">
          Don&apos;t have an account?{' '}
          <button type="button" onClick={onSwitchToSignUp} className="font-medium text-primary-600 hover:underline dark:text-primary-300">
            Sign up
          </button>
        </p>
      </form>
    </div>
  );
}
