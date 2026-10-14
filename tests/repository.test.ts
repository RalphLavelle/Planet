import { describe, expect, it } from "vitest";
import { BrowserStorageTripRepository } from "@/repositories/BrowserStorageTripRepository";
import { makeRepo, makeTrip } from "./helpers";

describe("BrowserStorageTripRepository", () => {
  it("CRUD", async () => {
    const { repo } = makeRepo();
    const t = await makeTrip();
    await repo.save(t);
    expect(await repo.get(t.id)).toEqual(t);
    expect((await repo.list())[0]).toMatchObject({ id: t.id, destinationName: "Athens" });
    await repo.save({ ...t, accommodation: "Plaka" });
    expect((await repo.get(t.id))!.accommodation).toBe("Plaka");
    expect(await repo.list()).toHaveLength(1);
    await repo.delete(t.id);
    expect(await repo.get(t.id)).toBeNull();
  });
  it("persists across repository instances (reload)", async () => {
    const { store, repo } = makeRepo();
    const t = await makeTrip();
    await repo.save(t);
    const again = new BrowserStorageTripRepository(() => store);
    expect(await again.get(t.id)).toEqual(t);
  });
  it("handles corrupt and invalid stored data gracefully", async () => {
    const { store, repo } = makeRepo();
    const t = await makeTrip(); await repo.save(t);
    store.setItem("planet:trip:broken", "{not json");
    store.setItem("planet:trip:bad", JSON.stringify({ schemaVersion: 1, id: "badbad" }));
    store.setItem("unrelated", "x");
    expect(await repo.list()).toHaveLength(1);
    expect(await repo.get("broken")).toBeNull();
    expect((await repo.issues()).map((i) => i.key).sort()).toEqual(["planet:trip:bad", "planet:trip:broken"]);
  });
  it("migrates outdated records", async () => {
    const { store, repo } = makeRepo();
    const t = await makeTrip();
    const { schemaVersion: _v, sharing: _s, ...old } = t;
    store.setItem("planet:trip:" + t.id, JSON.stringify(old));
    expect((await repo.get(t.id))?.schemaVersion).toBe(1);
  });
  it("refuses to save invalid trips and can clear everything", async () => {
    const { store, repo } = makeRepo();
    const t = await makeTrip();
    await expect(repo.save({ ...t, nativeCurrency: "nope" })).rejects.toThrow();
    await repo.save(t); store.setItem("other", "keep");
    await repo.clear();
    expect(await repo.list()).toHaveLength(0);
    expect(store.getItem("other")).toBe("keep");
  });
  it("is SSR-safe: errors clearly without storage", async () => {
    const repo = new BrowserStorageTripRepository(() => null);
    await expect(repo.list()).rejects.toThrow(/not available/);
  });
});
