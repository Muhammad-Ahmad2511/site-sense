const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value) {
  if (!value.trim()) return 'Email is required.';
  if (!EMAIL_PATTERN.test(value.trim())) return 'Enter a valid email address.';
  return '';
}

export function validatePassword(value) {
  if (!value) return 'Password is required.';
  if (value.length < 8) return 'Password must be at least 8 characters.';
  return '';
}

export function validateSignupPassword(value) {
  const base = validatePassword(value);
  if (base) return base;
  if (!/[A-Z]/.test(value)) return 'Add at least one uppercase letter.';
  if (!/[0-9]/.test(value)) return 'Add at least one number.';
  return '';
}

export function validateConfirmPassword(password, confirmation) {
  if (!confirmation) return 'Please confirm your password.';
  if (password !== confirmation) return 'Passwords do not match.';
  return '';
}

export function validateName(value) {
  if (!value.trim()) return 'Name is required.';
  if (value.trim().length < 2) return 'Name must be at least 2 characters.';
  return '';
}

// Returns { score: 0-4, label, percent }
export function getPasswordStrength(value) {
  if (!value) return { score: 0, label: '', percent: 0 };

  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  const clamped = Math.min(score, 4);
  const labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
  return { score: clamped, label: labels[clamped], percent: (clamped / 4) * 100 };
}
