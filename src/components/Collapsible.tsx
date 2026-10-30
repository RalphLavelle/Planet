"use client";
import { useEffect, useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { loadPanels, resolveOpen, savePanel } from "@/lib/panelState";

export interface CollapsibleProps {
  /** Stable id within `scope`; used to remember the open/closed state. */
  id: string;
  /** Where to remember state in localStorage (trip id, "home"). Omit to not persist. */
  scope?: string;
  title: ReactNode;
  icon?: ReactNode;
  /** Short text shown under/next to the title while collapsed (e.g. "4 days · live"). */
  summary?: ReactNode;
  defaultOpen?: boolean;
  /** Controlled mode: pass both `open` and `onOpenChange`. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Heading level for the title (default 2). */
  level?: 2 | 3 | 4 | 5;
  /** "panel" = bordered card (default); "inline" = lightweight, for use inside cards. */
  variant?: "panel" | "inline";
  /** Mount children only after the first open (good for maps and iframes). Default true. */
  lazy?: boolean;
  className?: string;
  /** Extra controls shown beside the toggle (kept outside the button). */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * One accessible disclosure used app-wide: the title is a heading containing a real <button> with aria-expanded /
 * aria-controls (Enter and Space work natively), a visible chevron and a ≥44px tap target.
 */
export function Collapsible({ id, scope, title, icon, summary, defaultOpen = false, open: controlled, onOpenChange, level = 2, variant = "panel", lazy = true, className = "", actions, children }: CollapsibleProps) {
  const uid = useId();
  const [inner, setInner] = useState(defaultOpen);
  const isControlled = controlled !== undefined;
  const open = isControlled ? controlled : inner;
  const [everOpened, setEverOpened] = useState(open);
  if (open && !everOpened) setEverOpened(true);

  // Restore the remembered state after mount (static export renders the default first).
  useEffect(() => {
    if (!scope || isControlled) return;
    setInner(resolveOpen(loadPanels(window.localStorage, scope), id, defaultOpen));
  }, [scope, id, defaultOpen, isControlled]);

  const toggle = () => {
    const next = !open;
    if (!isControlled) setInner(next);
    onOpenChange?.(next);
    if (scope) savePanel(typeof window === "undefined" ? null : window.localStorage, scope, id, next);
  };

  const H = `h${level}` as "h2" | "h3" | "h4" | "h5";
  const btnId = `${uid}-btn`, bodyId = `${uid}-body`;
  return (
    <section className={`collapsible collapsible-${variant}${open ? " is-open" : ""} ${className}`.trim()} data-panel={id}>
      <div className="collapsible-head">
        <H className="collapsible-title">
          <button type="button" id={btnId} className="collapsible-trigger" aria-expanded={open} aria-controls={bodyId} onClick={toggle}>
            {icon && <span className="collapsible-icon" aria-hidden="true">{icon}</span>}
            <span className="collapsible-text">
              <span className="collapsible-label">{title}</span>
              {summary != null && <span className="collapsible-summary">{summary}</span>}
            </span>
            <ChevronDown size={20} aria-hidden="true" className="collapsible-chevron" />
          </button>
        </H>
        {actions && <div className="collapsible-actions">{actions}</div>}
      </div>
      <div id={bodyId} role="region" aria-labelledby={btnId} className="collapsible-body" hidden={!open}>
        {(!lazy || everOpened) && children}
      </div>
    </section>
  );
}
