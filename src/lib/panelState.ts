import type { KeyValueStore } from "@/repositories/TripRepository";

/** Open/closed state of collapsible panels, stored as one small JSON object per scope (a trip id, "home", …). */
const key = (scope: string) => `planet:ui:panels:${scope}`;

export function loadPanels(store: KeyValueStore | null, scope: string): Record<string, boolean> {
  try {
    const raw = JSON.parse(store?.getItem(key(scope)) ?? "{}");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === "boolean")) as Record<string, boolean>;
  } catch { return {}; }
}

export function savePanel(store: KeyValueStore | null, scope: string, id: string, open: boolean): void {
  try {
    const next = { ...loadPanels(store, scope), [id]: open };
    store?.setItem(key(scope), JSON.stringify(next));
  } catch { /* best effort: storage may be full or blocked */ }
}

/** A stored choice wins; otherwise the panel's default. */
export const resolveOpen = (saved: Record<string, boolean>, id: string, defaultOpen: boolean) => saved[id] ?? defaultOpen;
