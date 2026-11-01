import type { SyncResult } from "@/repositories/SyncedTripRepository";
import type { AuthEvent, AuthResult, AuthService, AuthUser } from "./types";
import { normalizeEmail, validateEmail, validateNewPassword } from "./validation";

/** The part of SyncedTripRepository the account flow needs (an interface so tests can fake it). */
export interface TripSync { sync(): Promise<SyncResult>; clearLocal(): Promise<void> }

export type SignInOutcome =
  | { ok: true; /** Trips uploaded from this device into the account. */ merged: number; /** Trips that came down from the account. */ pulled: number; syncError?: string }
  | { ok: false; error: string };
export type SignOutOutcome = { ok: true } | { ok: false; error: string; /** Sign-out was refused because unsynced changes might be lost; call again with force to proceed. */ needsForce?: boolean };

/**
 * Orchestrates account actions on top of AuthService + trip sync:
 *  - sign up: link email+password to the current (anonymous) user, so existing trips keep their owner;
 *  - sign in: switch to the account, then sync, which uploads this device's local/anonymous trips into it
 *    (nothing is lost) and downloads the account's trips;
 *  - sign out: sync first, then end the session and wipe the local cache so the next identity starts clean.
 */
export class AccountController {
  private listeners = new Set<(user: AuthUser | null, event: AuthEvent | "synced") => void>();
  constructor(private readonly auth: AuthService, private readonly trips: TripSync) {
    // Changes that happen outside our calls (clicking a confirmation link, another tab) also reach the UI.
    // Deferred: supabase-js must not be re-entered from inside its own auth callback.
    this.auth.subscribe((event, user) => { setTimeout(() => this.emit(user, event), 0); });
  }

  /** Called on any account change; pages re-read their trips. Returns unsubscribe. */
  onChange(cb: (user: AuthUser | null, event: AuthEvent | "synced") => void): () => void { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; }
  private emit(user: AuthUser | null, event: AuthEvent | "synced") { this.listeners.forEach((l) => l(user, event)); }

  getUser(): Promise<AuthUser | null> { return this.auth.getUser(); }

  async signUp(emailIn: string, password: string): Promise<AuthResult> {
    const bad = validateEmail(emailIn) ?? validateNewPassword(password);
    if (bad) return { ok: false, error: bad };
    const r = await this.auth.signUp(emailIn, password);
    if (r.ok) { await this.trips.sync(); this.emit(await this.auth.getUser(), "updated"); }
    return r;
  }

  async signIn(emailIn: string, password: string): Promise<SignInOutcome> {
    const bad = validateEmail(emailIn) ?? (password ? null : "Enter your password.");
    if (bad) return { ok: false, error: bad };
    const r = await this.auth.signIn(normalizeEmail(emailIn), password);
    if (!r.ok) return r;
    const s = await this.trips.sync(); // merge: local trips go up under the account, the account's trips come down
    this.emit(await this.auth.getUser(), "signed_in");
    return s.ok ? { ok: true, merged: s.pushed, pulled: s.pulled } : { ok: true, merged: 0, pulled: 0, syncError: s.error };
  }

  async signOut(force = false): Promise<SignOutOutcome> {
    const s = await this.trips.sync();
    if (!s.ok && !force) return { ok: false, needsForce: true, error: "Your latest changes haven't been saved yet (are you offline?). Signing out now would lose them." };
    const r = await this.auth.signOut();
    if (!r.ok) return r;
    await this.trips.clearLocal();
    this.emit(null, "signed_out");
    return { ok: true };
  }

  async sendPasswordReset(emailIn: string): Promise<AuthResult> {
    const bad = validateEmail(emailIn);
    return bad ? { ok: false, error: bad } : this.auth.sendPasswordReset(emailIn);
  }

  async setPassword(password: string): Promise<AuthResult> {
    const bad = validateNewPassword(password);
    return bad ? { ok: false, error: bad } : this.auth.setPassword(password);
  }
}
