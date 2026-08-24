import { useEffect, useState } from "react";
import type { BobberToastPayload } from "../../domain/prototype";
import { activateBobberToast, subscribeBobberToast } from "../../ipc/client";

export function BobberToast() {
  const [message, setMessage] = useState<BobberToastPayload | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void subscribeBobberToast(setMessage).then((dispose) => { unlisten = dispose; });
    return () => unlisten?.();
  }, []);

  const kind = message?.kind ?? "event";
  return <main className="bobber-toast-stage">
    <button className={`bobber-toast-card ${kind}`} disabled={!message} onClick={() => void activateBobberToast()}>
      <span className="toast-symbol" aria-hidden="true">{kind === "catch" ? "鱼" : "·"}</span>
      <span className="toast-copy">
        <strong>{message?.title ?? "小小钓鱼"}</strong>
        <span>{message?.body ?? "水面暂时很安静。"}</span>
      </span>
      {(message?.count ?? 0) > 1 && <span className="toast-count" aria-label={`累计 ${message?.count} 条消息`}>×{message?.count}</span>}
    </button>
  </main>;
}
