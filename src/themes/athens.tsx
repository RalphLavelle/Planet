import { Amphora, Column, GreekBoat, KeyTile, OliveBranch, OliveLeaf, SunSea } from "./greekOrnaments";
import type { DestinationTheme } from "./types";

const svg = (s: string) => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;

export const EvilEye = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
    <circle cx="20" cy="20" r="19" fill="#1d4e89" />
    <circle cx="20" cy="20" r="13.5" fill="#fff" />
    <circle cx="20" cy="20" r="9" fill="#5fa8d3" />
    <circle cx="20" cy="20" r="4.5" fill="#0b1f3a" />
    <circle cx="17.5" cy="17.5" r="1.4" fill="#fff" />
  </svg>
);

export const OliveSprig = ({ size = 60 }: { size?: number }) => (
  <svg width={size} height={size * 0.4} viewBox="0 0 100 40" aria-hidden="true" focusable="false">
    <path d="M4 22 Q50 14 96 22" stroke="#6b7a3a" strokeWidth="1.6" fill="none" />
    {[14, 28, 42, 56, 70, 84].map((x, i) => (
      <g key={x}>
        <ellipse cx={x} cy={i % 2 ? 13 : 28} rx="7" ry="2.6" fill="#7f8f45" transform={`rotate(${i % 2 ? -25 : 25} ${x} ${i % 2 ? 13 : 28})`} />
        {i % 3 === 1 && <circle cx={x + 5} cy="26" r="2.6" fill="#3d4a1e" />}
      </g>
    ))}
  </svg>
);

const Parthenon = () => (
  <svg viewBox="0 0 600 260" className="hero-art" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMax meet">
    <defs>
      <linearGradient id="ath-sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f6c97a" /><stop offset="1" stopColor="#e07a4f" /></linearGradient>
    </defs>
    <circle cx="470" cy="80" r="46" fill="url(#ath-sun)" opacity=".9" />
    {/* hill */}
    <path d="M0 260 C80 200 140 190 210 180 L400 176 C470 182 530 205 600 240 L600 260Z" fill="#c9a77c" />
    <path d="M0 260 C90 228 160 222 240 220 L380 218 C460 222 530 236 600 255 L600 260Z" fill="#a8855c" />
    {/* temple */}
    <g fill="#f4ecdf" stroke="#d8c7ab" strokeWidth="1">
      <rect x="200" y="166" width="210" height="10" />
      <rect x="194" y="176" width="222" height="6" />
      {Array.from({ length: 8 }, (_, i) => <rect key={i} x={212 + i * 25} y="104" width="12" height="62" />)}
      <rect x="204" y="96" width="202" height="9" />
      <rect x="204" y="88" width="202" height="8" />
      <path d="M200 88 L305 58 L410 88Z" />
    </g>
    {/* cypress & olive */}
    <path d="M110 200 q8 -60 0 -80 q-8 20 0 80Z" fill="#4f5d2a" />
    <path d="M128 200 q6 -40 0 -55 q-6 15 0 55Z" fill="#5f6e33" />
    <circle cx="520" cy="215" r="18" fill="#7f8f45" /><rect x="518" y="220" width="4" height="22" fill="#5a4630" />
  </svg>
);

export const athensTheme: DestinationTheme = {
  key: "greece",
  label: "Aegean",
  tagline: "Marble, olive groves and long Aegean evenings",
  tokens: {
    primary: "#1d4e89", primaryInk: "#ffffff", secondary: "#c8643b", accent: "#6b7a3a",
    bg: "#fbf7f0", surface: "#ffffff", ink: "#1f2a37", muted: "#5b6573", line: "#e6dccb",
    heroFrom: "#dceaf5", heroTo: "#f6ead8",
  },
  pattern: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><path d='M0 36h8V12h16v16h-8v-8h-4v12h20' fill='none' stroke='#1d4e89' stroke-opacity='.045' stroke-width='2'/></svg>`),
  // Greek key / meander strip
  dividerPattern: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='24' height='14'><path d='M0 13H6V1H18V9H10V5H14' fill='none' stroke='#1d4e89' stroke-width='1.6'/><path d='M14 5V9 M18 13H24' fill='none' stroke='#1d4e89' stroke-width='1.6'/></svg>`),
  HeroArt: Parthenon,
  Motif: EvilEye,
  Sprig: OliveSprig,
  categoryOrnaments: {
    sight: Column, museum: Amphora, food: Amphora, cafe: Amphora, nature: OliveBranch, walk: OliveBranch,
    viewpoint: SunSea, beach: SunSea, transport: GreekBoat, nightlife: EvilEye, shopping: KeyTile, custom: EvilEye,
  },
  Bullet: OliveLeaf,
  Ornaments: [Column, Amphora, OliveBranch, EvilEye, SunSea, KeyTile],
  matches: (d) => d.countryCode === "GR" || d.catalogKey === "athens",
};
