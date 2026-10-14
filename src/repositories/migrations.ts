import { TRIP_SCHEMA_VERSION } from "@/domain/schemas";

/** Each migration upgrades a raw record from version N to N+1. Add entries here when the schema changes. */
type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;
export const migrations: Record<number, Migration> = {
  // 0 -> 1: pre-release records lacked schemaVersion/sharing.
  0: (raw) => ({ ...raw, schemaVersion: 1, sharing: raw.sharing ?? { mode: "private", includeAccommodation: false } }),
};

export function migrate(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  let rec = raw as Record<string, unknown>;
  let v = typeof rec.schemaVersion === "number" ? rec.schemaVersion : 0;
  while (v < TRIP_SCHEMA_VERSION) {
    const m = migrations[v];
    if (!m) break;
    rec = m(rec);
    v = typeof rec.schemaVersion === "number" ? rec.schemaVersion : v + 1;
  }
  return rec;
}
