import { useEffect, useRef, useState, type CSSProperties } from "react";
import { defaultAppSettings, type BobberSkinId } from "../../domain/prototype";
import { usePrototypeState } from "../../hooks/usePrototypeState";
import {
  getAppSettings,
  showBobberContextMenu,
  startWindowDrag,
  subscribeAppSettings,
  subscribeBobberSkinPreview,
  toggleCompactPanel,
} from "../../ipc/client";
import { getBobberSkin } from "./skins";

export function BobberView() {
  const { state } = usePrototypeState();
  const [savedSkinId, setSavedSkinId] = useState(defaultAppSettings.bobberSkin);
  const [previewSkinId, setPreviewSkinId] = useState<BobberSkinId | null>(null);
  const pointer = useRef<{ x: number; y: number; dragged: boolean } | null>(null);
  const phase = state?.phase ?? "stopped";
  const skin = getBobberSkin(previewSkinId ?? savedSkinId);

  useEffect(() => {
    let active = true;
    let unlistenSettings: (() => void) | undefined;
    let unlistenPreview: (() => void) | undefined;
    void getAppSettings().then((settings) => { if (active) setSavedSkinId(settings.bobberSkin); });
    void subscribeAppSettings((settings) => setSavedSkinId(settings.bobberSkin)).then((dispose) => { unlistenSettings = dispose; });
    void subscribeBobberSkinPreview(setPreviewSkinId).then((dispose) => { unlistenPreview = dispose; });
    return () => { active = false; unlistenSettings?.(); unlistenPreview?.(); };
  }, []);

  return <main className="bobber-stage">
    <button
      className={`bobber-button ${phase}`}
      aria-label={state?.isFishing ? "钓鱼中，点击打开状态面板" : "已停止，点击打开状态面板"}
      onPointerDown={(event) => { pointer.current = { x: event.screenX, y: event.screenY, dragged: false }; }}
      onPointerMove={(event) => {
        if (!pointer.current || pointer.current.dragged) return;
        if (Math.hypot(event.screenX - pointer.current.x, event.screenY - pointer.current.y) >= 4) {
          pointer.current.dragged = true;
          void startWindowDrag();
        }
      }}
      onPointerUp={() => {
        const dragged = pointer.current?.dragged;
        pointer.current = null;
        if (!dragged) void toggleCompactPanel();
      }}
      onContextMenu={(event) => { event.preventDefault(); void showBobberContextMenu(); }}
    >
      <span
        className="bobber-hit-area"
        data-skin={skin.value}
        style={{ "--bobber-float-x": `${skin.floatX}%`, "--bobber-float-y": `${skin.floatY}%`, "--bobber-skin-inset": `${skin.inset}%` } as CSSProperties}
      >
        <img className="bobber-cat-scene" src={skin.image} alt="" aria-hidden="true" draggable={false} />
        <img className="bobber-float-layer" src={skin.image} alt="" aria-hidden="true" draggable={false} />
        <span className="bobber-status-mark" />
      </span>
    </button>
  </main>;
}
