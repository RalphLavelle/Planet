import type { DestinationTheme } from "./types";
const svg = (s: string) => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
type P = { size?: number };
const A = { "aria-hidden": true, focusable: false } as const;
const BLUE = "#1b6ca8", COBALT = "#173f73", RED = "#c23b4a", GREEN = "#2f6f5e", GOLD = "#e0a43a";

export const Tulip = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <path d="M20 36 V20" stroke={GREEN} strokeWidth="2" />
    <path d="M20 22 C10 20 10 8 13 5 L17 11 L20 4 L23 11 L27 5 C30 8 30 20 20 22Z" fill={RED} />
    <path d="M20 30 C14 30 12 26 12 24 C16 24 19 26 20 30Z" fill={GREEN} />
  </svg>
);
export const Nazar = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="19" fill={COBALT} /><circle cx="20" cy="20" r="13.5" fill="#fff" />
    <circle cx="20" cy="20" r="9" fill="#7cc4e8" /><circle cx="20" cy="20" r="4.5" fill="#0b1f3a" />
    <circle cx="20" cy="3" r="2.5" fill={GOLD} />
  </svg>
);
export const IznikTile = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <rect x="1" y="1" width="38" height="38" rx="4" fill="#fbf8f2" stroke={BLUE} strokeWidth="2" />
    <path d="M20 6 C26 12 26 16 20 20 C14 16 14 12 20 6Z M20 34 C26 28 26 24 20 20 C14 24 14 28 20 34Z M6 20 C12 14 16 14 20 20 C16 26 12 26 6 20Z M34 20 C28 14 24 14 20 20 C24 26 28 26 34 20Z" fill={BLUE} />
    <circle cx="20" cy="20" r="3.2" fill={RED} />
    {[[6, 6], [34, 6], [6, 34], [34, 34]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="2.4" fill={GREEN} />)}
  </svg>
);
export const Mosque = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <g fill="#33415c"><rect x="9" y="22" width="22" height="13" /><path d="M11 22 a9 9 0 0 1 18 0Z" /><rect x="19.3" y="9" width="1.4" height="5" />
      <rect x="4" y="12" width="2.6" height="23" /><path d="M4 12 l1.3 -7 l1.3 7Z" /><rect x="33.4" y="12" width="2.6" height="23" /><path d="M33.4 12 l1.3 -7 l1.3 7Z" /></g>
    <path d="M17 30 a3 3 0 0 1 6 0 V35 H17Z" fill={GOLD} />
  </svg>
);
export const Simit = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="14" fill="none" stroke="#b8732f" strokeWidth="9" />
    <circle cx="20" cy="20" r="14" fill="none" stroke="#8a4f1c" strokeWidth="9" strokeDasharray="2 5" opacity=".55" />
    {[0, 50, 100, 150, 200, 250, 300].map((r) => <ellipse key={r} cx="20" cy="7" rx="1.1" ry=".6" fill="#f6e7c8" transform={`rotate(${r} 20 20)`} />)}
  </svg>
);
export const TeaGlass = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <ellipse cx="20" cy="35" rx="13" ry="3" fill={RED} /><ellipse cx="20" cy="34.4" rx="9" ry="1.6" fill="#fff" />
    <path d="M13 6 H27 C25 12 24 15 26 20 C28 26 26 32 24 33 H16 C14 32 12 26 14 20 C16 15 15 12 13 6Z" fill="#f4e9e1" stroke="#9aa5b1" />
    <path d="M14.2 16 H25.8 C25 18 25.5 19 26.3 21 C27.6 26 26 31 24 32 H16 C14 31 12.4 26 13.7 21 C14.5 19 15 18 14.2 16Z" fill="#a8321f" />
  </svg>
);
export const Ferry = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <rect x="10" y="14" width="18" height="8" rx="1" fill="#fff" stroke="#33415c" /><rect x="15" y="9" width="4" height="5" fill="#33415c" />
    {[12, 16, 20, 24].map((x) => <rect key={x} x={x} y="16" width="2.5" height="2.5" fill={BLUE} />)}
    <path d="M4 22 H36 L32 29 H8Z" fill="#33415c" />
    <path d="M2 34 q4.5 -3 9 0 t9 0 t9 0 t9 0" stroke={BLUE} strokeWidth="2" fill="none" />
  </svg>
);
const Vine = ({ size = 60 }: P) => (
  <svg {...A} width={size} height={size * 0.4} viewBox="0 0 100 40">
    <path d="M4 20 C20 5 30 35 50 20 S80 5 96 20" stroke={GREEN} strokeWidth="1.6" fill="none" />
    <path d="M50 26 C44 25 44 16 46 14 L48 18 L50 13 L52 18 L54 14 C56 16 56 25 50 26Z" fill={RED} />
    <circle cx="22" cy="14" r="2.5" fill={BLUE} /><circle cx="78" cy="26" r="2.5" fill={BLUE} />
  </svg>
);
const Skyline = () => (
  <svg viewBox="0 0 600 260" className="hero-art" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMax meet">
    <circle cx="120" cy="70" r="36" fill="#f2b45a" opacity=".85" />
    <path d="M0 236 Q150 222 300 236 T600 236 V260 H0Z" fill={BLUE} opacity=".5" />
    <g fill="#33415c">
      <rect x="180" y="150" width="240" height="70" />
      <path d="M240 150 a60 60 0 0 1 120 0Z" />
      <path d="M200 160 a22 22 0 0 1 44 0Z" /><path d="M356 160 a22 22 0 0 1 44 0Z" />
      {[160, 196, 404, 440].map((x) => <g key={x}><rect x={x} y="70" width="7" height="150" /><path d={`M${x} 70 l3.5 -22 l3.5 22Z`} /></g>)}
      <rect x="296" y="98" width="8" height="12" />
      <path d="M470 220 V130 l12 -18 l12 18 V220Z" />
    </g>
    <g transform="translate(60 205)"><rect x="10" y="4" width="34" height="9" fill="#fff" /><path d="M0 13 H56 L50 22 H6Z" fill="#33415c" /></g>
  </svg>
);

