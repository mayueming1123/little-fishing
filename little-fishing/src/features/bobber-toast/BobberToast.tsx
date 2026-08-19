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

  return <main className="bobber-toast-stage">
    <button className="bobber-toast-card" disabled={!message} onClick={() => void activateBobberToast()}>
      <span className="toast-water" aria-hidden="true"><i /><i /><i /></span>
      <span className="toast-copy">
        <strong>{message?.title ?? "小小钓鱼"}</strong>
        <span>{message?.body ?? "水面暂时很安静。"}</span>
        <small>点击查看完整记录</small>
      </span>
    </button>
  </main>;
}
