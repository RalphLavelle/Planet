import type { Destination } from "@/domain/schemas";
import { athensTheme } from "./athens";
import { istanbulTheme } from "./istanbul";
import { neutralTheme } from "./neutral";
import { romeTheme } from "./rome";
import { parisTheme } from "./paris";
import { tokyoTheme } from "./tokyo";
import type { DestinationTheme } from "./types";

/**
 * Ordered theme registry. Matching uses structured metadata (catalogKey / ISO country code),
 * never free-text names, so "Athens, Georgia (USA)" gets the neutral theme, not Greek motifs.
 * Add a theme: create src/themes/<name>.tsx and insert it above neutralTheme.
 */
export const THEMES: DestinationTheme[] = [athensTheme, istanbulTheme, romeTheme, parisTheme, tokyoTheme, neutralTheme];

export function selectTheme(d: Destination | undefined): DestinationTheme {
  if (!d) return neutralTheme;
  return THEMES.find((t) => t.matches(d)) ?? neutralTheme;
}
