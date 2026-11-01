/**
 * One-open-at-a-time ("accordion") state for the day panels. State is kept as the list of COLLAPSED ids
 * (that's what UiPrefs persists), so these helpers take and return collapsed lists.
 */

/** Toggle `id`: opening it collapses every other day; closing it leaves the rest as they are. */
export function toggleDay(allIds: string[], collapsed: string[], id: string): string[] {
  if (!allIds.includes(id)) return collapsed;
  return collapsed.includes(id) ? allIds.filter((x) => x !== id) : [...collapsed, id];
}

/** Collapse everything. */
export const collapseAll = (allIds: string[]): string[] => [...allIds];

/** Repair stored state: at most one open day (the first one found), unknown ids dropped. */
export function normalizeCollapsed(allIds: string[], collapsed: string[]): string[] {
  const open = allIds.filter((x) => !collapsed.includes(x));
  return open.length <= 1 ? allIds.filter((x) => collapsed.includes(x) || !open.includes(x)) : allIds.filter((x) => x !== open[0]);
}

/** Single-open helper for panels that track the open id directly (the wizard's draft preview). */
export const nextOpenId = (current: string | null, id: string, open: boolean): string | null => (open ? id : current === id ? null : current);
