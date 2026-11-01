"use client";
import { useEffect, useState } from "react";
import { getServices, isSyncConfigured } from "@/services/container";
import { modeFor, type StorageMode } from "@/lib/storageCopy";

/** Where this visitor's trips live right now (see StorageMode). Starts from the build config, then follows sign-in state. */
export function useStorageMode(): StorageMode {
  const configured = isSyncConfigured();
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const a = getServices().account;
    if (!a) return;
    let alive = true;
    const apply = (u: { isAnonymous: boolean; email: string | null } | null) => setSignedIn(!!u && !u.isAnonymous && !!u.email);
    a.getUser().then((u) => { if (alive) apply(u); }).catch(() => {});
    const off = a.onChange((u) => { if (alive) apply(u); });
    return () => { alive = false; off(); };
  }, []);
  return modeFor({ syncConfigured: configured, signedInWithEmail: signedIn });
}
