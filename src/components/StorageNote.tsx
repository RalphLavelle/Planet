"use client";
import { copy } from "@/lib/storageCopy";
import { useStorageMode } from "./useStorageMode";

/** Footer sentence that matches how this build stores trips. */
export function StorageNote() { return <>{copy.footer(useStorageMode())}</>; }
