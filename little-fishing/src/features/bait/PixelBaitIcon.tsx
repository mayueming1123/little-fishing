type BaitIconKind =
  | "corn" | "wineRice" | "worm" | "redWorm" | "bread" | "garlic"
  | "strawberry" | "sourWheat" | "shrimp" | "pupa" | "bran" | "soy"
  | "rapeseed" | "fishMeal" | "milk" | "sweetPotato" | "pumpkin" | "honey"
  | "fruitAcid" | "seaweed" | "liver" | "snail" | "algaePellet" | "molasses"
  | "basePowder" | "gluten" | "sweetPowder" | "clearAcid" | "salt" | "riceFlour";

interface BaitIconSpec {
  id: number;
  kind: BaitIconKind;
  background: string;
  dark: string;
  main: string;
  accent: string;
}

export const baitIconSpecs: readonly BaitIconSpec[] = [
  { id: 1, kind: "corn", background: "#f4e7b7", dark: "#78602a", main: "#f2c94c", accent: "#6f9b43" },
  { id: 2, kind: "wineRice", background: "#ead9c3", dark: "#76523b", main: "#f4eee1", accent: "#a94745" },
  { id: 3, kind: "worm", background: "#d8c3a8", dark: "#6e4036", main: "#a95848", accent: "#d48772" },
  { id: 4, kind: "redWorm", background: "#efd0c3", dark: "#7f3030", main: "#c84844", accent: "#f0a05d" },
  { id: 5, kind: "bread", background: "#f1dfb7", dark: "#8a6034", main: "#dca65c", accent: "#f5d890" },
  { id: 6, kind: "garlic", background: "#e6e3c5", dark: "#677842", main: "#f1ead2", accent: "#8fa85a" },
  { id: 7, kind: "strawberry", background: "#f2cfce", dark: "#842f3c", main: "#df4f58", accent: "#5f9a50" },
  { id: 8, kind: "sourWheat", background: "#e5d8aa", dark: "#746030", main: "#c9a94a", accent: "#8ba447" },
  { id: 9, kind: "shrimp", background: "#f1d2c4", dark: "#8b4740", main: "#e97862", accent: "#ffd09d" },
  { id: 10, kind: "pupa", background: "#ddd2b6", dark: "#67543a", main: "#a98250", accent: "#d8bc7d" },
  { id: 11, kind: "bran", background: "#e4d3a8", dark: "#755b30", main: "#c39b53", accent: "#ecd28c" },
  { id: 12, kind: "soy", background: "#dfd8ab", dark: "#5f6733", main: "#b9aa4e", accent: "#e3d982" },
  { id: 13, kind: "rapeseed", background: "#d8d1a0", dark: "#5d5530", main: "#8a783a", accent: "#d6b949" },
  { id: 14, kind: "fishMeal", background: "#cdd9d0", dark: "#3d6260", main: "#77a5a0", accent: "#d7c27c" },
  { id: 15, kind: "milk", background: "#e6e7dc", dark: "#55757a", main: "#f7f3df", accent: "#75a9b5" },
  { id: 16, kind: "sweetPotato", background: "#e5c8a8", dark: "#704538", main: "#a85f4c", accent: "#f0aa62" },
  { id: 17, kind: "pumpkin", background: "#efd5a7", dark: "#75512d", main: "#e99039", accent: "#62934b" },
  { id: 18, kind: "honey", background: "#f3dfaa", dark: "#77522c", main: "#e3a72f", accent: "#ffe082" },
  { id: 19, kind: "fruitAcid", background: "#e2d9ad", dark: "#66713a", main: "#b9ce4e", accent: "#f1e66c" },
  { id: 20, kind: "seaweed", background: "#cce0c5", dark: "#35664f", main: "#4e9270", accent: "#83bd70" },
  { id: 21, kind: "liver", background: "#dcc0b5", dark: "#652f35", main: "#963e48", accent: "#ca7470" },
  { id: 22, kind: "snail", background: "#d8d4b6", dark: "#5c5338", main: "#8d7850", accent: "#c3aa6c" },
  { id: 23, kind: "algaePellet", background: "#c9d6bf", dark: "#3d5f4b", main: "#668255", accent: "#94ad68" },
  { id: 24, kind: "molasses", background: "#d7c0a7", dark: "#4e3228", main: "#704332", accent: "#c88b4d" },
  { id: 25, kind: "basePowder", background: "#e8e1cf", dark: "#777061", main: "#d7d0be", accent: "#f5f1e8" },
  { id: 26, kind: "gluten", background: "#e2dbca", dark: "#716957", main: "#c6bda7", accent: "#eee9dc" },
  { id: 27, kind: "sweetPowder", background: "#e6dddf", dark: "#7d6873", main: "#f2e9ee", accent: "#e5a9c3" },
  { id: 28, kind: "clearAcid", background: "#d7e4d2", dark: "#54704d", main: "#eef2dc", accent: "#a8cc63" },
  { id: 29, kind: "salt", background: "#d8e2e1", dark: "#567277", main: "#eaf4f2", accent: "#9dc6ca" },
  { id: 30, kind: "riceFlour", background: "#eee3c4", dark: "#776945", main: "#faf1d7", accent: "#f0c755" },
] as const;

