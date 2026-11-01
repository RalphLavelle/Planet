/** Lets any component open the top-bar account panel (e.g. the "create an account" nudge). */
export const OPEN_ACCOUNT_EVENT = "planet:open-account";
export type AccountPanelMode = "signin" | "signup";
export function openAccountPanel(mode: AccountPanelMode = "signup") {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(OPEN_ACCOUNT_EVENT, { detail: { mode } }));
}
