import { useRef } from "react";
import { usePrototypeState } from "../../hooks/usePrototypeState";
import { showBobberContextMenu, startWindowDrag, toggleCompactPanel } from "../../ipc/client";

export function BobberView() {
  const { state } = usePrototypeState();
  const pointer = useRef<{ x: number; y: number; dragged: boolean } | null>(null);
  const phase = state?.phase ?? "stopped";

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
      <span className="bobber-hit-area">
        <span className="bobber-water" aria-hidden="true">
          <span className="bobber-ripple ripple-one" />
          <span className="bobber-ripple ripple-two" />
          <span className="bobber-ripple ripple-three" />
          <span className="bobber-ripple ripple-four" />
        </span>
        <span className="bobber-body"><span className="bobber-stem" /><span className="bobber-float" /></span>
        <span className="bobber-status-mark" />
      </span>
    </button>
  </main>;
}
