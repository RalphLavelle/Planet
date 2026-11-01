/**
 * Where a visitor's trips live, which decides what the UI may truthfully say.
 *  - "local":     this build has no database; trips exist only in this browser.
 *  - "anonymous": trips are saved to the database under a per-browser anonymous identity; only this browser can reach them.
 *  - "account":   signed in with email+password; trips follow the account to every device.
 */
export type StorageMode = "local" | "anonymous" | "account";

export const NUDGE_SNOOZE_DAYS = 14;

export function modeFor(opts: { syncConfigured: boolean; signedInWithEmail: boolean }): StorageMode {
  if (!opts.syncConfigured) return "local";
  return opts.signedInWithEmail ? "account" : "anonymous";
}

/** The "create an account" nudge: only for anonymous users, and not again for a while after it was dismissed. */
export function shouldShowNudge(mode: StorageMode, dismissedAt: string | null, now = Date.now()): boolean {
  if (mode !== "anonymous") return false;
  const t = dismissedAt ? Date.parse(dismissedAt) : NaN;
  return Number.isNaN(t) || now - t > NUDGE_SNOOZE_DAYS * 86_400_000;
}

export const copy = {
  createdToast: (m: StorageMode) => m === "local" ? "Guide saved to this browser." : m === "account" ? "Guide saved to your account." : "Guide saved.",
  deleteConfirm: (m: StorageMode, name: string) =>
    m === "local" ? `Delete your ${name} guide from this browser?`
      : m === "account" ? `Delete your ${name} guide from your account? It will disappear on all your devices. This can't be undone.`
        : `Delete your ${name} guide? This can't be undone.`,
  deleteHelp: (m: StorageMode) =>
    m === "local" ? "Remove this guide from this browser."
      : m === "account" ? "Delete this guide from your account, on every device."
        : "Delete this guide permanently.",
  notFoundTitle: (m: StorageMode) => (m === "local" ? "Guide not found in this browser" : "Guide not found"),
  notFoundBody: (m: StorageMode) =>
    m === "local" ? "Planet stores trips only in the browser where they were created. A local guide link won't open on another device or browser, and clearing browser data removes saved trips."
      : m === "account" ? "We couldn't find this guide in your account. It may have been deleted, or the link may belong to a different account."
        : "We couldn't find this guide here. If you made it on another device, sign in with your account (top right) to open it there. Without an account, a guide can only be opened in the browser where it was created.",
  tripsSummary: (m: StorageMode, n: number) => m === "local" ? `${n} saved in this browser` : m === "account" ? `${n} in your account` : `${n} saved`,
  resetConfirm: (m: StorageMode) =>
    m === "local" ? "Delete all trips saved in this browser? This cannot be undone."
      : m === "account" ? "Delete ALL the trips in your account? They will disappear on every device. This cannot be undone."
        : "Delete ALL your trips? This cannot be undone.",
  resetDone: (m: StorageMode) => (m === "local" ? "All local trips were deleted." : "All your trips were deleted."),
  storageSummary: (m: StorageMode) => m === "local" ? "Saved in this browser only" : m === "account" ? "Saved to your account, on every device" : "Saved, but only this browser can open them. Create an account to use them anywhere",
  storageBody: (m: StorageMode) =>
    m === "local" ? "Trips are saved in this browser's local storage on this device only. Clearing browser data deletes them, they don't sync to other devices, and storage isn't encrypted — don't store confidential details. To share a guide, use the portable snapshot link on a trip page."
      : m === "account" ? "Trips are saved to your Planet account and open on any device where you sign in (a copy is kept in this browser so Planet works offline). Storage isn't end-to-end encrypted, so don't store confidential details. To share a guide with someone else, use the portable snapshot link on a trip page."
        : "Trips are saved to Planet's database and kept in this browser, but without an account only this browser can reach them: clearing browser data would lose access. Create an account (top right) to open the same trips on your phone and laptop. Storage isn't end-to-end encrypted, so don't store confidential details. To share a guide, use the portable snapshot link on a trip page.",
  footer: (m: StorageMode) => m === "local" ? "trips are stored only in this browser" : m === "account" ? "trips are saved to your account" : "trips are saved here; create an account to use them on other devices",
  localLinkTitle: (m: StorageMode) => (m === "local" ? "Local guide link" : "Link for you"),
  localLinkBody: (m: StorageMode) =>
    m === "local" ? "Reopens this trip in this browser on this device only. Sending it to someone else won't show them anything."
      : m === "account" ? "Reopens this trip when you're signed in to your account, on any of your devices. Sending it to someone else won't show them anything: use the portable link for that."
        : "Reopens this trip in this browser. Sending it to someone else won't show them anything, and it won't open on your other devices unless you create an account.",
  localLinkButton: (m: StorageMode) => (m === "local" ? "Copy local link" : "Copy my link"),
  discoveryNote: "Finding real places can take 10–30 seconds the first time; results are then remembered in this browser so it's faster next time.",
  nudge: "Saved. Create an account to see your trips on your other devices.",
};
