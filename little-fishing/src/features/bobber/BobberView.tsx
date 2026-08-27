import { useEffect, useRef, useState, type CSSProperties } from "react";
import { defaultAppSettings, type BobberSkinId } from "../../domain/prototype";
import { usePrototypeState } from "../../hooks/usePrototypeState";
import {
  activateBobberAlert,
  dismissBobberAlert,
  getAppSettings,
  showBobberContextMenu,
  startWindowDrag,
  subscribeAppSettings,
  subscribeBobberAlert,
  subscribeBobberSkinPreview,
  toggleCompactPanel,
} from "../../ipc/client";
import { getBobberSkin } from "./skins";

export function BobberView() {
  const { state } = usePrototypeState();
  const [savedSkinId, setSavedSkinId] = useState(defaultAppSettings.bobberSkin);
  const [previewSkinId, setPreviewSkinId] = useState<BobberSkinId | null>(null);
  const [hasAlert, setHasAlert] = useState(false);
  const pointer = useRef<{ x: number; y: number; dragged: boolean } | null>(null);
  const phase = state?.phase ?? "stopped";
  const skin = getBobberSkin(previewSkinId ?? savedSkinId);

  useEffect(() => {
    let active = true;
    let unlistenSettings: (() => void) | undefined;
    let unlistenPreview: (() => void) | undefined;
    let unlistenAlert: (() => void) | undefined;
    void getAppSettings().then((settings) => { if (active) setSavedSkinId(settings.bobberSkin); });
    void subscribeAppSettings((settings) => setSavedSkinId(settings.bobberSkin)).then((dispose) => { unlistenSettings = dispose; });
    void subscribeBobberSkinPreview(setPreviewSkinId).then((dispose) => { unlistenPreview = dispose; });
    void subscribeBobberAlert(setHasAlert).then((dispose) => { unlistenAlert = dispose; });
    return () => { active = false; unlistenSettings?.(); unlistenPreview?.(); unlistenAlert?.(); };
  }, []);

  return <main className="bobber-stage">
    {hasAlert && <button
      type="button"
      className="bobber-alert"
      aria-label="有新的钓鱼事件，点击打开主页"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={() => {
        setHasAlert(false);
        void activateBobberAlert();
      }}
    ><span aria-hidden="true">!</span></button>}
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
        if (!dragged) {
          setHasAlert(false);
          void dismissBobberAlert();
          void toggleCompactPanel();
        }
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
      </span>
    </button>
  </main>;
}
