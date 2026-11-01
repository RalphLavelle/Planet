/**
 * Whether the visitor has an email account. The UI doesn't explain where trips are stored; this only decides
 * whether to show the gentle "create an account" nudge.
 *  - "local":     this build has no database (no accounts exist).
 *  - "anonymous": database build, not signed in with email.
 *  - "account":   signed in with email + password.
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

/** User-facing wording shared by several screens. Deliberately the same in every state. */
export const copy = {
  createdToast: "Guide saved.",
  deleteConfirm: (name: string) => `Delete your ${name} guide? This can't be undone.`,
  notFoundTitle: "Guide not found",
  notFoundBody: "We couldn't find this guide. It may have been deleted, or the link may be wrong.",
  tripsSummary: (n: number) => (n === 1 ? "1 saved trip" : `${n} saved trips`),
  resetConfirm: "Delete all your trips? This can't be undone.",
  resetDone: "All your trips were deleted.",
  resetButton: "Delete all trips",
  localLinkTitle: "Guide link",
  localLinkBody: "A link back to this trip for you. To show it to someone else, use the read-only link.",
  localLinkButton: "Copy link",
  discoveryNote: "Finding real places can take 10–30 seconds the first time.",
  nudge: "Saved. Create an account to keep your trips.",
};
