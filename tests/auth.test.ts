import { describe, expect, it } from "vitest";
import type { Trip } from "@/domain/schemas";
import { AccountController } from "@/auth/AccountController";
import type { AuthEvent, AuthResult, AuthService, AuthUser } from "@/auth/types";
import { friendlyAuthError, normalizeEmail, validateEmail, validateNewPassword } from "@/auth/validation";
import { BrowserStorageTripRepository } from "@/repositories/BrowserStorageTripRepository";
import { SyncedTripRepository, type RemoteTripRow, type RemoteTripStore } from "@/repositories/SyncedTripRepository";
import { MemoryStore } from "@/repositories/TripRepository";
import { makeTrip } from "./helpers";

/** A fake Supabase: users with credentials, and a trips table partitioned by owner (what RLS enforces). */
class FakeBackend {
  accounts = new Map<string, { id: string; password: string; confirmed: boolean }>();
  tables = new Map<string, Map<string, RemoteTripRow>>();
  n = 0;
  newId() { return "u" + ++this.n; }
  table(owner: string) { if (!this.tables.has(owner)) this.tables.set(owner, new Map()); return this.tables.get(owner)!; }
}

/** One browser: its own session (current user) against the shared backend. */
class FakeDevice implements AuthService, RemoteTripStore {
  user: AuthUser | null = null;
  listeners = new Set<(e: AuthEvent, u: AuthUser | null) => void>();
  constructor(private b: FakeBackend) {}
  private ensure(): AuthUser { // mirrors SupabaseSession.ensure(): anonymous user if there is no session
    if (!this.user) this.user = { id: this.b.newId(), email: null, isAnonymous: true, pendingEmail: null };
    return this.user;
  }
  async getUser() { return this.user; }
  subscribe(cb: (e: AuthEvent, u: AuthUser | null) => void) { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; }
  async signUp(email: string, password: string): Promise<AuthResult> {
    const e = normalizeEmail(email);
    if ([...this.b.accounts.keys()].includes(e)) return { ok: false, error: friendlyAuthError({ code: "user_already_exists" }) };
    const u = this.ensure();
    // linking: same user id, credentials attached; usable for sign-in once confirmed
    this.b.accounts.set(e, { id: u.id, password, confirmed: false });
    this.user = { ...u, pendingEmail: e };
    return { ok: true, needsConfirmation: true };
  }
  confirm(email: string) { const a = this.b.accounts.get(email)!; a.confirmed = true; this.user = { id: a.id, email, isAnonymous: false, pendingEmail: null }; }
  async signIn(email: string, password: string): Promise<AuthResult> {
    const a = this.b.accounts.get(normalizeEmail(email));
    if (!a || a.password !== password) return { ok: false, error: friendlyAuthError({ code: "invalid_credentials" }) };
    if (!a.confirmed) return { ok: false, error: friendlyAuthError({ code: "email_not_confirmed" }) };
    this.user = { id: a.id, email: normalizeEmail(email), isAnonymous: false, pendingEmail: null };
    return { ok: true };
  }
  async signOut(): Promise<AuthResult> { this.user = null; return { ok: true }; }
  async sendPasswordReset(): Promise<AuthResult> { return { ok: true, needsConfirmation: true }; }
  async setPassword(p: string): Promise<AuthResult> { const e = this.user?.email; if (e) this.b.accounts.get(e)!.password = p; return { ok: true }; }
  // RemoteTripStore, scoped to the current session's user
  down = false;
  private rows() { if (this.down) throw new Error("offline"); return this.b.table(this.ensure().id); }
  async fetchAll() { return [...this.rows().values()]; }
  async upsert(t: Trip) { this.rows().set(t.id, { id: t.id, data: structuredClone(t), updatedAt: t.updatedAt, deletedAt: null }); }
  async softDelete(id: string, at: string) { this.rows().set(id, { id, data: {}, updatedAt: at, deletedAt: at }); }
}

