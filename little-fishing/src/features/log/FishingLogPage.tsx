import { useEffect, useState } from "react";
import type { FishingLogEntry, PlayerSummary } from "../../domain/prototype";
import { getFishingLog, getPlayerSummary, handleCatch } from "../../ipc/client";
import { formatPlannedDuration } from "../../lib/time";
import { PixelFishIcon } from "../fish/PixelFishIcon";
import { FishRarityBadge } from "../fish/FishRarityBadge";

function formatDateTime(value: string | null) {
  if (!value) return "时间未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

function dispositionText(entry: FishingLogEntry) {
  if (entry.disposition === "eaten") return `已吃掉 · 体重 +${(entry.gainedWeightKg ?? 0).toFixed(2)} kg`;
  if (entry.disposition === "sold") return `已卖出 · 金币 +${(entry.gainedMoney ?? 0).toFixed(2)}`;
  return "等待处理";
}

export function FishingLogPage({ revision }: { revision: number }) {
  const [entries, setEntries] = useState<FishingLogEntry[]>([]);
  const [summary, setSummary] = useState<PlayerSummary | null>(null);
  const [busyRound, setBusyRound] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const [nextEntries, nextSummary] = await Promise.all([getFishingLog(), getPlayerSummary()]);
    setEntries(nextEntries);
    setSummary(nextSummary);
  }

  useEffect(() => {
    void load().catch(() => setMessage("暂时无法读取钓鱼日志"));
  }, [revision]);

  async function dispose(entry: FishingLogEntry, action: "eat" | "sell") {
    setBusyRound(entry.roundNumber);
    setMessage(null);
    try {
      const nextSummary = await handleCatch(entry.roundNumber, action);
      setSummary(nextSummary);
      await load();
      setMessage(action === "eat" ? "这条鱼已经吃掉，体重变化已记录。" : "这条鱼已经卖掉，鱼价已存入钱包。");
    } catch (error) {
      setMessage(typeof error === "string" ? error : "鱼获处理没有完成");
    } finally {
      setBusyRound(null);
    }
  }

  return <section className="section-page">
    <div className="section-intro"><div><h2>钓鱼日志</h2><p>每一竿的等待、过程动静和最终结果都会留在这里。鱼获可以晚点处理，不会打断后台自动抛竿。</p></div><span>最近 {entries.length} 竿</span></div>

    <div className="player-summary-grid">
      <article><span>当前体重</span><strong>{(summary?.bodyWeightKg ?? 60).toFixed(2)} kg</strong><small>初始体重 60 kg</small></article>
      <article><span>现有金币</span><strong>{(summary?.money ?? 0).toFixed(2)}</strong><small>可在皮肤商店使用</small></article>
      <article className={(summary?.pendingCatches ?? 0) > 0 ? "has-pending" : ""}><span>待处理鱼获</span><strong>{summary?.pendingCatches ?? 0} 条</strong><small>吃掉或按固定鱼价卖掉</small></article>
      <article><span>处理记录</span><strong>{summary?.eatenCount ?? 0} 吃 · {summary?.soldCount ?? 0} 卖</strong><small>每条鱼只能处理一次</small></article>
    </div>

    {message && <div className="error-strip" role="status">{message}</div>}
    {entries.length === 0 ? <div className="paper-card empty-log">还没有完成过一竿。水面正在替你保留第一行空白。</div> : <div className="fishing-log-list">{entries.map((entry) => {
      const caught = entry.resultType === "caught";
      const pending = caught && entry.disposition === "pending";
      return <article className={`fishing-log-card ${pending ? "pending-catch" : ""}`} key={entry.roundNumber}>
        <header><div><strong>第 {entry.roundNumber} 竿</strong><span>{formatDateTime(entry.settledAt)} · {entry.baitName}</span></div><em className={caught ? "caught" : "missed"}>{caught ? "中鱼" : "空军"}</em></header>
        <div className="round-meta"><span>等待 {formatPlannedDuration(entry.plannedDurationSeconds)}</span><span>{entry.waitingEvents.length} 次过程动静</span></div>
        {entry.waitingEvents.length > 0 && <details className="event-timeline"><summary>展开本竿过程</summary><ol>{entry.waitingEvents.map((event) => <li key={event.id}><time>{formatDateTime(event.scheduledAt)}</time><span>{event.description}</span></li>)}</ol></details>}
        {caught ? <div className="caught-result">
          <PixelFishIcon fishId={entry.fishId ?? 1} label={entry.fishName ?? "鱼"} />
          <div className="caught-copy"><div className="fish-title-line"><h3>{entry.fishName}</h3>{entry.fishRarity && <FishRarityBadge rarity={entry.fishRarity} />}</div><p>{entry.description}</p><div><span>{entry.lengthCm?.toFixed(1)} cm</span><span>{entry.weightKg?.toFixed(2)} kg</span><span>价值 {entry.value?.toFixed(2)} 金币</span></div></div>
        </div> : <p className="miss-result">{entry.description}</p>}
        {caught && <footer className="catch-disposition"><span className={`disposition ${entry.disposition}`}>{dispositionText(entry)}</span>{pending && <div><button disabled={busyRound === entry.roundNumber} onClick={() => void dispose(entry, "eat")}>吃掉</button><button disabled={busyRound === entry.roundNumber} onClick={() => void dispose(entry, "sell")}>卖掉</button></div>}</footer>}
      </article>;
    })}</div>}
    <p className="log-rule-note">吃掉会随机增加鱼重 35%～80% 的体重，永远不会超过鱼本身重量的 80%；卖出金额采用该条鱼结算时已经固定的价值。</p>
  </section>;
}
