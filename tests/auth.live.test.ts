// Live test of email+password auth, trip merge and sign-out against the real Supabase project.
// Skipped unless NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are set:
//   set -a; . /workspace/.planet-supabase.env; set +a; npx vitest run tests/auth.live.test.ts
// The service key is used ONLY to create a pre-confirmed throwaway user (we can't read confirmation emails) and to
// delete every user this test created. Nothing secret is printed.
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { AccountController } from "@/auth/AccountController";
import { SupabaseAuth } from "@/auth/SupabaseAuth";
import { SupabaseSession } from "@/auth/SupabaseSession";
import { BrowserStorageTripRepository } from "@/repositories/BrowserStorageTripRepository";
import { SupabaseTripStore } from "@/repositories/SupabaseTripStore";
import { SyncedTripRepository } from "@/repositories/SyncedTripRepository";
import { MemoryStore } from "@/repositories/TripRepository";
import { makeTrip } from "./helpers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
(globalThis as { WebSocket?: unknown }).WebSocket ??= class { constructor() { throw new Error("unused"); } }; // Node < 22

const created: string[] = [];
function device() {
  const session = new SupabaseSession(url!, anon!);
  const store = new MemoryStore();
  const local = new BrowserStorageTripRepository(() => store);
  const repo = new SyncedTripRepository(local, new SupabaseTripStore(session), () => store);
  const auth = new SupabaseAuth(session);
  return { session, local, repo, auth, account: new AccountController(auth, repo) };
}
const ids = async (r: { list(): Promise<{ id: string }[]> }) => (await r.list()).map((x) => x.id).sort();

describe.skipIf(!url || !anon || !svc)("Supabase email+password (live)", () => {
  const admin = createClient(url ?? "http://x", svc ?? "x", { auth: { persistSession: false, autoRefreshToken: false } });
  const email = `planet-test-${Math.random().toString(36).slice(2, 10)}@example.com`;
  const password = "Throwaway-" + Math.random().toString(36).slice(2, 12);

  afterAll(async () => { for (const id of created) await admin.auth.admin.deleteUser(id); }, 60000);

  it("sign in on a second device merges trips both ways; sign-out wipes the device; bad password is rejected", async () => {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    expect(error).toBeNull(); created.push(data.user!.id);

    const d1 = device();
    expect(await d1.account.signIn(email, "wrong-password-1")).toMatchObject({ ok: false, error: expect.stringMatching(/don't match/) });
    expect(await d1.account.signIn(email, password)).toMatchObject({ ok: true });
    const t1 = await makeTrip({ destination: "Athens" }); await d1.repo.save(t1);

    const d2 = device(); // a different browser: anonymous, has its own trip first
    const t2 = await makeTrip({ destination: "Rome" }); await d2.repo.save(t2);
    const anon2 = (await d2.auth.getUser())!;
    expect(anon2.isAnonymous).toBe(true); created.push(anon2.id);
    const r = await d2.account.signIn(email.toUpperCase(), password);
    expect(r).toEqual({ ok: true, merged: 1, pulled: 1 });
    const user2 = (await d2.auth.getUser())!;
    expect(user2).toMatchObject({ email, isAnonymous: false });
    expect(await ids(d2.local)).toEqual([t1.id, t2.id].sort());

    expect(await ids(d1.repo)).toEqual([t1.id, t2.id].sort()); // device 1 now sees device 2's trip

    expect(await d2.account.signOut()).toEqual({ ok: true });
    expect(await d2.local.list()).toHaveLength(0);
    expect(await d2.repo.list()).toHaveLength(0); // fresh anonymous identity: nothing
    const anon2b = (await d2.session.client().then((c) => c.auth.getSession())).data.session!.user;
    expect(anon2b.is_anonymous).toBe(true); created.push(anon2b.id);
    expect(await d2.account.signIn(email, password)).toMatchObject({ ok: true, pulled: 2 });
  }, 90000);

  it("signing up from an anonymous session keeps the same user id (outcome reported; the built-in mailer may refuse)", async () => {
    const d = device();
    await d.repo.save(await makeTrip());
    const anon = (await d.auth.getUser())!; created.push(anon.id);
    const r = await d.account.signUp(`planet-link-${Math.random().toString(36).slice(2, 8)}@example.com`, "Throwaway-" + Math.random().toString(36).slice(2, 10));
    console.log("signUp (link) result:", JSON.stringify(r));
    const after = (await d.auth.getUser())!;
    expect(after.id).toBe(anon.id);
  }, 60000);
});
