import type { DestinationTheme } from "./types";
const svg = (s: string) => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;

const Tulip = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
    <path d="M20 36 V20" stroke="#2f6f5e" strokeWidth="2" />
    <path d="M20 22 C10 20 10 8 13 5 L17 11 L20 4 L23 11 L27 5 C30 8 30 20 20 22Z" fill="#c23b4a" />
    <path d="M20 30 C14 30 12 26 12 24 C16 24 19 26 20 30Z" fill="#2f6f5e" />
  </svg>
);
const Vine = ({ size = 60 }: { size?: number }) => (
  <svg width={size} height={size * 0.4} viewBox="0 0 100 40" aria-hidden="true" focusable="false">
    <path d="M4 20 C20 5 30 35 50 20 S80 5 96 20" stroke="#2f6f5e" strokeWidth="1.6" fill="none" />
    <circle cx="50" cy="20" r="4" fill="#c23b4a" /><circle cx="22" cy="14" r="2.5" fill="#1b6ca8" /><circle cx="78" cy="26" r="2.5" fill="#1b6ca8" />
  </svg>
);
const Skyline = () => (
  <svg viewBox="0 0 600 260" className="hero-art" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMax meet">
    <circle cx="120" cy="70" r="36" fill="#f2b45a" opacity=".85" />
    <path d="M0 236 Q150 222 300 236 T600 236 V260 H0Z" fill="#1b6ca8" opacity=".5" />
    <g fill="#33415c">
      <rect x="180" y="150" width="240" height="70" />
      <path d="M240 150 a60 60 0 0 1 120 0Z" />
      <path d="M200 160 a22 22 0 0 1 44 0Z" /><path d="M356 160 a22 22 0 0 1 44 0Z" />
      {[160, 196, 404, 440].map((x) => <g key={x}><rect x={x} y="70" width="7" height="150" /><path d={`M${x} 70 l3.5 -22 l3.5 22Z`} /></g>)}
      <rect x="296" y="98" width="8" height="12" />
      <path d="M470 220 V130 l12 -18 l12 18 V220Z" />
    </g>
  </svg>
);

export const istanbulTheme: DestinationTheme = {
  key: "istanbul", label: "Bosphorus", tagline: "Domes, tulips and ferries between continents",
  tokens: { primary: "#1b6ca8", primaryInk: "#fff", secondary: "#c23b4a", accent: "#2f6f5e", bg: "#f8f6f1", surface: "#fff", ink: "#1e2633", muted: "#5a6372", line: "#e3ddd2", heroFrom: "#d9e9f4", heroTo: "#f7e6d6" },
  pattern: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36'><path d='M18 2 L34 18 L18 34 L2 18Z M18 10 L26 18 L18 26 L10 18Z' fill='none' stroke='#1b6ca8' stroke-opacity='.07' stroke-width='1.5'/></svg>`),
  dividerPattern: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='20' height='14'><path d='M10 1 L18 7 L10 13 L2 7Z' fill='none' stroke='#1b6ca8' stroke-width='1.4'/><circle cx='10' cy='7' r='1.6' fill='#c23b4a'/></svg>`),
  HeroArt: Skyline, Motif: Tulip, Sprig: Vine,
  matches: (d) => d.catalogKey === "istanbul",
};
