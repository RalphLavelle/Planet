"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Upload } from "lucide-react";
import { DestinationHero, DestinationThemeProvider } from "@/components/theme";
import { getServices } from "@/services/container";
import { parseSnapshot, tripFromSnapshot } from "@/services/sharing";

export default function ImportPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  async function doImport(raw: string) {
    setError("");
    const v = raw.includes("/shared#") ? raw.slice(raw.indexOf("#") + 1).trim() : raw.trim();
    const r = parseSnapshot(v);
    if (!r.ok) return setError(r.error);
    const t = tripFromSnapshot(r.snapshot);
    await getServices().trips.save(t);
    router.push(`/trip/${t.id}?created=1`);
  }

  return (
    <DestinationThemeProvider>
      <div className="page narrow">
        <DestinationHero eyebrow="Import" title="Open a shared guide" />
        <form className="card form" onSubmit={(e) => { e.preventDefault(); doImport(text); }}>
          <div className="field"><label htmlFor="file">Exported file (.json)</label>
            <input id="file" type="file" accept="application/json,.json" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { if (f.size > 200_000) return setError("File is too large"); doImport(await f.text()); } }} /></div>
          <div className="field"><label htmlFor="link">…or paste a portable link</label><textarea id="link" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="https://…/shared#…" /></div>
          {error && <p className="err" role="alert">{error}</p>}
          <p className="help">Imported trips are validated, saved as a new copy in this browser, and never overwrite an existing trip.</p>
          <div className="row end"><button className="btn" disabled={!text.trim()}><Upload size={16} aria-hidden="true" /> Import</button></div>
        </form>
      </div>
    </DestinationThemeProvider>
  );
}
