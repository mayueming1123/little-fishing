import { useEffect, useMemo, useState } from "react";
import pondScene from "../../assets/pond-six-slots.png";
import { defaultAppSettings, type AppSettings, type BobberSkinId, type PondState } from "../../domain/prototype";
import { assignPondSkin, getAppSettings, getPondState, getSkinStoreState, purchasePondSlot, subscribeAppSettings, subscribePondState } from "../../ipc/client";
import { bobberSkins, getBobberSkinDisplayName } from "../bobber/skins";
import { getPondAvatar } from "./avatars";

function errorText(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "池塘操作没有完成";
}

export function formatPondElapsed(startTime: string | null, now: number): string {
  if (!startTime) return "等待开竿";
  const startedAt = new Date(startTime).getTime();
  if (!Number.isFinite(startedAt)) return "等待开竿";
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1_000));
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const rest = seconds % 60;
  const duration = hours > 0
    ? `${hours}:${minutes.toString().padStart(2, "0")}:${rest.toString().padStart(2, "0")}`
    : `${minutes}:${rest.toString().padStart(2, "0")}`;
  return `已钓 ${duration}`;
}

export function PondPage() {
  const [pond, setPond] = useState<PondState | null>(null);
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);
  const [owned, setOwned] = useState<BobberSkinId[]>(["orange"]);
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [busySlot, setBusySlot] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    let active = true;
    let unlistenPond: (() => void) | undefined;
    let unlistenSettings: (() => void) | undefined;
    void Promise.all([getPondState(), getAppSettings(), getSkinStoreState()])
      .then(([nextPond, nextSettings, store]) => {
        if (!active) return;
        setPond(nextPond);
        setSettings(nextSettings);
        setOwned(store.ownedSkinIds);
      })
      .catch((error) => setMessage(errorText(error)));
    void subscribePondState(setPond).then((dispose) => { unlistenPond = dispose; });
    void subscribeAppSettings(setSettings).then((dispose) => { unlistenSettings = dispose; });
    return () => {
      active = false;
      window.clearInterval(timer);
      unlistenPond?.();
      unlistenSettings?.();
    };
  }, []);

  const occupiedIds = useMemo(() => new Set(pond?.slots.flatMap((slot) => slot.skinId ? [slot.skinId] : []) ?? []), [pond]);
  const availableCharacters = bobberSkins.filter((skin) => owned.includes(skin.value)
    && (!occupiedIds.has(skin.value) || pond?.slots.find((slot) => slot.slotIndex === pickerSlot)?.skinId === skin.value));

  async function buy(slotIndex: number) {
    setBusySlot(slotIndex);
    setMessage(null);
    try {
      setPond(await purchasePondSlot(slotIndex));
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusySlot(null);
    }
  }

  async function assign(slotIndex: number, skinId: BobberSkinId | null) {
    setBusySlot(slotIndex);
    setMessage(null);
    try {
      setPond(await assignPondSkin(slotIndex, skinId));
      setPickerSlot(null);
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusySlot(null);
    }
  }

  if (!pond) return <section className="section-page"><div className="empty-state">正在整理池塘席位…</div></section>;
  const occupiedCount = pond.slots.filter((slot) => slot.skinId).length;

  return <section className="section-page pond-page">
    <div className="section-intro pond-intro">
      <div><h2>伙伴池塘</h2><p>所有伙伴共用当前鱼饵，各自独立等待和结算。</p></div>
      <div className="pond-summary"><span>🪙 {pond.money.toLocaleString("zh-CN", { maximumFractionDigits: 0 })}</span><strong>{occupiedCount} 条钓线同时工作</strong></div>
    </div>
    {message && <div className="error-strip" role="status">{message}</div>}
    <div className="pond-layout">
      <div className="pond-board">
        <img className="pond-scene" src={pondScene} alt="六个钓鱼席位环绕的池塘" draggable={false} />
        {pond.slots.map((slot) => {
          return <article className={`pond-seat pond-seat-${slot.slotIndex} ${slot.unlocked ? "unlocked" : "locked"}`} key={slot.slotIndex}>
            {!slot.unlocked ? <button type="button" disabled={busySlot !== null} onClick={() => void buy(slot.slotIndex)}>
              <span className="pond-lock">🔒</span><strong>第 {slot.slotIndex} 席</strong><small>{busySlot === slot.slotIndex ? "解锁中…" : `${slot.unlockPrice?.toLocaleString("zh-CN")} 金币`}</small>
            </button> : slot.fixedDesktopSlot ? <div className="pond-character fixed">
              {slot.skinId && <img src={getPondAvatar(slot.skinId)} alt="" draggable={false} />}
              <strong>{getBobberSkinDisplayName(settings.bobberSkin, settings.skinNames)}</strong>
              <small>桌宠固定席 · {slot.phase === "waiting" ? formatPondElapsed(slot.roundStartedAt, now) : "等待开竿"}</small>
              {slot.lastResult && <span className="pond-seat-result" title={slot.lastResult}>{slot.lastResult}</span>}
            </div> : slot.skinId ? <button type="button" className="pond-character" onClick={() => setPickerSlot(slot.slotIndex)}>
              <img src={getPondAvatar(slot.skinId)} alt="" draggable={false} />
              <strong>{getBobberSkinDisplayName(slot.skinId, settings.skinNames)}</strong>
              <small>{slot.phase === "waiting" ? formatPondElapsed(slot.roundStartedAt, now) : slot.phase === "settling" ? "正在收线" : "等待开竿"}</small>
              <span className="pond-seat-result" title={slot.lastResult ?? "还没有完成第一竿"}>{slot.lastResult ?? "还没有完成第一竿"}</span>
            </button> : <button type="button" className="pond-empty-seat" onClick={() => setPickerSlot(slot.slotIndex)}><b>＋</b><span>安排伙伴</span></button>}
          </article>;
        })}
      </div>
      <aside className="pond-side-panel paper-card">
        <h3>最近收获</h3>
        <p>这里只记录钓到东西的结果，空军不会占位置。</p>
        {pond.activities.length > 0 ? <ol className="pond-activity-list">{pond.activities.map((activity, index) => <li key={`${activity.settledAt}-${index}`}>
          <img src={getPondAvatar(activity.skinId)} alt="" /><div><strong>{getBobberSkinDisplayName(activity.skinId, settings.skinNames)}</strong><span>{activity.summary}</span></div>
        </li>)}</ol> : <div className="pond-no-activity">还没有伙伴带回收获。</div>}
      </aside>
    </div>
    {pickerSlot !== null && <div className="pond-picker-backdrop" role="presentation" onMouseDown={() => setPickerSlot(null)}>
      <section className="pond-picker paper-card" role="dialog" aria-modal="true" aria-label={`为第 ${pickerSlot} 席选择伙伴`} onMouseDown={(event) => event.stopPropagation()}>
        <header><div><h3>第 {pickerSlot} 席</h3><p>只能安排已经解锁、且没有坐在其他席位的角色。</p></div><button onClick={() => setPickerSlot(null)} aria-label="关闭">×</button></header>
        <div className="pond-character-grid">{availableCharacters.map((skin) => <button key={skin.value} disabled={busySlot !== null} onClick={() => void assign(pickerSlot, skin.value)}><img src={getPondAvatar(skin.value)} alt="" /><span>{getBobberSkinDisplayName(skin.value, settings.skinNames)}</span></button>)}</div>
        {pond.slots.find((slot) => slot.slotIndex === pickerSlot)?.skinId && <button className="quiet-button" disabled={busySlot !== null} onClick={() => void assign(pickerSlot, null)}>空出这个席位</button>}
      </section>
    </div>}
  </section>;
}
