import { useEffect, useState } from "react";
import { BaitRecipePage } from "../bait/BaitRecipePage";
import { FishRecordsPage } from "../fish/FishRecordsPage";
import { FishingLogPage } from "../log/FishingLogPage";
import { SettingsPage } from "../settings/SettingsPage";
import { usePrototypeState } from "../../hooks/usePrototypeState";
import { isTauriRuntime, sendPrototypeNotification } from "../../ipc/client";
import { formatClock, formatElapsed } from "../../lib/time";

type Section = "fishing" | "log" | "fish" | "bait" | "settings";
const navigation = [
  { id: "fishing" as const, label: "钓鱼", enabled: true },
  { id: "log" as const, label: "日志", enabled: true },
  { id: "fish" as const, label: "鱼类", enabled: true },
  { id: "bait" as const, label: "鱼饵", enabled: true },
  { id: "settings" as const, label: "设置", enabled: true },
];
export function MainWindow() {
  const { state, error, refresh, toggleFishing } = usePrototypeState();
  const [now, setNow] = useState(Date.now());
  const [notice, setNotice] = useState<string | null>(null);
  const [section, setSection] = useState<Section>("fishing");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const waiting = state?.phase === "waiting";
  const statusText = waiting ? "正在安静等鱼" : state?.phase === "settling" ? "正在收线" : "浮标暂时歇着";
  const occurredWaitingEvents = state?.waitingEvents
    .filter((event) => new Date(event.scheduledAt).getTime() <= now) ?? [];
  const latestWaitingEvent = occurredWaitingEvents[occurredWaitingEvents.length - 1];
  const recentText = waiting
    ? latestWaitingEvent?.description ?? "浮标轻轻立在水面，暂时没有别的动静。"
    : state?.lastResult ?? "岸边很安静，随时可以开始。";

  async function testNotification() {
    const sent = await sendPrototypeNotification();
    setNotice(sent ? "测试通知已发送" : "通知已关闭，或当前处于浏览器预览模式");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark" aria-hidden="true">│</div><div><strong>小小钓鱼</strong><small>桌面陪伴原型</small></div></div>
        <nav className="nav-list" aria-label="主要导航">
          {navigation.map((item) => <button key={item.id} className={`nav-item ${section === item.id ? "active" : ""}`} disabled={!item.enabled} onClick={() => item.enabled && setSection(item.id as Section)}>{item.label}</button>)}
        </nav>
        <div className="sidebar-foot">M2 · 桌面陪伴<br />日志、鱼获与设置已接入</div>
      </aside>

      <section className="content">
        <header className="content-header">
          <div><p className="eyebrow">FISHING COMPANION</p><h1>{section === "fishing" ? "今天也慢慢等一竿" : section === "log" ? "每一竿都留下一点动静" : section === "fish" ? "每条鱼都有自己的记录" : section === "bait" ? "随手调一份今天的鱼饵" : "把陪伴方式调得顺手一点"}</h1><p className="subtitle">{section === "fishing" ? "不催促，不保底，水下什么时候有结果没人知道。" : section === "log" ? "回头看看等待、空军，以及那些需要处理的鱼。" : section === "fish" ? "只记录实际钓获；没有收集目标，也没有完成压力。" : section === "bait" ? "自由搭配成分与比例，真正的属性留在水下。" : "通知、浮标和显示选项都只保存在这台电脑。"}</p></div>
          {!isTauriRuntime() && <span className="runtime-badge">前端预览模式</span>}
        </header>

        {section === "settings" ? <SettingsPage /> : section === "log" ? <FishingLogPage revision={state?.stateRevision ?? 0} /> : section === "fish" ? <FishRecordsPage /> : section === "bait" ? <BaitRecipePage isFishing={Boolean(state?.isFishing)} onSaved={refresh} /> : <><section className="hero-card" aria-live="polite">
          <div>
            <div className="status-kicker"><span className={`status-dot ${waiting ? "waiting" : ""}`} />{statusText}</div>
            <h2>{waiting ? `第 ${state?.roundNumber ?? 1} 竿` : "还没有抛竿"}</h2>
            <div className="countdown">{waiting ? "本竿已经钓了" : "开始以后会自动进行下一轮"}<strong>{formatElapsed(state?.roundStartedAt ?? null, now)}</strong></div>
            <div className="button-row">
              <button className={`primary-button ${waiting ? "stop" : ""}`} onClick={toggleFishing}>{waiting ? "停止钓鱼" : "开始钓鱼"}</button>
              <button className="quiet-button" onClick={testNotification}>测试通知</button>
            </div>
            {(error || notice) && <div className="error-strip" role="status">{error ?? notice}</div>}
          </div>
          <div className="water-scene" aria-label={waiting ? "浮标正在水面轻轻等待" : "水面上的浮标保持静止"}>
            <div className="scene-sun" /><div className="scene-line" /><div className={`scene-bobber ${waiting ? "waiting" : ""}`} />
          </div>
        </section>

        <section className="metric-grid">
          <article className="metric-card"><span>当前鱼饵</span><strong>{state?.selectedRecipeName ?? "空钩"}</strong></article>
          <article className="metric-card"><span>当前回合</span><strong>{state?.roundNumber ? `第 ${state.roundNumber} 竿` : "—"}</strong></article>
          <article className="metric-card"><span>过程动静</span><strong>{occurredWaitingEvents.length} 次</strong></article>
        </section>

        <section className="lower-grid">
          <article className="paper-card"><h3>最近动静</h3><div className="log-line"><time>{latestWaitingEvent ? formatClock(latestWaitingEvent.scheduledAt) : "现在"}</time><span>{recentText}</span></div></article>
          <article className="paper-card"><h3>水下判断</h3><p className="hidden-rule-note">鱼饵属性与鱼类当天偏好都会保持隐藏。配方是否合适，只能从当天一次次结果里慢慢推测。</p></article>
        </section></>}
      </section>
    </main>
  );
}
