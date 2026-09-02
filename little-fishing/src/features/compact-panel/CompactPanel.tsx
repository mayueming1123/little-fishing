import { useEffect, useState } from "react";
import { defaultAppSettings, type AppSettings } from "../../domain/prototype";
import { usePrototypeState } from "../../hooks/usePrototypeState";
import { getAppSettings, showMainWindow, subscribeAppSettings, toggleCompactPanel } from "../../ipc/client";
import { formatElapsed } from "../../lib/time";
import { getBobberSkinDisplayName } from "../bobber/skins";

export function CompactPanel() {
  const { state, error, toggleFishing } = usePrototypeState();
  const [now, setNow] = useState(Date.now());
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    let active = true;
    let unlisten: (() => void) | undefined;
    void getAppSettings().then((value) => { if (active) setSettings(value); });
    void subscribeAppSettings(setSettings).then((dispose) => { unlisten = dispose; });
    return () => { active = false; unlisten?.(); };
  }, []);
  const waiting = state?.phase === "waiting";
  const occurredWaitingEvents = state?.waitingEvents
    .filter((event) => new Date(event.scheduledAt).getTime() <= now) ?? [];
  const latestWaitingEvent = occurredWaitingEvents[occurredWaitingEvents.length - 1];

  return <main className="compact-panel"><section className="panel-paper">
    <header className="panel-head"><strong>{getBobberSkinDisplayName(settings.bobberSkin, settings.skinNames)}</strong><span>{waiting ? "钓鱼中" : "已停止"}</span></header>
    <div className="panel-time">{formatElapsed(state?.roundStartedAt ?? null, now)}</div>
    <div className="panel-caption">{waiting ? `第 ${state?.roundNumber ?? 1} 竿 · 已发生 ${occurredWaitingEvents.length} 次过程动静` : "点击开始后自动钓鱼"}</div>
    <div className="panel-detail"><div className="detail-row"><span>当前鱼饵</span><strong>{state?.selectedRecipeName ?? "空钩"}</strong></div><div className="detail-row"><span>当前回合</span><strong>{state?.roundNumber ? `第 ${state.roundNumber} 竿` : "—"}</strong></div><div className="detail-row"><span>当前状态</span><strong>{waiting ? state?.statusText : state?.lastResult ?? "暂无"}</strong></div><div className="detail-row"><span>最近动静</span><strong>{latestWaitingEvent?.description ?? "还没有发生随机事件"}</strong></div></div>
    <div className="panel-actions"><button className="panel-action primary" onClick={toggleFishing}>{waiting ? "停止钓鱼" : "开始钓鱼"}</button><button className="panel-action" onClick={showMainWindow}>完整窗口</button><button className="panel-action" onClick={toggleCompactPanel}>收起</button></div>
    {error && <div className="error-strip">{error}</div>}
  </section></main>;
}
