import type { DestinationTheme } from "./types";
const svg = (s: string) => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
type P = { size?: number };
const A = { "aria-hidden": true, focusable: false } as const;
const NAVY = "#25324d", ROSE = "#c46a7a", GOLD = "#b8914a", ZINC = "#8a94a6", SAGE = "#7d8f74";

export const Eiffel = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <path d="M20 2 L22 12 L26 24 L33 38 H27 Q20 28 13 38 H7 L14 24 L18 12Z" fill={NAVY} />
    <path d="M16 24 H24 M18 12 H22" stroke="#f6efe4" strokeWidth="1.4" /><path d="M14.5 30 Q20 26 25.5 30" stroke="#f6efe4" strokeWidth="1.2" fill="none" />
  </svg>
);
export const Croissant = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <path d="M4 26 Q8 12 20 11 Q32 12 36 26 Q30 22 27 24 Q24 17 20 17 Q16 17 13 24 Q10 22 4 26Z" fill="#d79a4a" stroke="#a5672a" />
    <path d="M13 24 L16 16 M27 24 L24 16 M20 17 V11" stroke="#a5672a" strokeWidth="1.4" />
  </svg>
);
export const StreetLamp = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <rect x="19" y="14" width="2" height="22" fill={NAVY} /><path d="M14 38 H26" stroke={NAVY} strokeWidth="3" />
    <path d="M14 6 H26 L24 14 H16Z" fill="#f7d98a" stroke={NAVY} strokeWidth="1.5" /><path d="M13 6 L20 2 L27 6Z" fill={NAVY} />
  </svg>
);
export const WineGlass = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <path d="M12 4 H28 C28 16 24 20 20 20 C16 20 12 16 12 4Z" fill="#fff" stroke={NAVY} /><path d="M12.6 10 H27.4 C27 16 24 19 20 19 C16 19 13 16 12.6 10Z" fill="#7a1f35" />
    <path d="M20 20 V34 M14 35 H26" stroke={NAVY} strokeWidth="1.8" />
  </svg>
);
export const Macaron = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <ellipse cx="20" cy="15" rx="14" ry="6" fill={ROSE} /><rect x="7" y="17" width="26" height="5" rx="2" fill="#fbeedd" /><ellipse cx="20" cy="26" rx="14" ry="6" fill={ROSE} />
    <path d="M7 17 q13 4 26 0 M7 23 q13 4 26 0" stroke="#a24f60" fill="none" strokeDasharray="1.5 1.5" />
  </svg>
);
export const Rosette = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    {[0, 45, 90, 135].map((r) => <ellipse key={r} cx="20" cy="20" rx="16" ry="5" fill="none" stroke={GOLD} strokeWidth="1.4" transform={`rotate(${r} 20 20)`} />)}
    <circle cx="20" cy="20" r="4" fill={ROSE} />
  </svg>
);
const Hero = () => (
  <svg viewBox="0 0 600 260" className="hero-art" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMax meet">
    <circle cx="470" cy="70" r="34" fill="#f2c08a" opacity=".85" />
    <g fill={ZINC}>{[[20, 190, 90], [120, 200, 80], [380, 195, 90], [480, 185, 110]].map(([x, y, w]) => <g key={x}><rect x={x} y={y} width={w} height={260 - y} /><path d={`M${x - 4} ${y} L${x + 10} ${y - 18} H${x + w - 10} L${x + w + 4} ${y}Z`} fill="#5d677a" />{Array.from({ length: Math.floor(w / 22) }, (_, i) => <rect key={i} x={x + 8 + i * 22} y={y + 14} width="10" height="16" fill="#f6efe4" opacity=".7" />)}</g>)}</g>
    <g fill={NAVY} transform="translate(300 18)"><path d="M0 0 L5 50 L16 120 L44 230 H24 Q0 190 -24 230 H-44 L-16 120 L-5 50Z" /><path d="M-20 120 H20 M-8 50 H8" stroke="#f6efe4" strokeWidth="3" /><path d="M-30 180 Q0 160 30 180" stroke="#f6efe4" strokeWidth="3" fill="none" /></g>
    <path d="M0 252 Q300 238 600 252 V260 H0Z" fill="#7d93a8" />
  </svg>
);
export const parisTheme: DestinationTheme = {
  key: "paris", label: "Rive Gauche", tagline: "Zinc rooftops, boulangeries and evenings on the Seine",
  tokens: { primary: NAVY, primaryInk: "#fff", secondary: ROSE, accent: SAGE, bg: "#f8f5f0", surface: "#fff", ink: "#1f2433", muted: "#5f6474", line: "#e6e0d6", heroFrom: "#e3e7f0", heroTo: "#f6e4e2" },
  pattern: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36'><path d='M18 4 C22 10 22 14 18 18 C14 14 14 10 18 4Z' fill='${NAVY}' fill-opacity='.05'/><circle cx='4' cy='30' r='1.2' fill='${GOLD}' fill-opacity='.25'/></svg>`),
  dividerPattern: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='18' height='14'><path d='M1 7 Q5 1 9 7 T17 7' fill='none' stroke='${NAVY}' stroke-width='1.3'/></svg>`),
  HeroArt: Hero, Motif: Rosette, Sprig: ({ size = 60 }: P) => <svg {...A} width={size} height={size * 0.4} viewBox="0 0 100 40"><path d="M4 20 Q27 6 50 20 T96 20" stroke={GOLD} strokeWidth="1.4" fill="none" /><circle cx="50" cy="20" r="4" fill={ROSE} /></svg>,
  Bullet: ({ size = 14 }: P) => <svg {...A} width={size} height={size} viewBox="0 0 20 20"><path d="M10 2 C14 7 14 11 10 18 C6 11 6 7 10 2Z" fill={ROSE} /></svg>,
  categoryOrnaments: { sight: Eiffel, viewpoint: Eiffel, museum: Rosette, food: Croissant, cafe: Macaron, nightlife: WineGlass, walk: StreetLamp, shopping: Macaron, nature: Rosette, custom: Rosette },
  Ornaments: [Eiffel, Croissant, StreetLamp, WineGlass, Macaron, Rosette],
  matches: (d) => d.catalogKey === "paris",
};
