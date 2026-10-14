import type { DestinationTheme } from "./types";
const svg = (s: string) => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;

const Compass = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
    <circle cx="20" cy="20" r="18" fill="none" stroke="#2d5d62" strokeWidth="2" />
    <path d="M20 6 L24 20 L20 34 L16 20Z" fill="#d97b4a" /><path d="M20 6 L24 20 L16 20Z" fill="#2d5d62" />
  </svg>
);
const Line = ({ size = 60 }: { size?: number }) => (
  <svg width={size} height={size * 0.4} viewBox="0 0 100 40" aria-hidden="true" focusable="false">
    <path d="M4 20 H40 M60 20 H96" stroke="#2d5d62" strokeWidth="1.4" strokeDasharray="3 4" /><circle cx="50" cy="20" r="5" fill="none" stroke="#d97b4a" strokeWidth="2" />
  </svg>
);
const Landscape = () => (
  <svg viewBox="0 0 600 260" className="hero-art" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMax meet">
    <circle cx="450" cy="80" r="40" fill="#f0b46b" opacity=".85" />
    <path d="M0 260 L130 120 L220 200 L330 90 L470 230 L540 170 L600 220 V260Z" fill="#2d5d62" opacity=".85" />
    <path d="M0 260 L90 200 L200 240 L320 180 L460 250 L600 210 V260Z" fill="#1d3f43" />
    <path d="M60 90 q20 -10 40 0 M500 140 q14 -8 28 0" stroke="#1d3f43" strokeWidth="2" fill="none" />
  </svg>
);

export const neutralTheme: DestinationTheme = {
  key: "neutral", label: "Wanderer", tagline: "A personal guide for wherever you're headed",
  tokens: { primary: "#2d5d62", primaryInk: "#fff", secondary: "#d97b4a", accent: "#8a6d3b", bg: "#f8f6f2", surface: "#fff", ink: "#1f2a2c", muted: "#5d6668", line: "#e3ded5", heroFrom: "#dfeae7", heroTo: "#f5e8da" },
  pattern: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><circle cx='2' cy='2' r='1.2' fill='#2d5d62' fill-opacity='.10'/></svg>`),
  dividerPattern: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='16' height='14'><circle cx='8' cy='7' r='2' fill='#2d5d62' fill-opacity='.5'/></svg>`),
  HeroArt: Landscape, Motif: Compass, Sprig: Line,
  matches: () => true,
};
