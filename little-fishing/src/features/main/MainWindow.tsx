import { useEffect, useState, type CSSProperties } from "react";
import { BaitRecipePage } from "../bait/BaitRecipePage";
import { FishBasketPage } from "../basket/FishBasketPage";
import { getBobberSkin } from "../bobber/skins";
import { FishRecordsPage } from "../fish/FishRecordsPage";
import { FishingLogPage } from "../log/FishingLogPage";
import { SettingsPage } from "../settings/SettingsPage";
import { SkinStorePage } from "../store/SkinStorePage";
import { TreasureRoomPage } from "../treasure/TreasureRoomPage";
import { defaultAppSettings, type AppSettings, type DailyFishHint, type MainSection, type PlayerSummary } from "../../domain/prototype";
import { usePrototypeState } from "../../hooks/usePrototypeState";
import {
  getAppSettings,
  getDailyFishHint,
  getPlayerSummary,
  isTauriRuntime,
  sendPrototypeNotification,
  subscribeAppSettings,
  subscribeMainNavigation,
} from "../../ipc/client";
import { formatClock, formatElapsed } from "../../lib/time";
import { DailyFishHintCard } from "./DailyFishHintCard";
import { GameSectionIcon } from "./GameSectionIcon";

const eventCategoryLabels = {
  environment: "岸边",
  water: "水面",
  tackle: "钓组",
  wildlife: "来客",
  story: "插曲",
} as const;

const navigation: Array<{ id: MainSection; label: string }> = [
  { id: "fishing", label: "钓鱼" },
  { id: "basket", label: "鱼篓" },
  { id: "treasure", label: "藏宝室" },
  { id: "log", label: "日志" },
  { id: "fish", label: "鱼类" },
  { id: "bait", label: "鱼饵" },
  { id: "store", label: "商店" },
  { id: "settings", label: "设置" },
];

const sectionCopy: Record<MainSection, { title: string; subtitle: string }> = {
  fishing: { title: "今天也慢慢等一竿", subtitle: "不催促，不保底，水下什么时候有结果没人知道。" },
  basket: { title: "钓上来的鱼先放在这里", subtitle: "鱼获不会催你处理，想吃掉或卖掉时再来看看。" },
  treasure: { title: "把偶遇的奇妙东西摆起来", subtitle: "偶遇过的奇妙东西，会安静地留在展示架上。" },
  log: { title: "每一竿都留下一点动静", subtitle: "回头看看等待、空军，以及已经发生过的每一竿。" },
  fish: { title: "每条鱼都有自己的记录", subtitle: "翻翻已经遇见和还没遇见的鱼。" },
  bait: { title: "随手调一份今天的鱼饵", subtitle: "自由搭配成分与比例，五维属性会随配方实时变化。" },
  store: { title: "给桌面浮标换个伙伴", subtitle: "金币换外观与永久 Buff，累计排泄量解锁趣味成就。" },
  settings: { title: "把陪伴方式调得顺手一点", subtitle: "通知、浮标和显示方式都可以在这里调整。" },
};

const showTestControls = import.meta.env.DEV;