function PowderBag({ dark, main, accent, mark }: Pick<BaitIconSpec, "dark" | "main" | "accent"> & { mark: "grain" | "worm" | "fish" | "sparkle" | "drop" }) {
  return <>
    <path d="M14 12h20v4h4v24H10V16h4z" fill={dark} />
    <path d="M16 16h16v3h3v17H13V19h3z" fill={main} />
    <rect x="17" y="9" width="14" height="5" fill={accent} />
    {mark === "grain" && <><rect x="21" y="23" width="6" height="10" fill={accent} /><rect x="18" y="25" width="4" height="4" fill={accent} /><rect x="27" y="22" width="4" height="4" fill={accent} /></>}
    {mark === "worm" && <path d="M18 29h5v-5h6v4h4v5h-8v-4z" fill={accent} />}
    {mark === "fish" && <><path d="M17 27l6-6h8l5 6-5 6h-8z" fill={accent} /><rect x="27" y="24" width="3" height="3" fill={dark} /></>}
    {mark === "sparkle" && <><rect x="22" y="22" width="4" height="12" fill={accent} /><rect x="18" y="26" width="12" height="4" fill={accent} /></>}
    {mark === "drop" && <path d="M24 21h4v4h4v7h-4v4h-8v-4h-4v-7h4v-4z" fill={accent} />}
  </>;
}

