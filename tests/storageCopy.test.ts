import { describe, expect, it } from "vitest";
import { copy, modeFor, NUDGE_SNOOZE_DAYS, shouldShowNudge, type StorageMode } from "@/lib/storageCopy";

const MODES: StorageMode[] = ["local", "anonymous", "account"];
const DAY = 86_400_000;

describe("storage mode", () => {
  it("is local without a database, otherwise follows sign-in", () => {
    expect(modeFor({ syncConfigured: false, signedInWithEmail: false })).toBe("local");
    expect(modeFor({ syncConfigured: false, signedInWithEmail: true })).toBe("local");
    expect(modeFor({ syncConfigured: true, signedInWithEmail: false })).toBe("anonymous");
    expect(modeFor({ syncConfigured: true, signedInWithEmail: true })).toBe("account");
  });
});

describe("account nudge", () => {
  const now = Date.parse("2026-11-02T00:00:00Z");
  it("only shows for anonymous users", () => {
    expect(shouldShowNudge("anonymous", null, now)).toBe(true);
    expect(shouldShowNudge("account", null, now)).toBe(false);
    expect(shouldShowNudge("local", null, now)).toBe(false);
  });
  it("stays hidden for a while after being dismissed, then returns", () => {
    expect(shouldShowNudge("anonymous", new Date(now - DAY).toISOString(), now)).toBe(false);
    expect(shouldShowNudge("anonymous", new Date(now - (NUDGE_SNOOZE_DAYS + 1) * DAY).toISOString(), now)).toBe(true);
    expect(shouldShowNudge("anonymous", "garbage", now)).toBe(true);
  });
});

describe("copy is accurate for each storage mode", () => {
  it("never claims 'browser only' when trips are in the database", () => {
    for (const m of ["anonymous", "account"] as const) {
      const all = [copy.createdToast(m), copy.deleteConfirm(m, "Athens"), copy.deleteHelp(m), copy.notFoundTitle(m), copy.tripsSummary(m, 2), copy.resetConfirm(m), copy.resetDone(m), copy.storageSummary(m), copy.footer(m), copy.localLinkTitle(m), copy.localLinkButton(m)].join("\n");
      expect(all).not.toMatch(/from this browser|saved in this browser|only in this browser|stored only/i);
    }
    expect(copy.deleteConfirm("account", "Athens")).toMatch(/all your devices/);
    expect(copy.deleteHelp("account")).toMatch(/every device/);
  });
  it("keeps the localStorage-only wording for builds without a database", () => {
    expect(copy.deleteConfirm("local", "Athens")).toBe("Delete your Athens guide from this browser?");
    expect(copy.deleteHelp("local")).toBe("Remove this guide from this browser.");
    expect(copy.createdToast("local")).toBe("Guide saved to this browser.");
    expect(copy.notFoundTitle("local")).toBe("Guide not found in this browser");
    expect(copy.footer("local")).toBe("trips are stored only in this browser");
  });
  it("has copy for every mode", () => {
    for (const m of MODES) for (const f of [copy.createdToast, copy.deleteHelp, copy.notFoundBody, copy.storageBody, copy.footer, copy.resetConfirm]) expect(f(m).length).toBeGreaterThan(10);
  });
});
