import type { Session, User } from "@supabase/supabase-js";
import type { SupabaseSession } from "./SupabaseSession";
import type { AuthEvent, AuthResult, AuthService, AuthUser } from "./types";
import { friendlyAuthError, normalizeEmail } from "./validation";

function toUser(u: User | null | undefined): AuthUser | null {
  if (!u) return null;
  return { id: u.id, email: u.email || null, isAnonymous: u.is_anonymous === true, pendingEmail: (u as User & { new_email?: string }).new_email ?? null };
}

const fail = (e: { message?: string; code?: string; status?: number } | null | undefined): AuthResult => ({ ok: false, error: friendlyAuthError(e) });
/** Where email links bring the user back to. Must be allowed in Supabase Auth > URL configuration (site URL covers the live app). */
const redirect = () => (typeof window === "undefined" ? undefined : `${window.location.origin}/`);

export class SupabaseAuth implements AuthService {
  constructor(private readonly session: SupabaseSession) {}

  async getUser(): Promise<AuthUser | null> {
    const c = await this.session.client();
    const { data } = await c.auth.getSession(); // also waits for any email-link token in the URL to be processed
    return toUser(data.session?.user);
  }

  subscribe(cb: (event: AuthEvent, user: AuthUser | null) => void): () => void {
    let off: (() => void) | null = null; let cancelled = false;
    this.session.client().then((c) => {
      if (cancelled) return;
      const { data } = c.auth.onAuthStateChange((event, s: Session | null) => {
        const map: Partial<Record<string, AuthEvent>> = { SIGNED_IN: "signed_in", SIGNED_OUT: "signed_out", USER_UPDATED: "updated", PASSWORD_RECOVERY: "password_recovery" };
        const ev = map[event];
        if (ev) cb(ev, toUser(s?.user));
      });
      off = () => data.subscription.unsubscribe();
    }).catch(() => { /* backend unreachable: the UI just stays in its current state */ });
    return () => { cancelled = true; off?.(); };
  }

  async signUp(emailIn: string, password: string): Promise<AuthResult> {
    try {
      const c = await this.session.client();
      const email = normalizeEmail(emailIn);
      const { data: cur } = await c.auth.getSession();
      const user = cur.session?.user;
      if (user && !user.is_anonymous) return { ok: false, error: "You're already signed in." };
      if (user?.is_anonymous) {
        // Keep the same user id (so existing trips keep their owner) and attach credentials to it.
        const { data, error } = await c.auth.updateUser({ email, password }, { emailRedirectTo: redirect() });
        if (error) return fail(error);
        const u = data.user as (User & { new_email?: string }) | null;
        return { ok: true, needsConfirmation: !!u?.new_email || !u?.email_confirmed_at };
      }
      const { data, error } = await c.auth.signUp({ email, password, options: { emailRedirectTo: redirect() } });
      if (error) return fail(error);
      // An already-registered address returns a user with no identities and sends nothing.
      if (data.user && (data.user.identities?.length ?? 1) === 0) return { ok: false, error: friendlyAuthError({ code: "user_already_exists" }) };
      return { ok: true, needsConfirmation: !data.session };
    } catch (e) { return fail(e as Error); }
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const c = await this.session.client();
      const { error } = await c.auth.signInWithPassword({ email: normalizeEmail(email), password });
      return error ? fail(error) : { ok: true };
    } catch (e) { return fail(e as Error); }
  }

  async signOut(): Promise<AuthResult> {
    try {
      const c = await this.session.client();
      const { error } = await c.auth.signOut({ scope: "local" }); // only this device
      return error ? fail(error) : { ok: true };
    } catch (e) { return fail(e as Error); }
  }

  async sendPasswordReset(email: string): Promise<AuthResult> {
    try {
      const c = await this.session.client();
      const { error } = await c.auth.resetPasswordForEmail(normalizeEmail(email), { redirectTo: redirect() });
      return error ? fail(error) : { ok: true, needsConfirmation: true };
    } catch (e) { return fail(e as Error); }
  }

  async setPassword(password: string): Promise<AuthResult> {
    try {
      const c = await this.session.client();
      const { error } = await c.auth.updateUser({ password });
      return error ? fail(error) : { ok: true };
    } catch (e) { return fail(e as Error); }
  }
}