export const istanbulTheme: DestinationTheme = {
  key: "istanbul", label: "Bosphorus", tagline: "Domes, tulips and ferries between continents",
  tokens: { primary: BLUE, primaryInk: "#fff", secondary: RED, accent: GREEN, bg: "#f8f6f1", surface: "#fff", ink: "#1e2633", muted: "#5a6372", line: "#e3ddd2", heroFrom: "#d9e9f4", heroTo: "#f7e6d6" },
  // Iznik-style quatrefoil tile pattern
  pattern: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'><g fill='none' stroke='${BLUE}' stroke-opacity='.08' stroke-width='1.5'><path d='M24 4 C32 12 32 18 24 24 C16 18 16 12 24 4Z M24 44 C32 36 32 30 24 24 C16 30 16 36 24 44Z M4 24 C12 16 18 16 24 24 C18 32 12 32 4 24Z M44 24 C36 16 30 16 24 24 C30 32 36 32 44 24Z'/></g><circle cx='24' cy='24' r='2' fill='${RED}' fill-opacity='.12'/></svg>`),
  dividerPattern: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='20' height='14'><path d='M10 1 L18 7 L10 13 L2 7Z' fill='none' stroke='${BLUE}' stroke-width='1.4'/><circle cx='10' cy='7' r='1.6' fill='${RED}'/></svg>`),
  HeroArt: Skyline, Motif: Nazar, Sprig: Vine, Bullet: Tulip,
  categoryOrnaments: { sight: Mosque, museum: IznikTile, food: Simit, cafe: TeaGlass, nightlife: TeaGlass, transport: Ferry, viewpoint: Ferry, shopping: IznikTile, nature: Tulip, walk: Tulip, custom: Nazar },
  Ornaments: [Tulip, Nazar, IznikTile, Mosque, Simit, TeaGlass, Ferry],
  matches: (d) => d.catalogKey === "istanbul",
};
