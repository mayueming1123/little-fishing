export function TreasureIcon({ treasureId, discovered, label }: { treasureId: number; discovered: boolean; label: string }) {
  const common = {
    className: `treasure-icon ${discovered ? "discovered" : "locked"}`,
    viewBox: "0 0 64 64",
    role: "img" as const,
    "aria-label": discovered ? `${label}图标` : "未发现的隐藏宝物",
  };

  if (treasureId === 1) return <svg {...common}>
    <circle cx="32" cy="35" r="21" fill="#20252d" />
    <ellipse cx="25" cy="27" rx="7" ry="5" fill="#61748e" />
    <path d="M15 48c9 6 25 7 35-1" fill="none" stroke="#0d1117" strokeWidth="4" />
  </svg>;
  if (treasureId === 2) return <svg {...common}>
    <path d="M9 45h43l4 8H8z" fill="#98d8ee" />
    <path d="M16 43c8-5 13-14 15-29h11c-1 13 2 20 10 27l-6 7H16z" fill="#d9f4ff" stroke="#66aabd" strokeWidth="3" />
    <path d="M34 17h7" stroke="#fff" strokeWidth="4" />
  </svg>;
  if (treasureId === 3) return <svg {...common}>
    <rect x="7" y="39" width="50" height="15" rx="4" fill="#8e4f38" />
    <path d="M14 39V20h14v19m8 0V14h14v25" fill="#c93831" stroke="#6e2a25" strokeWidth="3" />
    <rect x="12" y="48" width="38" height="3" fill="#e5b260" />
  </svg>;
  if (treasureId === 4) return <svg {...common}>
    <path d="M14 52L45 13l5 4-31 39z" fill="#8a623f" />
    <path d="M37 25l10-2m-16 9-8-2m17-9 2-9" fill="none" stroke="#4d752f" strokeWidth="5" strokeLinecap="round" />
    <path d="M10 48l10 9" stroke="#725033" strokeWidth="7" strokeLinecap="round" />
  </svg>;
  return <svg {...common}>
    <path d="M9 14c10-4 18-2 23 3v39c-6-5-14-7-23-3zm46 0c-10-4-18-2-23 3v39c6-5 14-7 23-3z" fill="#d9bd77" stroke="#705334" strokeWidth="3" />
    <path d="M17 25h10m-10 8h10m10-8h10m-10 8h10" stroke="#8b302a" strokeWidth="3" />
    <path d="M32 18v37" stroke="#705334" strokeWidth="3" />
  </svg>;
}
