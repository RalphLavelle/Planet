export interface AuthUser { id: string; email: string | null; isAnonymous: boolean; /** Email awaiting confirmation (set after sign-up/linking until the link is clicked). */ pendingEmail: string | null }

export type AuthEvent = "signed_in" | "signed_out" | "updated" | "password_recovery";

export type AuthResult =
  | { ok: true; /** The user must click a link in an email before the action completes. */ needsConfirmation?: boolean }
  | { ok: false; error: string };

/** What the app needs from an auth backend. Implemented by SupabaseAuth and by test fakes. */
export interface AuthService {
  getUser(): Promise<AuthUser | null>;
  /** Subscribe to session changes (including ones caused by clicking an email link). Returns an unsubscribe function. */
  subscribe(cb: (event: AuthEvent, user: AuthUser | null) => void): () => void;
  /** Create an account. If the browser has an anonymous session, the email+password are linked to it so existing trips keep their owner. */
  signUp(email: string, password: string): Promise<AuthResult>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<AuthResult>;
  /** Email a password-reset link. */
  sendPasswordReset(email: string): Promise<AuthResult>;
  /** Set a new password for the current session (after following a reset link, or when signed in). */
  setPassword(password: string): Promise<AuthResult>;
}