function Motif({ spec }: { spec: BaitIconSpec }) {
  const { kind, dark, main, accent } = spec;
  if (kind === "corn") return <PowderBag dark={dark} main={main} accent={accent} mark="grain" />;
  if (kind === "redWorm") return <PowderBag dark={dark} main={main} accent={accent} mark="worm" />;
  if (kind === "fishMeal") return <PowderBag dark={dark} main={main} accent={accent} mark="fish" />;
  if (kind === "basePowder") return <PowderBag dark={dark} main={main} accent={accent} mark="sparkle" />;
  if (kind === "sweetPowder") return <PowderBag dark={dark} main={main} accent={accent} mark="sparkle" />;
  if (kind === "riceFlour") return <PowderBag dark={dark} main={main} accent={accent} mark="grain" />;
  if (kind === "wineRice") return <><path d="M14 13h20v5h4v22H10V18h4z" fill={dark} /><rect x="14" y="19" width="20" height="17" fill={main} /><rect x="17" y="9" width="14" height="6" fill={accent} /><rect x="19" y="24" width="10" height="8" fill={accent} /><rect x="22" y="26" width="4" height="4" fill="#f7ead0" /></>;
  if (kind === "worm") return <><path d="M10 29h5v-7h7v-5h9v4h7v8h-5v6h-9v-4h-7v5h-7z" fill={dark} /><path d="M14 28h5v-7h8v4h7v4h-5v3h-7v-4h-4v4h-4z" fill={main} /><rect x="29" y="23" width="3" height="3" fill={accent} /></>;
  if (kind === "bread") return <><path d="M10 20h4v-6h8v-4h10v4h6v6h3v18H7V20z" fill={dark} /><path d="M12 21h5v-5h15v5h5v13H12z" fill={main} /><rect x="18" y="20" width="5" height="8" fill={accent} /><rect x="28" y="19" width="5" height="7" fill={accent} /></>;
  if (kind === "garlic") return <><rect x="22" y="8" width="4" height="10" fill={accent} /><rect x="17" y="12" width="4" height="7" fill={accent} /><path d="M17 17h14v4h5v13h-4v5H16v-5h-4V21h5z" fill={dark} /><path d="M19 19h10v4h4v9h-4v4H19v-4h-4v-9h4z" fill={main} /><rect x="22" y="21" width="3" height="14" fill={accent} /></>;
  if (kind === "strawberry") return <><path d="M14 15h6v-5h4v5h4v-5h4v5h5v6h-3v10h-4v6H18v-6h-4V21h-3v-6z" fill={dark} /><path d="M16 18h16v12h-4v5h-8v-5h-4z" fill={main} /><rect x="18" y="21" width="3" height="3" fill={accent} /><rect x="26" y="25" width="3" height="3" fill={accent} /><rect x="22" y="29" width="3" height="3" fill={accent} /></>;
  if (kind === "sourWheat" || kind === "bran") return <><rect x="22" y="8" width="4" height="32" fill={dark} /><rect x="15" y="14" width="7" height="5" fill={main} /><rect x="26" y="11" width="7" height="5" fill={main} /><rect x="14" y="23" width="8" height="5" fill={accent} /><rect x="26" y="20" width="8" height="5" fill={accent} /><rect x="16" y="32" width="6" height="5" fill={main} /><rect x="26" y="29" width="7" height="5" fill={main} /></>;
  if (kind === "shrimp") return <><path d="M12 15h17v4h6v5h4v10h-5v5H17v-4h-6v-7h5v4h15v-4h-8v-4H12z" fill={dark} /><path d="M15 18h13v4h5v4h-11v-4h-7zm5 16h11v3H20z" fill={main} /><rect x="27" y="19" width="3" height="3" fill={accent} /></>;
  if (kind === "pupa") return <><path d="M18 9h12v4h5v22h-5v4H18v-4h-5V13h5z" fill={dark} /><rect x="18" y="13" width="12" height="22" fill={main} /><rect x="16" y="18" width="17" height="4" fill={accent} /><rect x="16" y="27" width="17" height="4" fill={accent} /></>;
  if (kind === "soy") return <><path d="M9 30h5v-7h8v-5h15v5h4v9h-5v6H20v-4h-6v4H9z" fill={dark} /><circle cx="20" cy="27" r="5" fill={main} /><circle cx="30" cy="25" r="5" fill={accent} /><circle cx="29" cy="33" r="5" fill={main} /></>;
  if (kind === "rapeseed") return <><path d="M10 15h28v6h4v16H6V21h4z" fill={dark} /><rect x="10" y="20" width="28" height="13" fill={main} /><rect x="14" y="23" width="5" height="5" fill={accent} /><rect x="22" y="27" width="5" height="5" fill={accent} /><rect x="30" y="22" width="5" height="5" fill={accent} /></>;
  if (kind === "milk") return <><path d="M17 9h14v6h4v25H13V15h4z" fill={dark} /><rect x="17" y="16" width="14" height="20" fill={main} /><rect x="17" y="22" width="14" height="7" fill={accent} /><rect x="20" y="11" width="8" height="4" fill="#f8f6e9" /></>;
  if (kind === "sweetPotato") return <><path d="M11 28h4v-8h8v-5h12v4h5v10h-4v6h-8v4H16v-4h-5z" fill={dark} /><path d="M15 27h4v-6h14v3h4v5h-4v4h-7v3h-9v-4h-2z" fill={main} /><rect x="24" y="22" width="4" height="4" fill={accent} /></>;
  if (kind === "pumpkin") return <><rect x="22" y="8" width="5" height="8" fill={accent} /><path d="M13 17h22v4h5v13h-5v5H13v-5H8V21h5z" fill={dark} /><rect x="13" y="20" width="22" height="15" fill={main} /><rect x="20" y="20" width="3" height="15" fill={accent} /><rect x="28" y="20" width="3" height="15" fill={accent} /></>;
  if (kind === "honey" || kind === "molasses") return <><path d="M15 13h18v5h4v21H11V18h4z" fill={dark} /><rect x="15" y="19" width="18" height="16" fill={main} /><rect x="18" y="9" width="12" height="6" fill={accent} /><rect x="19" y="23" width="10" height="8" fill={accent} /><rect x="22" y="25" width="4" height="4" fill={main} /></>;
  if (kind === "fruitAcid") return <><circle cx="22" cy="26" r="13" fill={dark} /><circle cx="22" cy="26" r="9" fill={main} /><path d="M22 17v18m-9-9h18m-15-6l12 12m0-12L16 32" stroke={accent} strokeWidth="3" /><rect x="31" y="10" width="5" height="12" fill={accent} /><rect x="35" y="8" width="4" height="6" fill={dark} /></>;
  if (kind === "seaweed") return <><path d="M11 39V25h5v-9h5v23zm9 0V18h5V9h5v30zm10 0V26h5v-8h5v21z" fill={dark} /><path d="M14 39V27h4v12zm9 0V20h4V13h2v26zm10 0V28h4v11z" fill={main} /><rect x="17" y="20" width="4" height="4" fill={accent} /><rect x="30" y="21" width="4" height="4" fill={accent} /></>;
  if (kind === "liver") return <><path d="M9 20h5v-6h13v3h10v5h4v11h-6v5H16v-4H9z" fill={dark} /><path d="M13 21h5v-4h8v4h10v10h-5v4H18v-4h-5z" fill={main} /><rect x="18" y="23" width="9" height="4" fill={accent} /></>;
  if (kind === "snail") return <><path d="M9 31h6v-9h5v-6h13v4h5v11h4v7H9z" fill={dark} /><circle cx="27" cy="25" r="10" fill={main} /><rect x="24" y="21" width="7" height="7" fill={dark} /><rect x="26" y="23" width="3" height="3" fill={accent} /><rect x="13" y="28" width="8" height="6" fill={accent} /><rect x="14" y="23" width="3" height="6" fill={dark} /></>;
  if (kind === "algaePellet") return <><path d="M9 13h30v6h4v21H5V19h4z" fill={dark} /><rect x="9" y="19" width="30" height="17" fill={main} /><circle cx="17" cy="25" r="4" fill={accent} /><circle cx="27" cy="29" r="4" fill={dark} /><circle cx="35" cy="24" r="3" fill={accent} /></>;
  if (kind === "gluten") return <><path d="M10 26h4v-7h7v-5h12v4h6v8h4v8h-6v5H15v-4h-5z" fill={dark} /><path d="M14 26h4v-6h14v3h6v8h-5v4H17v-4h-3z" fill={main} /><rect x="21" y="23" width="9" height="4" fill={accent} /></>;
  if (kind === "clearAcid") return <><path d="M20 8h8v8h4v7h4v12h-4v5H16v-5h-4V23h4v-7h4z" fill={dark} /><path d="M20 17h8v8h4v9h-4v3h-8v-3h-4v-9h4z" fill={main} /><path d="M22 22h4v5h4v5h-4v4h-4v-4h-4v-5h4z" fill={accent} /></>;
  if (kind === "salt") return <><path d="M22 8h8l4 8 7 5-3 10-8 9H18L8 31l4-12z" fill={dark} /><path d="M23 12h5l3 7 6 4-3 6-7 7h-7l-7-7 3-8z" fill={main} /><rect x="21" y="18" width="7" height="7" fill={accent} /><rect x="29" y="27" width="4" height="4" fill="#fff" /></>;
  return null;
}

export function PixelBaitIcon({ ingredientId, label }: { ingredientId: number; label: string }) {
  const spec = baitIconSpecs.find((candidate) => candidate.id === ingredientId) ?? baitIconSpecs[0];
  return <svg className="pixel-bait-icon" data-bait-id={ingredientId} viewBox="0 0 48 48" role="img" aria-label={`${label}像素图标`} shapeRendering="crispEdges">
    <path d="M6 2h36v4h4v36h-4v4H6v-4H2V6h4z" fill={spec.dark} opacity=".2" />
    <path d="M7 4h34v4h3v32h-4v4H8v-4H4V8h3z" fill={spec.background} />
    <Motif spec={spec} />
  </svg>;
}
