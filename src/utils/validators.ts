// src/utils/validators.ts
// Pure validation utilities for auth inputs.
// No Firebase dependencies — these run instantly on the client
// to catch invalid inputs before making any network requests.

// ─── Email Validation ─────────────────────────────────────────────────────────
// RFC 5322 simplified regex — covers 99.9% of real-world email addresses.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate an email address format.
 * @returns null if valid, or an error message string if invalid.
 */
export function validateEmail(email: string): string | null {
  if (!email || !email.trim()) {
    return 'Email address is required.';
  }
  const trimmed = email.trim();
  if (!EMAIL_REGEX.test(trimmed)) {
    return 'Please enter a valid email address (e.g. name@example.com).';
  }
  if (trimmed.length > 254) {
    return 'Email address is too long.';
  }
  return null; // Valid
}

// ─── Password Validation ──────────────────────────────────────────────────────
const MIN_PASSWORD_LENGTH = 8;

/**
 * Validate a password meets the minimum strength requirements.
 * Requirements: 8+ chars, at least 1 uppercase, 1 lowercase, 1 number, 1 special char.
 * @returns null if valid, or an error message string if invalid.
 */
export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password is required.';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number.';
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    return 'Password must contain at least one special character (!@#$%^&*...).';
  }
  return null; // Valid
}

// ─── Display Name Validation ──────────────────────────────────────────────────
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 50;

/**
 * Validate a display name (user's full name).
 * Requirements: 2–50 characters, trimmed.
 * @returns null if valid, or an error message string if invalid.
 */
export function validateDisplayName(name: string): string | null {
  if (!name || !name.trim()) {
    return 'Display name is required.';
  }
  const trimmed = name.trim();
  if (trimmed.length < MIN_NAME_LENGTH) {
    return `Name must be at least ${MIN_NAME_LENGTH} characters.`;
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return `Name must be ${MAX_NAME_LENGTH} characters or less.`;
  }
  return null; // Valid
}

// ─── Password Strength Indicator ──────────────────────────────────────────────
// Used by the UI (LoginScreen) to show a real-time strength bar as the user types.

export interface PasswordStrength {
  /** 0 = very weak, 1 = weak, 2 = fair, 3 = good, 4 = strong */
  score: 0 | 1 | 2 | 3 | 4;
  /** Human-readable label */
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  /** Hex color for the UI bar/indicator */
  color: string;
  /** Actionable tips to improve the password */
  suggestions: string[];
}

/**
 * Calculate a password's strength score with suggestions for improvement.
 * This is purely informational — it does NOT block form submission.
 * Use `validatePassword()` for enforcement.
 */
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: 'Very Weak', color: '#EF4444', suggestions: ['Enter a password.'] };
  }

  let score = 0;
  const suggestions: string[] = [];

  // Length checks
  if (password.length >= 8) score++;
  else suggestions.push('Use at least 8 characters.');

  if (password.length >= 12) score++;

  // Character variety checks
  if (/[A-Z]/.test(password)) score++;
  else suggestions.push('Add an uppercase letter.');

  if (/[a-z]/.test(password)) {
    // lowercase is expected, don't add score but track
  } else {
    suggestions.push('Add a lowercase letter.');
  }

  if (/[0-9]/.test(password)) score++;
  else suggestions.push('Add a number.');

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) score++;
  else suggestions.push('Add a special character (!@#$%^&*...).');

  // Clamp score to 0–4
  const clampedScore = Math.min(4, Math.max(0, score)) as 0 | 1 | 2 | 3 | 4;

  const labels: Record<number, PasswordStrength['label']> = {
    0: 'Very Weak',
    1: 'Weak',
    2: 'Fair',
    3: 'Good',
    4: 'Strong',
  };

  const colors: Record<number, string> = {
    0: '#EF4444', // red
    1: '#F97316', // orange
    2: '#EAB308', // yellow
    3: '#22C55E', // green
    4: '#10B981', // emerald
  };

  return {
    score: clampedScore,
    label: labels[clampedScore],
    color: colors[clampedScore],
    suggestions,
  };
}
