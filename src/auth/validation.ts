export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(email: string): string { return email.trim().toLowerCase(); }

/** Client-side checks only; the server enforces its own rules. Returns an error message or null. */
export function validateEmail(email: string): string | null {
  const e = normalizeEmail(email);
  if (!e) return "Enter your email address.";
  if (e.length > 254 || !EMAIL_RE.test(e)) return "That doesn't look like a valid email address.";
  return null;
}

export function validateNewPassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`;
  if (password.length > 72) return "Passwords can be at most 72 characters.";
  return null;
}

/** Turn a backend error into a short, actionable message. Matches on code first, then on message text. */
export function friendlyAuthError(err: { message?: string; code?: string; status?: number } | null | undefined): string {
  const code = (err?.code ?? "").toLowerCase();
  const msg = (err?.message ?? "").toLowerCase();
  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) return "That email and password don't match. Check them, or reset your password.";
  if (code === "email_not_confirmed" || msg.includes("email not confirmed")) return "Please confirm your email first: open the link we sent you, then sign in.";
  if (code === "user_already_exists" || code === "email_exists" || msg.includes("already been registered") || msg.includes("already registered")) return "That email already has an account. Use “Sign in” instead.";
  if (code === "weak_password" || msg.includes("password should be") || msg.includes("weak password")) return `Choose a stronger password (at least ${MIN_PASSWORD_LENGTH} characters).`;
  if (code === "over_email_send_rate_limit" || msg.includes("email rate limit") || msg.includes("rate limit") || err?.status === 429) return "Too many emails requested just now. Wait a few minutes and try again.";
  if (code === "same_password" || msg.includes("different from the old password")) return "Choose a password that is different from your current one.";
  if (code === "signup_disabled" || msg.includes("signups not allowed")) return "Sign-ups are turned off for this project.";
  if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("load failed")) return "Couldn't reach the server. Check your connection and try again.";
  return err?.message ? `Something went wrong: ${err.message}` : "Something went wrong. Please try again.";
}
