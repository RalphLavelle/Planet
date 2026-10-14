"use client";
import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import type { Destination } from "@/domain/schemas";
import { selectTheme } from "@/themes/registry";
import type { DestinationTheme } from "@/themes/types";

const Ctx = createContext<DestinationTheme>(selectTheme(undefined));
export const useDestinationTheme = () => useContext(Ctx);

export function DestinationThemeProvider({ destination, children }: { destination?: Destination; children: ReactNode }) {
  const theme = selectTheme(destination);
  const t = theme.tokens;
  const style = {
    "--primary": t.primary, "--primary-ink": t.primaryInk, "--secondary": t.secondary, "--accent": t.accent,
    "--bg": t.bg, "--surface": t.surface, "--ink": t.ink, "--muted": t.muted, "--line": t.line,
    "--hero-from": t.heroFrom, "--hero-to": t.heroTo, "--pattern": theme.pattern, "--divider": theme.dividerPattern,
  } as CSSProperties;
  return <Ctx.Provider value={theme}><div className="themed" data-theme={theme.key} style={style}>{children}</div></Ctx.Provider>;
}

export function ThemedSectionDivider({ label }: { label?: string }) {
  const theme = useDestinationTheme();
  return (
    <div className="divider" role={label ? undefined : "presentation"}>
      <span className="divider-strip" aria-hidden="true" />
      {label ? <h2 className="divider-label">{label}</h2> : <theme.Sprig size={56} />}
      <span className="divider-strip" aria-hidden="true" />
    </div>
  );
}

export function DestinationMotif({ size }: { size?: number }) {
  const theme = useDestinationTheme();
  return <span className="motif" aria-hidden="true"><theme.Motif size={size} /></span>;
}

export function DestinationHero({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  const theme = useDestinationTheme();
  return (
    <header className="hero">
      <div className="hero-text">
        {eyebrow && <p className="eyebrow"><DestinationMotif size={18} /> {eyebrow}</p>}
        <h1>{title}</h1>
        {children}
      </div>
      <div className="hero-visual"><theme.HeroArt /></div>
    </header>
  );
}
