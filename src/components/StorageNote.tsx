"use client";
import { useEffect, useState } from "react";
import { getServices } from "@/services/container";

/** Footer sentence that matches how this build stores trips. */
export function StorageNote() {
  const [synced, setSynced] = useState(false);
  useEffect(() => { setSynced(!!getServices().account); }, []);
  return <>{synced ? "trips are saved in this browser, and to your account when you sign in" : "trips are stored only in this browser"}</>;
}
