/** Hand-drawn lightweight SVG ornaments for the Greek/Aegean theme. Decorative only (aria-hidden). */
type P = { size?: number };
const A = { "aria-hidden": true, focusable: false } as const;
const BLUE = "#1d4e89", TERRA = "#c8643b", OLIVE = "#6b7a3a", STONE = "#d9c6a5", SEA = "#5fa8d3";

export const Column = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <rect x="9" y="4" width="22" height="4" rx="1" fill={STONE} stroke="#a8855c" />
    <path d="M10 8 q-3 0 -3 3 M30 8 q3 0 3 3" stroke="#a8855c" fill="none" strokeWidth="1.5" />
    <rect x="12" y="9" width="16" height="23" fill="#f4ecdf" stroke="#a8855c" />
    {[15.5, 20, 24.5].map((x) => <line key={x} x1={x} y1="10" x2={x} y2="31" stroke="#c9b28c" strokeWidth="1.2" />)}
    <rect x="9" y="32" width="22" height="4" rx="1" fill={STONE} stroke="#a8855c" />
  </svg>
);
export const Amphora = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <path d="M16 4 h8 v4 c0 2 6 5 6 13 c0 8 -5 12 -10 15 c-5 -3 -10 -7 -10 -15 c0 -8 6 -11 6 -13Z" fill={TERRA} />
    <path d="M16 9 c-6 0 -7 7 -4 9 M24 9 c6 0 7 7 4 9" stroke={TERRA} strokeWidth="2" fill="none" />
    <path d="M11 20 h18" stroke="#1f2a37" strokeWidth="1.5" /><path d="M11.5 24 h17" stroke="#1f2a37" strokeWidth="1" strokeDasharray="2 2" />
  </svg>
);
export const SunSea = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <circle cx="20" cy="18" r="8" fill="#f2b45a" />
    {[0, 45, 90, 135, 180].map((r) => <line key={r} x1="20" y1="5" x2="20" y2="8" stroke="#f2b45a" strokeWidth="2" transform={`rotate(${r - 90} 20 18)`} />)}
    <rect x="2" y="22" width="36" height="14" fill="#fff" />
    <path d="M2 25 q4.5 -3 9 0 t9 0 t9 0 t9 0 M2 31 q4.5 -3 9 0 t9 0 t9 0 t9 0" stroke={SEA} strokeWidth="2.2" fill="none" />
  </svg>
);
export const OliveLeaf = ({ size = 14 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 20 20">
    <path d="M3 17 C5 7 11 3 17 3 C16 10 11 16 3 17Z" fill={OLIVE} /><path d="M3 17 L14 6" stroke="#f4ecdf" strokeWidth="1" />
  </svg>
);
export const OliveBranch = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <path d="M6 34 C14 26 22 16 34 6" stroke="#5a4630" strokeWidth="1.6" fill="none" />
    {[[12, 27, -40], [17, 21, 50], [22, 17, -40], [27, 12, 50], [31, 8, -30]].map(([x, y, r], i) => <ellipse key={i} cx={x} cy={y} rx="6" ry="2.3" fill={OLIVE} transform={`rotate(${r} ${x} ${y})`} />)}
    <circle cx="15" cy="27" r="2.4" fill="#2f3a17" /><circle cx="25" cy="18" r="2.4" fill="#2f3a17" />
  </svg>
);
export const KeyTile = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <rect x="1" y="1" width="38" height="38" rx="8" fill={BLUE} />
    <path d="M9 31 V9 H31 V27 H15 V15 H25 V21 H20" stroke="#fff" strokeWidth="2.6" fill="none" />
  </svg>
);
export const GreekBoat = ({ size = 22 }: P) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <path d="M20 6 V26 M20 8 L31 24 H20Z" fill="#fff" stroke={BLUE} strokeWidth="1.5" />
    <path d="M5 27 H35 L30 33 H10Z" fill={TERRA} />
    <path d="M2 36 q4.5 -3 9 0 t9 0 t9 0 t9 0" stroke={SEA} strokeWidth="2" fill="none" />
  </svg>
);
