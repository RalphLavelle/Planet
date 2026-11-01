import { describe, expect, it } from "vitest";
import { copy, modeFor, NUDGE_SNOOZE_DAYS, shouldShowNudge } from "@/lib/storageCopy";

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

describe("copy", () => {
  it("is neutral: never explains where trips are stored, and is the same in every state", () => {
    const all = [copy.createdToast, copy.deleteConfirm("Athens"), copy.notFoundTitle, copy.notFoundBody, copy.tripsSummary(0), copy.tripsSummary(1), copy.tripsSummary(3), copy.resetConfirm, copy.resetDone, copy.resetButton, copy.localLinkTitle, copy.localLinkBody, copy.localLinkButton, copy.discoveryNote, copy.nudge].join("\n");
    expect(all).not.toMatch(/browser|device|account's|your account|local storage|localstorage|database|sync/i);
  });
  it("has the agreed wording", () => {
    expect(copy.createdToast).toBe("Guide saved.");
    expect(copy.deleteConfirm("Athens")).toBe("Delete your Athens guide? This can't be undone.");
    expect(copy.resetConfirm).toBe("Delete all your trips? This can't be undone.");
    expect(copy.notFoundTitle).toBe("Guide not found");
    expect(copy.localLinkButton).toBe("Copy link");
    expect(copy.nudge).toBe("Saved. Create an account to keep your trips.");
    expect(copy.tripsSummary(1)).toBe("1 saved trip");
    expect(copy.tripsSummary(4)).toBe("4 saved trips");
  });
});
