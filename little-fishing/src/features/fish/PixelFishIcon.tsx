type FishShape = "standard" | "deep" | "slender" | "catfish" | "eel" | "flat" | "grouper" | "pomfret";
type FishMarking = "scales" | "stripe" | "bands" | "spots" | "speckles" | "lateral" | "saddle" | "plain";

interface FishIconSpec {
  shape: FishShape;
  marking: FishMarking;
  body: string;
  dark: string;
  accent: string;
  belly: string;
  whiskers?: boolean;
  spines?: boolean;
}

// 顺序与数据库中 1～40 号鱼种严格对应；轮廓、花纹与配色组合均不重复。
export const fishIconSpecs: readonly FishIconSpec[] = [
  { shape: "standard", marking: "scales", body: "#ad7b42", dark: "#65452e", accent: "#d5ad62", belly: "#d8bd86", whiskers: true },
  { shape: "deep", marking: "scales", body: "#a9a58c", dark: "#62685d", accent: "#d6c48c", belly: "#d7d4be" },
  { shape: "slender", marking: "lateral", body: "#829862", dark: "#435f43", accent: "#c3b15e", belly: "#bdc6a5" },
  { shape: "deep", marking: "plain", body: "#cad3ce", dark: "#718b8b", accent: "#e6ece6", belly: "#edf0e8" },
  { shape: "deep", marking: "speckles", body: "#899792", dark: "#4d6969", accent: "#596d75", belly: "#bac3b8" },
  { shape: "pomfret", marking: "lateral", body: "#a4aa91", dark: "#5d705b", accent: "#c0a65d", belly: "#d2d3bd" },
  { shape: "catfish", marking: "spots", body: "#c49b43", dark: "#70572b", accent: "#2d4a47", belly: "#e2c575", whiskers: true, spines: true },
  { shape: "grouper", marking: "saddle", body: "#8d9661", dark: "#445540", accent: "#c1aa58", belly: "#b8bd88", spines: true },
  { shape: "standard", marking: "bands", body: "#92a3a0", dark: "#405a5c", accent: "#596c69", belly: "#d1d8d1", spines: true },
  { shape: "catfish", marking: "plain", body: "#756c5b", dark: "#3e403b", accent: "#9d8c69", belly: "#aaa18b", whiskers: true },
  { shape: "slender", marking: "scales", body: "#526f5b", dark: "#293f36", accent: "#84946e", belly: "#8fa08d" },
  { shape: "slender", marking: "saddle", body: "#596754", dark: "#283932", accent: "#202f2b", belly: "#8d977e" },
  { shape: "catfish", marking: "speckles", body: "#777260", dark: "#3f433b", accent: "#9c8b66", belly: "#ada58c", whiskers: true },
  { shape: "eel", marking: "plain", body: "#967036", dark: "#523f29", accent: "#c69a4d", belly: "#b9955c" },
  { shape: "eel", marking: "spots", body: "#766f4d", dark: "#393b30", accent: "#a99b5b", belly: "#9a9473", whiskers: true },
  { shape: "slender", marking: "lateral", body: "#c7d1cd", dark: "#698187", accent: "#8ea4a4", belly: "#eef0e9" },
  { shape: "standard", marking: "lateral", body: "#d4b24c", dark: "#775631", accent: "#f0cb63", belly: "#e8d79b" },
  { shape: "slender", marking: "bands", body: "#598d9d", dark: "#31586a", accent: "#8cc1c7", belly: "#b8d0cd" },
  { shape: "deep", marking: "saddle", body: "#a9a06f", dark: "#525a45", accent: "#e1c44b", belly: "#d5cfaa", spines: true },
  { shape: "slender", marking: "spots", body: "#5d7e87", dark: "#314b54", accent: "#a1b9ae", belly: "#b9c7c0" },
  { shape: "eel", marking: "lateral", body: "#aeb8b1", dark: "#586b70", accent: "#d9dde0", belly: "#e6e8df" },
  { shape: "eel", marking: "speckles", body: "#5d665b", dark: "#303a36", accent: "#899074", belly: "#8e9683" },
  { shape: "flat", marking: "spots", body: "#9a8464", dark: "#504737", accent: "#c3a974", belly: "#b7a78e" },
  { shape: "grouper", marking: "bands", body: "#d0c89d", dark: "#625f4c", accent: "#8c7358", belly: "#e8dfbc", spines: true },
  { shape: "grouper", marking: "spots", body: "#d06047", dark: "#713d38", accent: "#6bb0b5", belly: "#e7a078", spines: true },
  { shape: "grouper", marking: "speckles", body: "#b36a58", dark: "#643e39", accent: "#d6b35b", belly: "#d69b82", spines: true },
  { shape: "grouper", marking: "saddle", body: "#638077", dark: "#344e4b", accent: "#8eb09a", belly: "#9db4a8", spines: true },
  { shape: "pomfret", marking: "bands", body: "#899da0", dark: "#445d62", accent: "#c3b06f", belly: "#c4d0cc", spines: true },
  { shape: "pomfret", marking: "plain", body: "#c8d0cf", dark: "#71868a", accent: "#eef2ec", belly: "#e8ece5" },
  { shape: "pomfret", marking: "lateral", body: "#d6aa43", dark: "#765a2d", accent: "#f0cf65", belly: "#e8cc87" },
  { shape: "deep", marking: "stripe", body: "#829064", dark: "#40523c", accent: "#a6b85d", belly: "#c1c9a4" },
  { shape: "standard", marking: "speckles", body: "#6f9a78", dark: "#365947", accent: "#d2b35c", belly: "#b9cbb1", spines: true },
  { shape: "slender", marking: "plain", body: "#c5d6d2", dark: "#6e8584", accent: "#e4eeea", belly: "#f0f2e9" },
  { shape: "deep", marking: "spots", body: "#c49a4f", dark: "#6d5438", accent: "#657f55", belly: "#ddc58d", spines: true },
  { shape: "deep", marking: "bands", body: "#737b7c", dark: "#343e42", accent: "#aeb5ad", belly: "#c6cbc5", spines: true },
  { shape: "standard", marking: "saddle", body: "#b48373", dark: "#654a43", accent: "#d8ad82", belly: "#dcc4aa", whiskers: true },
  { shape: "slender", marking: "stripe", body: "#c68c6f", dark: "#6f4e49", accent: "#e5c45f", belly: "#e2b9a1" },
  { shape: "slender", marking: "speckles", body: "#688895", dark: "#344e5a", accent: "#a8bec0", belly: "#bdccca" },
  { shape: "eel", marking: "saddle", body: "#8b8060", dark: "#494a39", accent: "#b7a767", belly: "#aaa48a" },
  { shape: "slender", marking: "bands", body: "#a58b66", dark: "#53473b", accent: "#d1bd88", belly: "#c7bda5", spines: true },
] as const;