export function MainWindow() {
  const { state, error, refresh, toggleFishing } = usePrototypeState();
  const [now, setNow] = useState(Date.now());
  const [notice, setNotice] = useState<string | null>(null);
  const [section, setSection] = useState<MainSection>("fishing");
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);
  const [summary, setSummary] = useState<PlayerSummary | null>(null);
  const [dailyHint, setDailyHint] = useState<DailyFishHint | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void subscribeMainNavigation(setSection).then((dispose) => { unlisten = dispose; });
    return () => unlisten?.();
  }, []);

  useEffect(() => {
    let active = true;
    let unlisten: (() => void) | undefined;
    void getAppSettings().then((next) => { if (active) setSettings(next); });
    void subscribeAppSettings(setSettings).then((dispose) => { unlisten = dispose; });
    return () => { active = false; unlisten?.(); };
  }, []);

  useEffect(() => {
    let active = true;
    let retryTimer: number | undefined;
    let attempts = 0;
    const loadHomeData = () => {
      attempts += 1;
      void Promise.all([getPlayerSummary(), getDailyFishHint()])
        .then(([nextSummary, nextHint]) => {
          if (!active) return;
          setSummary(nextSummary);
          setDailyHint(nextHint);
        })
        .catch(() => {
          if (active && attempts < 20) retryTimer = window.setTimeout(loadHomeData, 250);
        });
    };
    loadHomeData();
    return () => {
      active = false;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    };
  }, [section, state?.stateRevision]);

  const waiting = state?.phase === "waiting";
  const statusText = waiting ? "正在自动钓鱼" : state?.phase === "settling" ? "正在收线" : "浮标暂时歇着";
  const occurredWaitingEvents = state?.waitingEvents
    .filter((event) => new Date(event.scheduledAt).getTime() <= now) ?? [];
  const latestWaitingEvent = occurredWaitingEvents[occurredWaitingEvents.length - 1];
  const visibleWaitingEvents = occurredWaitingEvents.slice(-4).reverse();
  const recentText = waiting
    ? latestWaitingEvent?.description ?? state?.statusText ?? "浮标轻轻立在水面，暂时没有别的动静。"
    : state?.lastResult ?? "岸边很安静，随时可以开始。";
  const companion = getBobberSkin(settings.bobberSkin);
  const currentNavigation = navigation.find((item) => item.id === section) ?? navigation[0];

  async function testNotification() {
    const sent = await sendPrototypeNotification();
    setNotice(sent ? "测试通知已发送" : "通知已关闭，或当前处于浏览器预览模式");
  }

  const mainContent = section === "settings" ? <SettingsPage />
    : section === "store" ? <SkinStorePage />
      : section === "treasure" ? <TreasureRoomPage revision={state?.stateRevision ?? 0} />
        : section === "basket" ? <FishBasketPage revision={state?.stateRevision ?? 0} />
          : section === "log" ? <FishingLogPage revision={state?.stateRevision ?? 0} />
            : section === "fish" ? <FishRecordsPage />
              : section === "bait" ? <BaitRecipePage isFishing={Boolean(state?.isFishing)} onSaved={refresh} />
                : <>
                  <section className="hero-card companion-hero" aria-live="polite">
                    <div className="hero-copy">
                      <div className="status-kicker"><span className={`status-dot ${waiting ? "waiting" : ""}`} />{statusText}</div>
                      <h2>{waiting ? `第 ${state?.roundNumber ?? 1} 竿` : "还没有抛竿"}</h2>
                      {waiting && <p className="round-status-line">{state?.statusText}</p>}
                      <div className="countdown">{waiting ? "本竿已经钓了" : "开始以后会自动进行下一轮"}<strong>{formatElapsed(state?.roundStartedAt ?? null, now)}</strong></div>
                      <div className="button-row">
                        <button className={`primary-button ${waiting ? "stop" : ""}`} onClick={toggleFishing}>{waiting ? "停止钓鱼" : "开始钓鱼"}</button>
                        {showTestControls && <button className="quiet-button" onClick={testNotification}>测试通知</button>}
                      </div>
                      {(error || notice) && <div className="error-strip" role="status">{error ?? notice}</div>}
                    </div>
                    <div className={`companion-stage ${waiting ? "waiting" : "stopped"}`} aria-label={`当前伙伴：${companion.label}`}>
                      <div className="companion-halo" aria-hidden="true" />
                      <img
                        src={companion.image}
                        alt={`${companion.label}正在岸边钓鱼`}
                        style={{ "--companion-inset": `${companion.inset}%` } as CSSProperties}
                      />
                      <span>当前伙伴 · {companion.label}</span>
                    </div>
                  </section>

                  <section className="metric-grid home-metric-grid">
                    <article className="metric-card"><span className="metric-icon" aria-hidden="true">🌽</span><div><span>当前鱼饵</span><strong>{state?.selectedRecipeName ?? "空钩"}</strong></div></article>
                    <article className="metric-card"><span className="metric-icon" aria-hidden="true">🪙</span><div><span>现有金币</span><strong>{(summary?.money ?? 0).toLocaleString("zh-CN", { maximumFractionDigits: 0 })}</strong></div></article>
                    <article className="metric-card"><span className="metric-icon" aria-hidden="true">💩</span><div><span>累计排泄量</span><strong>{(summary?.poopKg ?? 0).toFixed(2)} kg</strong></div></article>
                  </section>

                  <section className="lower-grid">
                    <article className="paper-card"><h3>本竿事件</h3>{visibleWaitingEvents.length > 0
                      ? <ol className="live-event-feed">{visibleWaitingEvents.map((event) => <li key={event.id}><time>{formatClock(event.scheduledAt)}</time><em>{eventCategoryLabels[event.category]}</em><span>{event.description}</span></li>)}</ol>
                      : <div className="log-line"><time>现在</time><span>{recentText}</span></div>}</article>
                    <DailyFishHintCard hint={dailyHint} />
                  </section>
                </>;

  return <main className="app-shell">
    <header className="app-topbar">
      <div className="brand"><div className="brand-mark"><GameSectionIcon section="fishing" /></div><div><strong>小小钓鱼</strong><small>湖畔陪伴手账</small></div></div>
      {!isTauriRuntime() && <span className="runtime-badge">前端预览模式</span>}
    </header>

    <section className="content">
      <header className={`content-header section-${section}`}>
        <div className="content-header-emblem"><GameSectionIcon section={section} /></div>
        <div className="content-header-copy"><p className="eyebrow">湖畔手账 · {currentNavigation.label}</p><h1>{sectionCopy[section].title}</h1><p className="subtitle">{sectionCopy[section].subtitle}</p></div>
        <div className="content-header-sparkles" aria-hidden="true"><i /><i /><i /></div>
      </header>
      {mainContent}
    </section>

    <nav className="dock-nav" aria-label="主要导航">
      {navigation.map((item) => <button
        key={item.id}
        className={`nav-item ${section === item.id ? "active" : ""}`}
        aria-current={section === item.id ? "page" : undefined}
        onClick={() => setSection(item.id)}
      ><span className="dock-icon"><GameSectionIcon section={item.id} /></span><span className="dock-label">{item.label}</span></button>)}
    </nav>
  </main>;
}
