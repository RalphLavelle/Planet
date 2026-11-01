import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * One shared Supabase client for the whole app (trip sync and auth must use the same session).
 * supabase-js is imported lazily so the localStorage-only build never loads it.
 */
export class SupabaseSession {
  private clientP: Promise<SupabaseClient> | null = null;
  private ensureP: Promise<SupabaseClient> | null = null;
  constructor(private readonly url: string, private readonly anonKey: string) {}

  /** The client, without forcing any sign-in. Creating it also processes email-link tokens in the URL. */
  client(): Promise<SupabaseClient> {
    if (!this.clientP) {
      this.clientP = (async () => {
        const { createClient } = await import("@supabase/supabase-js");
        return createClient(this.url, this.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "planet:supabase-auth" } });
      })();
      this.clientP.catch(() => { this.clientP = null; });
    }
    return this.clientP;
  }

  /** The client with a guaranteed session: if there is none (first visit, or after sign-out) a new anonymous user is created. */
  ensure(): Promise<SupabaseClient> {
    if (!this.ensureP) {
      this.ensureP = (async () => {
        const c = await this.client();
        const { data } = await c.auth.getSession();
        if (!data.session) {
          const { error } = await c.auth.signInAnonymously();
          if (error) throw new Error("Supabase sign-in failed: " + error.message);
        }
        return c;
      })().finally(() => { this.ensureP = null; });
    }
    return this.ensureP;
  }
}
