import type { ReactNode } from "react";
import type { ActivityCategory, Destination } from "@/domain/schemas";

export interface DestinationTheme {
  key: string;
  label: string;
  /** Design tokens exposed as CSS custom properties on the themed subtree. */
  tokens: {
    primary: string; primaryInk: string; secondary: string; accent: string;
    bg: string; surface: string; ink: string; muted: string; line: string;
    heroFrom: string; heroTo: string;
  };
  /** Small repeating CSS background (data-URI SVG) for subtle section backgrounds. */
  pattern: string;
  /** Border strip used by ThemedSectionDivider. */
  dividerPattern: string;
  /** Large hero illustration (decorative, aria-hidden). */
  HeroArt: () => ReactNode;
  /** Small recurring ornament (e.g. evil eye) for day headers, badges, empty states. */
  Motif: (props: { size?: number }) => ReactNode;
  /** Secondary ornament for dividers (e.g. olive sprig). */
  Sprig: (props: { size?: number }) => ReactNode;
  /** Optional destination ornaments per activity category (decorative badges/corners). Falls back to Motif. */
  categoryOrnaments?: Partial<Record<ActivityCategory, (props: { size?: number }) => ReactNode>>;
  /** Optional list bullet ornament (e.g. olive leaf). Falls back to Motif. */
  Bullet?: (props: { size?: number }) => ReactNode;
  /** Extra decorative set used on dashboards/section headers (e.g. column, amphora, sun-over-sea). */
  Ornaments?: ((props: { size?: number }) => ReactNode)[];
  tagline: string;
  matches: (d: Destination) => boolean;
}
