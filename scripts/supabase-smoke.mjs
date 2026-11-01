// Live check of the Supabase schema + RLS. Usage: set -a; . /workspace/.planet-supabase.env; set +a; node scripts/supabase-smoke.mjs
// Creates two anonymous users, writes a throwaway row as each, verifies isolation, then cleans up. Prints no secrets.
import { createClient } from "@supabase/supabase-js";
// Node < 22 has no WebSocket; realtime is unused here, so a stub is enough.
globalThis.WebSocket ??= class { constructor() { throw new Error("unused"); } };
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) { console.error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"); process.exit(1); }
const mk = async () => { const c = createClient(url, key, { auth: { persistSession: false } }); const { error } = await c.auth.signInAnonymously(); if (error) throw error; return c; };
const check = (name, ok) => { console.log((ok ? "PASS " : "FAIL ") + name); if (!ok) process.exitCode = 1; };
const now = new Date().toISOString();
const row = (id) => ({ id, data: { smoke: true }, schema_version: 1, destination_name: "smoke", arrival_date: "2026-11-10", departure_date: "2026-11-13", created_at: now, updated_at: now, deleted_at: null });
const a = await mk(), b = await mk();
const id = "smoke_" + Math.random().toString(36).slice(2, 10);
let r = await a.from("trips").upsert(row(id), { onConflict: "owner_id,id" }); check("A upsert insert", !r.error); if (r.error) console.log(r.error.message);
r = await a.from("trips").upsert({ ...row(id), destination_name: "smoke2" }, { onConflict: "owner_id,id" }); check("A upsert update", !r.error);
r = await a.from("trips").select("id,destination_name"); check("A reads own row", !r.error && r.data.length === 1 && r.data[0].destination_name === "smoke2");
r = await b.from("trips").select("id"); check("B cannot see A's row", !r.error && r.data.length === 0);
r = await b.from("trips").update({ deleted_at: now }).eq("id", id).select(); check("B cannot update A's row", !r.error && r.data.length === 0);
r = await b.from("trips").delete().eq("id", id).select(); check("B cannot delete A's row", !r.error && r.data.length === 0);
r = await b.from("trips").insert({ ...row("x_" + id), owner_id: (await a.auth.getUser()).data.user.id }); check("B cannot insert as A", !!r.error);
const anon = createClient(url, key, { auth: { persistSession: false } });
r = await anon.from("trips").select("id"); check("no-session client sees nothing", r.error != null || r.data.length === 0);
r = await a.from("trips").delete().eq("id", id).select(); check("A deletes own row (cleanup)", !r.error && r.data.length === 1);
