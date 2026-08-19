import { useCallback, useEffect, useState } from "react";
import type { PrototypeState } from "../domain/prototype";
import { getPrototypeState, startFishing, stopFishing, subscribePrototypeState } from "../ipc/client";

export function usePrototypeState() {
  const [state, setState] = useState<PrototypeState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setState(await getPrototypeState());
      setError(null);
    } catch {
      setError("暂时无法读取核心状态");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(refresh, 30_000);
    let unlisten: (() => void) | undefined;
    void subscribePrototypeState(setState).then((dispose) => { unlisten = dispose; });
    return () => { window.clearInterval(timer); unlisten?.(); };
  }, [refresh]);

  const toggleFishing = useCallback(async () => {
    try {
      const next = state?.isFishing ? await stopFishing() : await startFishing();
      setState(next);
      setError(null);
    } catch {
      setError("操作没有完成，请稍后再试");
    }
  }, [state?.isFishing]);

  return { state, error, refresh, toggleFishing };
}
