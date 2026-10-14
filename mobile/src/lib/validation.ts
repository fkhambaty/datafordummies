/** The Worker's own checks: an "@" in the email and passwords of at least 8 characters. */
export const MIN_PASSWORD = 8;

export function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function emailError(value: string): string | null {
  const email = normaliseEmail(value);
  if (!email) return 'Enter your email address.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) return 'Enter a valid email address.';
  return null;
}

/** Sign-in also accepts a username, as /v1/login does. */
export function loginError(value: string): string | null {
  return value.trim() ? null : 'Enter your email or username.';
}

export function passwordError(value: string): string | null {
  if (value.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  return null;
}

export function codeError(value: string): string | null {
  return /^\d{6}$/u.test(value.trim()) ? null : 'Enter the 6-digit code from the email.';
}