const shapePaths: Record<FishShape, { outer: string; inner: string; eye: [number, number] }> = {
  standard: { outer: "M2 8h5v4h6v4h5v-4h6V8h24v4h8v4h6v8h-6v4h-8v4H24v-4h-6v-4h-5v4H7v4H2l4-12z", inner: "M14 18h6v-4h26v3h9v6h-9v3H20v-4h-6z", eye: [51, 17] },
  deep: { outer: "M3 9h5v4h6v3h5v-6h7V5h20v4h8v5h6v12h-6v5h-8v4H26v-4h-7v-7h-5v3H8v4H3l4-11z", inner: "M15 18h6v-6h24v3h9v10h-9v4H21v-7h-6z", eye: [50, 16] },
  slender: { outer: "M2 11h5v4h8v3h6v-4h8v-3h19v3h9v4h6v6h-6v4h-9v3H29v-3h-8v-4h-6v3H7v3H2l5-10z", inner: "M15 20h8v-4h25v2h8v5h-8v3H23v-4h-8z", eye: [51, 18] },
  catfish: { outer: "M3 10h5v5h7v3h5v-5h8V9h22v4h8v5h5v8h-7v4H29v3H20v-7h-5v3H8v3H3l5-11z", inner: "M15 20h7v-5h27v2h8v7h-9v4H22v-4h-7z", eye: [52, 17] },
  eel: { outer: "M2 13h5v3h7v3h31v-3h10v3h7v8h-7v3H42v-3H14v3H7v3H2l5-10z", inner: "M14 21h31v-3h10v7H42v-2H14z", eye: [52, 19] },
  flat: { outer: "M4 12h7v3h8V9h7V6h20v4h8v5h6v11h-8v5H34v4H18v-4h-7v3H4l4-11z", inner: "M14 19h7v-7h24v2h9v10h-8v4H21v-5h-7z", eye: [49, 13] },
  grouper: { outer: "M2 9h6v4h7v4h5v-5h6V7h22v4h8v5h6v10h-6v5h-9v3H25v-4h-8v-5h-3v4H8v3H2l5-12z", inner: "M14 19h8v-5h25v-2h8v12h-9v5H23v-5h-9z", eye: [51, 15] },
  pomfret: { outer: "M3 10h6v4h7v3h4v-6h5V6h20v5h7v4h7v11h-7v4h-7v5H25v-5h-5v-6h-4v3H9v4H3l5-11z", inner: "M15 19h7v-7h22v2h9v11h-9v4H22v-7h-7z", eye: [48, 15] },
};

