import { useState } from 'react';
import { useAuth, getRedirectTarget } from '../context/AuthContext';
import { validateName, validateEmail, validateSignupPassword, validateConfirmPassword } from '../utils/validation';
import Input from '../components/Input';
import PasswordInput from '../components/PasswordInput';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import Button from '../components/Button';
import AlertBanner from '../components/AlertBanner';
import SuccessOverlay from '../components/SuccessOverlay';

export default function SignUpForm({ onSwitchToSignIn }) {
  const { register } = useAuth();
  const [values, setValues] = useState({ name: '', email: '', password: '', confirmPassword: '' });
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
      name: validateName(values.name),
      email: validateEmail(values.email),
      password: validateSignupPassword(values.password),
      confirmPassword: validateConfirmPassword(values.password, values.confirmPassword)
    };
    setErrors(nextErrors);
    return Object.values(nextErrors).every((v) => !v);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting || success) return;
    setFormError('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await register(values);
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
      {success && <SuccessOverlay message="Account created — redirecting..." />}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <AlertBanner tone="error">{formError}</AlertBanner>

        <Input
          id="signup-name"
          label="Full name"
          autoComplete="name"
          placeholder="Ada Lovelace"
          value={values.name}
          onChange={(e) => updateField('name', e.target.value)}
          error={errors.name}
          disabled={isSubmitting}
        />

        <Input
          id="signup-email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={values.email}
          onChange={(e) => updateField('email', e.target.value)}
          error={errors.email}
          disabled={isSubmitting}
        />

        <div className="flex flex-col gap-2">
          <PasswordInput
            id="signup-password"
            label="Password"
            autoComplete="new-password"
            placeholder="Create a password"
            value={values.password}
            onChange={(e) => updateField('password', e.target.value)}
            error={errors.password}
            hint={!errors.password ? 'At least 8 characters, with an uppercase letter and a number.' : undefined}
            disabled={isSubmitting}
          />
          <PasswordStrengthMeter password={values.password} />
        </div>

        <PasswordInput
          id="signup-confirm-password"
          label="Confirm password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={values.confirmPassword}
          onChange={(e) => updateField('confirmPassword', e.target.value)}
          error={errors.confirmPassword}
          disabled={isSubmitting}
        />

        <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create Account'}
        </Button>

        <p className="text-center text-sm text-muted">
          Already have an account?{' '}
          <button type="button" onClick={onSwitchToSignIn} className="font-medium text-primary-600 hover:underline dark:text-primary-300">
            Sign in
          </button>
        </p>
      </form>
    </div>
  );
}