function browser(b: FakeBackend) {
  const dev = new FakeDevice(b);
  const store = new MemoryStore();
  const local = new BrowserStorageTripRepository(() => store);
  const repo = new SyncedTripRepository(local, dev, () => store);
  const account = new AccountController(dev, repo);
  return { dev, store, local, repo, account };
}
const ids = async (r: { list(): Promise<{ id: string }[]> }) => (await r.list()).map((x) => x.id).sort();

describe("validation", () => {
  it("checks emails and passwords", () => {
    expect(validateEmail("")).toMatch(/Enter your email/);
    expect(validateEmail("nope")).toMatch(/valid email/);
    expect(validateEmail("  Ralph@Example.com ")).toBeNull();
    expect(normalizeEmail("  Ralph@Example.com ")).toBe("ralph@example.com");
    expect(validateNewPassword("short")).toMatch(/at least 8/);
    expect(validateNewPassword("long enough pw")).toBeNull();
    expect(validateNewPassword("x".repeat(73))).toMatch(/at most 72/);
  });
  it("maps backend errors to friendly messages", () => {
    expect(friendlyAuthError({ code: "invalid_credentials", message: "Invalid login credentials" })).toMatch(/don't match/);
    expect(friendlyAuthError({ message: "Email not confirmed" })).toMatch(/confirm your email/);
    expect(friendlyAuthError({ message: "User already registered" })).toMatch(/Sign in/);
    expect(friendlyAuthError({ code: "over_email_send_rate_limit", message: "email rate limit exceeded", status: 429 })).toMatch(/Too many emails/);
    expect(friendlyAuthError({ message: "Failed to fetch" })).toMatch(/reach the server/);
    expect(friendlyAuthError(null)).toMatch(/try again/);
  });
});

describe("AccountController", () => {
  it("sign-up links credentials to the anonymous user so trips keep their owner", async () => {
    const b = new FakeBackend(); const a = browser(b);
    const t = await makeTrip(); await a.repo.save(t);
    const anonId = (await a.dev.getUser())!.id;
    const r = await a.account.signUp("Ralph@Example.com", "correct horse");
    expect(r).toEqual({ ok: true, needsConfirmation: true });
    expect(b.accounts.get("ralph@example.com")!.id).toBe(anonId); // same user id
    a.dev.confirm("ralph@example.com");
    expect((await a.dev.getUser())!.id).toBe(anonId);
    expect([...b.table(anonId).keys()]).toEqual([t.id]); // the trip is still under the same owner
  });

  it("rejects bad input before calling the backend, and duplicate emails", async () => {
    const b = new FakeBackend(); const a = browser(b);
    expect(await a.account.signUp("bad", "correct horse")).toMatchObject({ ok: false });
    expect(await a.account.signUp("a@b.co", "short")).toMatchObject({ ok: false });
    expect(b.accounts.size).toBe(0);
    await a.account.signUp("a@b.co", "correct horse");
    const other = browser(b);
    expect(await other.account.signUp("a@b.co", "another pass1")).toMatchObject({ ok: false, error: expect.stringMatching(/already has an account/) });
  });

  it("signing in on a second device merges that device's local trips into the account and brings the account's trips down", async () => {
    const b = new FakeBackend();
    const phone = browser(b);
    const tPhone = await makeTrip({ destination: "Athens" }); await phone.repo.save(tPhone);
    await phone.account.signUp("r@x.co", "correct horse"); phone.dev.confirm("r@x.co");

    const laptop = browser(b); // starts anonymous, with its own trip made before signing in
    const tLaptop = await makeTrip({ destination: "Rome" }); await laptop.repo.save(tLaptop);
    const anonLaptop = (await laptop.dev.getUser())!.id;
    const r = await laptop.account.signIn("R@X.co", "correct horse");
    expect(r).toEqual({ ok: true, merged: 1, pulled: 1 });
    expect((await laptop.dev.getUser())!.id).not.toBe(anonLaptop);
    expect(await ids(laptop.local)).toEqual([tPhone.id, tLaptop.id].sort()); // nothing lost on the laptop
    await phone.repo.list();
    expect(await ids(phone.local)).toEqual([tPhone.id, tLaptop.id].sort()); // and the phone now sees the laptop's trip
    expect([...b.table(phone.dev.user!.id).keys()].sort()).toEqual([tPhone.id, tLaptop.id].sort());
  });

  it("wrong password and unconfirmed email do not change the session or local trips", async () => {
    const b = new FakeBackend(); const a = browser(b);
    const t = await makeTrip(); await a.repo.save(t);
    await a.account.signUp("r@x.co", "correct horse"); // not confirmed yet
    const other = browser(b); await other.repo.save(await makeTrip({ destination: "Rome" }));
    expect(await other.account.signIn("r@x.co", "correct horse")).toMatchObject({ ok: false, error: expect.stringMatching(/confirm your email/) });
    a.dev.confirm("r@x.co");
    expect(await other.account.signIn("r@x.co", "wrong")).toMatchObject({ ok: false, error: expect.stringMatching(/don't match/) });
    expect(await other.local.list()).toHaveLength(1);
    expect(await other.account.signIn("r@x.co", "")).toMatchObject({ ok: false });
  });

  it("sign-in still succeeds when the first sync fails, and local trips are kept for later", async () => {
    const b = new FakeBackend(); const a = browser(b);
    await a.account.signUp("r@x.co", "correct horse"); a.dev.confirm("r@x.co");
    const c = browser(b); const t = await makeTrip(); await c.local.save(t);
    c.dev.down = true;
    expect(await c.account.signIn("r@x.co", "correct horse")).toMatchObject({ ok: true, merged: 0, syncError: "offline" });
    c.dev.down = false;
    await c.repo.list();
    expect([...b.table(a.dev.user!.id).keys()]).toEqual([t.id]);
  });

  it("sign-out syncs first, wipes this device's cache, and the next identity starts clean", async () => {
    const b = new FakeBackend(); const a = browser(b);
    await a.account.signUp("r@x.co", "correct horse"); a.dev.confirm("r@x.co");
    const t = await makeTrip(); await a.local.save(t); // saved locally but never uploaded
    const owner = a.dev.user!.id;
    const events: string[] = [];
    a.account.onChange((_u, ev) => events.push(ev));
    expect(await a.account.signOut()).toEqual({ ok: true });
    expect([...b.table(owner).keys()]).toEqual([t.id]); // uploaded before leaving
    expect(await a.local.list()).toHaveLength(0);
    expect(events).toContain("signed_out");
    expect(await a.repo.list()).toHaveLength(0); // fresh anonymous user sees nothing
    expect((await a.dev.getUser())!.isAnonymous).toBe(true);
    await a.account.signIn("r@x.co", "correct horse");
    expect(await a.local.list()).toHaveLength(1); // trips come back on sign-in
  });

  it("sign-out is refused when changes can't be saved, unless forced", async () => {
    const b = new FakeBackend(); const a = browser(b);
    await a.account.signUp("r@x.co", "correct horse"); a.dev.confirm("r@x.co");
    await a.local.save(await makeTrip());
    a.dev.down = true;
    expect(await a.account.signOut()).toMatchObject({ ok: false, needsForce: true });
    expect(await a.local.list()).toHaveLength(1);
    expect(await a.account.signOut(true)).toEqual({ ok: true });
    expect(await a.local.list()).toHaveLength(0);
  });

  it("password reset validates the email; new passwords are validated and applied", async () => {
    const b = new FakeBackend(); const a = browser(b);
    expect(await a.account.sendPasswordReset("nope")).toMatchObject({ ok: false });
    expect(await a.account.sendPasswordReset("r@x.co")).toMatchObject({ ok: true });
    await a.account.signUp("r@x.co", "correct horse"); a.dev.confirm("r@x.co");
    expect(await a.account.setPassword("short")).toMatchObject({ ok: false });
    expect(await a.account.setPassword("a brand new pass")).toEqual({ ok: true });
    expect(b.accounts.get("r@x.co")!.password).toBe("a brand new pass");
  });
});