function Marking({ type, color }: { type: FishMarking; color: string }) {
  if (type === "plain") return null;
  if (type === "lateral") return <><rect x="24" y="20" width="24" height="2" fill={color} /><rect x="43" y="18" width="8" height="2" fill={color} /></>;
  if (type === "stripe") return <><rect x="31" y="12" width="3" height="17" fill={color} /><rect x="39" y="11" width="3" height="19" fill={color} /></>;
  if (type === "bands") return <><rect x="27" y="12" width="4" height="17" fill={color} /><rect x="38" y="10" width="4" height="20" fill={color} /><rect x="48" y="13" width="3" height="14" fill={color} /></>;
  if (type === "saddle") return <><rect x="27" y="11" width="8" height="6" fill={color} /><rect x="42" y="10" width="7" height="7" fill={color} /><rect x="34" y="25" width="8" height="4" fill={color} /></>;
  if (type === "spots") return <><rect x="27" y="14" width="4" height="4" fill={color} /><rect x="37" y="21" width="3" height="3" fill={color} /><rect x="45" y="13" width="4" height="4" fill={color} /><rect x="28" y="25" width="3" height="3" fill={color} /></>;
  if (type === "speckles") return <><rect x="25" y="16" width="2" height="2" fill={color} /><rect x="31" y="22" width="2" height="2" fill={color} /><rect x="37" y="14" width="2" height="2" fill={color} /><rect x="43" y="24" width="2" height="2" fill={color} /><rect x="48" y="18" width="2" height="2" fill={color} /></>;
  return <><rect x="26" y="16" width="3" height="3" fill={color} /><rect x="31" y="20" width="3" height="3" fill={color} /><rect x="36" y="16" width="3" height="3" fill={color} /><rect x="41" y="20" width="3" height="3" fill={color} /></>;
}

export function PixelFishIcon({ fishId, label }: { fishId: number; label: string }) {
  const spec = fishIconSpecs[(fishId - 1 + fishIconSpecs.length) % fishIconSpecs.length];
  const shape = shapePaths[spec.shape];
  return <svg className="pixel-fish" data-fish-id={fishId} viewBox="0 0 64 40" role="img" aria-label={`${label}像素图标`} shapeRendering="crispEdges">
    <path fill={spec.dark} d={shape.outer} />
    <path fill={spec.body} d={shape.inner} />
    <rect x="22" y="25" width="24" height="3" fill={spec.belly} opacity=".78" />
    <Marking type={spec.marking} color={spec.accent} />
    {spec.spines && <path fill={spec.dark} d="M27 10V5h4v5h4V4h4v6h4V6h4v5z" />}
    {spec.whiskers && <path d="M55 23h8v2h-8zm-1 4h7v2h-7z" fill={spec.dark} />}
    <rect x={shape.eye[0]} y={shape.eye[1]} width="4" height="4" fill="#f6f1d7" />
    <rect x={shape.eye[0] + 2} y={shape.eye[1] + 1} width="2" height="2" fill="#243a3d" />
    <rect x="20" y="29" width="7" height="3" fill={spec.dark} opacity=".86" />
  </svg>;
}
