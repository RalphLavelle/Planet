import type { DestinationTheme } from "./types";
const svg = (s: string) => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
type P = { size?: number };
const A = { "aria-hidden": true, focusable: false } as const;
const VERM = "#c8402d", INDIGO = "#24345c", SAKURA = "#f2a7b8", INK = "#1d1d26", MATCHA = "#6c8a43";

export const Torii = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <path d="M2 7 Q20 3 38 7 L37 11 Q20 8 3 11Z" fill={INK} /><rect x="5" y="13" width="30" height="3" fill={VERM} />
    <rect x="9" y="10" width="3.5" height="28" fill={VERM} /><rect x="27.5" y="10" width="3.5" height="28" fill={VERM} /><rect x="18.5" y="11" width="3" height="5" fill={VERM} />
  </svg>
);
export const Sakura = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    {[0, 72, 144, 216, 288].map((r) => <path key={r} d="M20 20 C14 14 15 6 20 4 C25 6 26 14 20 20Z" fill={SAKURA} transform={`rotate(${r} 20 20)`} />)}
    <circle cx="20" cy="20" r="3" fill="#d4507a" />
  </svg>
);
export const Lantern = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <rect x="15" y="3" width="10" height="4" fill={INK} /><ellipse cx="20" cy="20" rx="12" ry="13" fill={VERM} />
    {[12, 17, 23, 28].map((y) => <path key={y} d={`M9 ${y} Q20 ${y + 2} 31 ${y}`} stroke="#8e2a1c" fill="none" />)}
    <rect x="15" y="32" width="10" height="4" fill={INK} /><path d="M20 36 V39" stroke={INK} strokeWidth="2" />
  </svg>
);
export const Fuji = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <circle cx="30" cy="10" r="5" fill={VERM} /><path d="M2 34 L15 12 H25 L38 34Z" fill={INDIGO} />
    <path d="M15 12 H25 L28.5 18 Q26 16 24 19 Q22 16 20 19 Q18 16 16 19 Q14 16 11.5 18Z" fill="#fff" />
  </svg>
);
export const Onigiri = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <path d="M20 4 C26 4 36 26 34 32 C32 36 8 36 6 32 C4 26 14 4 20 4Z" fill="#fff" stroke="#c9c3b5" /><rect x="12" y="24" width="16" height="11" rx="1" fill={INK} />
  </svg>
);
export const Ramen = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <path d="M30 4 L16 18 M35 6 L19 19" stroke="#8a6a3c" strokeWidth="1.8" /><path d="M3 18 H37 C37 28 30 34 20 34 C10 34 3 28 3 18Z" fill={VERM} />
    <path d="M6 18 q4 -4 8 0 t8 0 t8 0" stroke="#f3d27a" strokeWidth="2" fill="none" /><path d="M8 24 H32" stroke="#fff" strokeWidth="1.2" strokeDasharray="3 2" />
  </svg>
);
const Hero = () => (
  <svg viewBox="0 0 600 260" className="hero-art" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMax meet">
    <circle cx="440" cy="70" r="40" fill={VERM} opacity=".9" />
    <path d="M60 230 L230 70 H300 L470 230Z" fill={INDIGO} opacity=".9" /><path d="M230 70 H300 L330 100 Q312 92 300 108 Q284 92 265 108 Q248 92 232 108 Q216 94 200 100Z" fill="#fff" />
    <g transform="translate(480 120)" fill={INK}>{[0, 1, 2, 3].map((i) => <g key={i}><path d={`M${-30 + i * 5} ${i * 26} H${30 - i * 5} L${22 - i * 5} ${i * 26 - 10} H${-22 + i * 5}Z`} /><rect x={-14 + i * 3} y={i * 26} width={28 - i * 6} height="16" fill={VERM} /></g>)}</g>
    <g transform="translate(70 120)"><path d="M0 18 Q60 8 120 18 L118 26 Q60 18 2 26Z" fill={INK} /><rect x="10" y="32" width="100" height="7" fill={VERM} /><rect x="22" y="24" width="9" height="120" fill={VERM} /><rect x="89" y="24" width="9" height="120" fill={VERM} /></g>
    <path d="M0 250 Q300 236 600 250 V260 H0Z" fill="#9fb4cc" />
  </svg>
);
export const tokyoTheme: DestinationTheme = {
  key: "tokyo", label: "Shitamachi", tagline: "Lanterns, shrines and neon after dark",
  tokens: { primary: INDIGO, primaryInk: "#fff", secondary: VERM, accent: MATCHA, bg: "#f7f5f0", surface: "#fff", ink: "#1d1d26", muted: "#5d5f6b", line: "#e4e0d8", heroFrom: "#e2e8f2", heroTo: "#f8e3e3" },
  // Seigaiha (wave) pattern
  pattern: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='20'><g fill='none' stroke='${INDIGO}' stroke-opacity='.07' stroke-width='1.2'><path d='M0 20 a20 20 0 0 1 40 0 M6 20 a14 14 0 0 1 28 0 M12 20 a8 8 0 0 1 16 0'/><path d='M-20 10 a20 20 0 0 1 40 0 M20 10 a20 20 0 0 1 40 0'/></g></svg>`),
  dividerPattern: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='20' height='14'><path d='M0 13 a10 10 0 0 1 20 0 M5 13 a5 5 0 0 1 10 0' fill='none' stroke='${INDIGO}' stroke-width='1.3'/></svg>`),
  HeroArt: Hero, Motif: Sakura, Sprig: ({ size = 60 }: P) => <svg {...A} width={size} height={size * 0.4} viewBox="0 0 100 40"><path d="M4 26 Q50 10 96 22" stroke="#5a4630" strokeWidth="1.6" fill="none" />{[24, 50, 76].map((x) => <circle key={x} cx={x} cy={x === 50 ? 17 : 22} r="5" fill={SAKURA} />)}</svg>,
  Bullet: ({ size = 14 }: P) => <Sakura size={size} />,
  categoryOrnaments: { sight: Torii, museum: Lantern, food: Ramen, cafe: Onigiri, nightlife: Lantern, nature: Sakura, walk: Sakura, viewpoint: Fuji, shopping: Lantern, transport: Fuji, custom: Sakura },
  Ornaments: [Torii, Sakura, Lantern, Fuji, Onigiri, Ramen],
  matches: (d) => d.catalogKey === "tokyo",
};
