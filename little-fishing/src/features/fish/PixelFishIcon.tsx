const palettes = [
  ["#b9854b", "#765236"], ["#b8b8a1", "#7f806f"], ["#76966b", "#4e7049"],
  ["#aab7b7", "#708d91"], ["#889b8e", "#566f62"], ["#c7a86b", "#816d45"],
  ["#b89b59", "#6c5b34"], ["#91a55d", "#596c35"], ["#9aa9a2", "#536c68"],
  ["#817765", "#4d473c"],
] as const;

export function PixelFishIcon({ fishId, label }: { fishId: number; label: string }) {
  const [body, dark] = palettes[(fishId - 1 + palettes.length) % palettes.length];
  const spotX = 17 + (fishId % 3) * 5;
  return <svg className="pixel-fish" viewBox="0 0 48 32" role="img" aria-label={`${label}像素图标`} shapeRendering="crispEdges">
    <path fill={dark} d="M4 12h6V8h6V5h18v3h5v4h5v8h-5v4h-5v3H16v-3h-6v-4H4l-4 4V8z" />
    <path fill={body} d="M8 13h4V10h6V8h14v3h6v3h4v4h-4v3h-6v3H18v-3h-6v-3H8z" />
    <rect x="33" y="12" width="3" height="3" fill="#f8f4dc" />
    <rect x="34" y="13" width="2" height="2" fill="#243a3d" />
    <rect x={spotX} y="13" width="4" height="4" fill={dark} opacity=".68" />
  </svg>;
}
