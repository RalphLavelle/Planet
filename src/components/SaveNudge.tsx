"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { openAccountPanel } from "@/lib/accountEvents";
import { copy, shouldShowNudge } from "@/lib/storageCopy";
import { useStorageMode } from "./useStorageMode";

const KEY = "planet:nudge:account-dismissed";

/** Gentle, dismissible prompt shown right after a trip is saved, only to anonymous users on a build with a database. Never blocks saving. */
export function SaveNudge() {
  const mode = useStorageMode();
  const [dismissed, setDismissed] = useState<string | null | undefined>(undefined);
  useEffect(() => { try { setDismissed(window.localStorage.getItem(KEY)); } catch { setDismissed(null); } }, []);
  if (dismissed === undefined || !shouldShowNudge(mode, dismissed)) return null;
  const dismiss = () => { const now = new Date().toISOString(); try { window.localStorage.setItem(KEY, now); } catch { /* ignore */ } setDismissed(now); };
  return (
    <div className="notice save-nudge" role="status">
      <p className="save-nudge-text">{copy.nudge}</p>
      <div className="row">
        <button type="button" className="btn btn-small" onClick={() => { openAccountPanel("signup"); }}>Create account</button>
        <button type="button" className="btn btn-ghost btn-small" onClick={dismiss} aria-label="Dismiss"><X size={14} aria-hidden="true" /> Not now</button>
      </div>
    </div>
  );
}
