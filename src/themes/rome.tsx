import type { DestinationTheme } from "./types";
const svg = (s: string) => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
type P = { size?: number };
const A = { "aria-hidden": true, focusable: false } as const;
const TERRA = "#b5502f", OCHRE = "#d9a441", TRAV = "#e8dcc4", PINE = "#4c5b2c", INK = "#3b2a20";

export const Arch = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <path d="M3 36 V10 Q20 2 37 10 V36Z" fill={TRAV} stroke="#a8906a" />
    {[7, 17, 27].map((x) => <path key={x} d={`M${x} 36 V24 a3 3 0 0 1 6 0 V36Z`} fill={INK} opacity=".75" />)}
    {[7, 17, 27].map((x) => <path key={x + "u"} d={`M${x} 19 V15 a3 3 0 0 1 6 0 V19Z`} fill={INK} opacity=".55" />)}
  </svg>
);
export const Laurel = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <path d="M20 36 C8 32 4 20 8 8 M20 36 C32 32 36 20 32 8" stroke={PINE} strokeWidth="1.5" fill="none" />
    {[[8, 12, -60], [7, 19, -80], [9, 26, -110], [14, 32, -140], [32, 12, 60], [33, 19, 80], [31, 26, 110], [26, 32, 140]].map(([x, y, r], i) => <ellipse key={i} cx={x} cy={y} rx="4.5" ry="2" fill={PINE} transform={`rotate(${r} ${x} ${y})`} />)}
  </svg>
);
export const Espresso = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <ellipse cx="18" cy="33" rx="14" ry="3" fill={TRAV} stroke="#a8906a" />
    <path d="M8 16 H28 V24 C28 29 24 31 18 31 C12 31 8 29 8 24Z" fill="#fff" stroke={INK} />
    <path d="M28 19 c5 0 5 7 0 7" stroke={INK} fill="none" strokeWidth="1.6" /><ellipse cx="18" cy="16" rx="10" ry="2" fill="#6b3f22" />
    <path d="M14 11 q2 -3 0 -6 M20 11 q2 -3 0 -6" stroke="#b9a68a" fill="none" />
  </svg>
);
export const StonePine = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <path d="M19 36 V18 M19 22 L13 16 M19 20 L26 15" stroke={INK} strokeWidth="2" />
    <ellipse cx="20" cy="13" rx="17" ry="7" fill={PINE} /><ellipse cx="14" cy="11" rx="7" ry="3" fill="#61733a" />
  </svg>
);
export const Pizza = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <path d="M6 8 Q20 2 34 8 L20 36Z" fill={OCHRE} /><path d="M6 8 Q20 2 34 8 L33 10 Q20 4 7 10Z" fill="#a8652a" />
    {[[16, 14], [24, 15], [20, 23]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="2.8" fill={TERRA} />)}
    <path d="M13 19 l2 -1 M25 21 l2 1" stroke={PINE} strokeWidth="2" />
  </svg>
);
export const Fountain = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <path d="M4 30 H36 L33 36 H7Z" fill={TRAV} stroke="#a8906a" /><rect x="17" y="16" width="6" height="14" fill={TRAV} stroke="#a8906a" />
    <path d="M12 16 H28 L26 19 H14Z" fill={TRAV} stroke="#a8906a" />
    <path d="M20 14 C20 6 12 6 10 14 M20 14 C20 6 28 6 30 14" stroke="#5fa8d3" strokeWidth="1.8" fill="none" /><path d="M6 30 q14 -4 28 0" stroke="#5fa8d3" strokeWidth="2" fill="none" />
  </svg>
);
const Hero = () => (
  <svg viewBox="0 0 600 260" className="hero-art" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMax meet">
    <circle cx="140" cy="74" r="38" fill="#f0b46b" opacity=".85" />
    <path d="M0 260 V232 Q300 218 600 232 V260Z" fill="#c9a77c" />
    <g transform="translate(190 96)">
      <path d="M0 140 V30 Q120 -12 240 30 V140Z" fill={TRAV} stroke="#a8906a" />
      {[0, 1, 2].map((row) => Array.from({ length: 8 }, (_, i) => <path key={`${row}-${i}`} d={`M${16 + i * 28} ${132 - row * 36} v-18 a8 8 0 0 1 16 0 v18Z`} fill={INK} opacity={0.55 + row * 0.1} />))}
      <path d="M0 30 Q120 -12 240 30" stroke="#a8906a" strokeWidth="3" fill="none" />
    </g>
    {[[70, 205], [520, 200]].map(([x, y]) => <g key={x}><path d={`M${x} 240 V${y}`} stroke={INK} strokeWidth="4" /><ellipse cx={x} cy={y - 8} rx="46" ry="16" fill={PINE} /></g>)}
  </svg>
);

export const romeTheme: DestinationTheme = {
  key: "rome", label: "Eternal City", tagline: "Travertine, terracotta and long golden aperitivo hours",
  tokens: { primary: "#8c3b22", primaryInk: "#fff", secondary: OCHRE, accent: PINE, bg: "#faf5ec", surface: "#fff", ink: "#2b211b", muted: "#6b5d52", line: "#e8dccb", heroFrom: "#f3e3c8", heroTo: "#f0d2bd" },
  pattern: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><g fill='none' stroke='#8c3b22' stroke-opacity='.07' stroke-width='1.5'><circle cx='20' cy='20' r='12'/><path d='M8 20 H32 M20 8 V32'/><rect x='2' y='2' width='36' height='36'/></g></svg>`),
  dividerPattern: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='22' height='14'><path d='M1 13 V5 a5 5 0 0 1 10 0 V13 M11 13 V5 a5 5 0 0 1 10 0 V13' fill='none' stroke='#8c3b22' stroke-width='1.5'/></svg>`),
  HeroArt: Hero, Motif: Laurel, Sprig: ({ size = 60 }: P) => <svg {...A} width={size} height={size * 0.4} viewBox="0 0 100 40"><path d="M4 20 H96" stroke={PINE} strokeWidth="1.4" />{[20, 35, 50, 65, 80].map((x, i) => <ellipse key={x} cx={x} cy={i % 2 ? 15 : 25} rx="6" ry="2.4" fill={PINE} transform={`rotate(${i % 2 ? -25 : 25} ${x} ${i % 2 ? 15 : 25})`} />)}</svg>,
  Bullet: ({ size = 14 }: P) => <svg {...A} width={size} height={size} viewBox="0 0 20 20"><ellipse cx="10" cy="10" rx="8" ry="3.5" fill={PINE} transform="rotate(-35 10 10)" /></svg>,
  categoryOrnaments: { sight: Arch, museum: Arch, food: Pizza, cafe: Espresso, nightlife: Espresso, nature: StonePine, walk: Fountain, viewpoint: StonePine, shopping: Fountain, custom: Laurel },
  Ornaments: [Arch, Laurel, Espresso, StonePine, Pizza, Fountain],
  matches: (d) => d.catalogKey === "rome",
};
