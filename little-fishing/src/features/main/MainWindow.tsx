import { useEffect, useState } from "react";
import { BaitRecipePage } from "../bait/BaitRecipePage";
import { FishBasketPage } from "../basket/FishBasketPage";
import { FishRecordsPage } from "../fish/FishRecordsPage";
import { FishingLogPage } from "../log/FishingLogPage";
import { SettingsPage } from "../settings/SettingsPage";
import { SkinStorePage } from "../store/SkinStorePage";
import { usePrototypeState } from "../../hooks/usePrototypeState";
import { isTauriRuntime, sendPrototypeNotification } from "../../ipc/client";
import { formatClock, formatElapsed } from "../../lib/time";

type Section = "fishing" | "basket" | "log" | "fish" | "bait" | "store" | "settings";
const eventCategoryLabels = {
  environment: "岸边",
  water: "水面",
  tackle: "钓组",
  wildlife: "来客",
  story: "插曲",
} as const;
const navigation = [
  { id: "fishing" as const, label: "钓鱼", enabled: true },
  { id: "basket" as const, label: "鱼篓", enabled: true },
  { id: "log" as const, label: "日志", enabled: true },
  { id: "fish" as const, label: "鱼类", enabled: true },
  { id: "bait" as const, label: "鱼饵", enabled: true },
  { id: "store" as const, label: "商店", enabled: true },
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
  const statusText = waiting ? "正在自动钓鱼" : state?.phase === "settling" ? "正在收线" : "浮标暂时歇着";
  const occurredWaitingEvents = state?.waitingEvents
    .filter((event) => new Date(event.scheduledAt).getTime() <= now) ?? [];
  const latestWaitingEvent = occurredWaitingEvents[occurredWaitingEvents.length - 1];
  const visibleWaitingEvents = occurredWaitingEvents.slice(-4).reverse();
  const recentText = waiting
    ? latestWaitingEvent?.description ?? state?.statusText ?? "浮标轻轻立在水面，暂时没有别的动静。"
    : state?.lastResult ?? "岸边很安静，随时可以开始。";

  async function testNotification() {
    const sent = await sendPrototypeNotification();
    setNotice(sent ? "测试通知已发送" : "通知已关闭，或当前处于浏览器预览模式");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark" aria-hidden="true">│</div><div><strong>小小钓鱼</strong><small>桌面钓鱼陪伴</small></div></div>
        <nav className="nav-list" aria-label="主要导航">
          {navigation.map((item) => <button key={item.id} className={`nav-item ${section === item.id ? "active" : ""}`} disabled={!item.enabled} onClick={() => item.enabled && setSection(item.id as Section)}>{item.label}</button>)}
        </nav>
        <div className="sidebar-foot">纯挂机 · 无成长<br />无保底 · 只看运气</div>
      </aside>

      <section className="content">
        <header className="content-header">
          <div><p className="eyebrow">FISHING COMPANION</p><h1>{section === "fishing" ? "今天也慢慢等一竿" : section === "basket" ? "钓上来的鱼先放在这里" : section === "log" ? "每一竿都留下一点动静" : section === "fish" ? "每条鱼都有自己的记录" : section === "bait" ? "随手调一份今天的鱼饵" : section === "store" ? "给桌面浮标换个伙伴" : "把陪伴方式调得顺手一点"}</h1><p className="subtitle">{section === "fishing" ? "不催促，不保底，水下什么时候有结果没人知道。" : section === "basket" ? "鱼获不会催你处理，想吃掉或卖掉时再来看看。" : section === "log" ? "回头看看等待、空军，以及已经发生过的每一竿。" : section === "fish" ? "筛选已钓到或未钓到的鱼；隐藏偏好仍然不会显示。" : section === "bait" ? "自由搭配成分与比例，真正的属性留在水下。" : section === "store" ? "金币换外观，体重解成就；都不会让下一条鱼更好钓。" : "通知、浮标和显示选项都只保存在这台电脑。"}</p></div>
          {!isTauriRuntime() && <span className="runtime-badge">前端预览模式</span>}
        </header>

        {section === "settings" ? <SettingsPage /> : section === "store" ? <SkinStorePage /> : section === "basket" ? <FishBasketPage revision={state?.stateRevision ?? 0} /> : section === "log" ? <FishingLogPage revision={state?.stateRevision ?? 0} /> : section === "fish" ? <FishRecordsPage /> : section === "bait" ? <BaitRecipePage isFishing={Boolean(state?.isFishing)} onSaved={refresh} /> : <><section className="hero-card" aria-live="polite">
          <div>
            <div className="status-kicker"><span className={`status-dot ${waiting ? "waiting" : ""}`} />{statusText}</div>
            <h2>{waiting ? `第 ${state?.roundNumber ?? 1} 竿` : "还没有抛竿"}</h2>
            {waiting && <p className="round-status-line">{state?.statusText}</p>}
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
          <article className="paper-card"><h3>本竿事件</h3>{visibleWaitingEvents.length > 0
            ? <ol className="live-event-feed">{visibleWaitingEvents.map((event) => <li key={event.id}><time>{formatClock(event.scheduledAt)}</time><em>{eventCategoryLabels[event.category]}</em><span>{event.description}</span></li>)}</ol>
            : <div className="log-line"><time>现在</time><span>{recentText}</span></div>}</article>
          <article className="paper-card"><h3>水下判断</h3><p className="hidden-rule-note">鱼饵属性与鱼类当天偏好都会保持隐藏。配方是否合适，只能从当天一次次结果里慢慢推测。</p></article>
        </section></>}
      </section>
    </main>
  );
}
