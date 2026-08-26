import { useEffect, useState } from "react";
import type { FishingLogEntry, PlayerSummary } from "../../domain/prototype";
import { getPendingCatches, getPlayerSummary, handleCatch } from "../../ipc/client";
import { PixelFishIcon } from "../fish/PixelFishIcon";
import { FishRarityBadge } from "../fish/FishRarityBadge";

function formatDateTime(value: string | null) {
  if (!value) return "时间未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

export function FishBasketPage({ revision }: { revision: number }) {
  const [entries, setEntries] = useState<FishingLogEntry[]>([]);
  const [summary, setSummary] = useState<PlayerSummary | null>(null);
  const [busyRound, setBusyRound] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const [nextEntries, nextSummary] = await Promise.all([getPendingCatches(), getPlayerSummary()]);
    setEntries(nextEntries);
    setSummary(nextSummary);
  }

  useEffect(() => {
    void load().catch(() => setMessage("暂时无法读取鱼篓"));
  }, [revision]);

  async function dispose(entry: FishingLogEntry, action: "eat" | "sell") {
    setBusyRound(entry.roundNumber);
    setMessage(null);
    try {
      await handleCatch(entry.roundNumber, action);
      await load();
      setMessage(action === "eat" ? "这条鱼已经吃掉，新增产屎量已记录。" : "这条鱼已经卖掉，鱼价已存入钱包。");
    } catch (error) {
      setMessage(typeof error === "string" ? error : "鱼获处理没有完成");
    } finally {
      setBusyRound(null);
    }
  }

  return <section className="section-page">
    <div className="section-intro"><div><h2>鱼篓</h2><p>只收着已经钓上来、还没决定吃掉或卖掉的鱼。处理后会自动从鱼篓移走，完整经过仍保留在日志里。</p></div><span>{entries.length} 条待处理</span></div>

    <div className="basket-summary">
      <span>累计产屎量 <strong>{(summary?.poopKg ?? 0).toFixed(2)} kg</strong></span>
      <span>现有金币 <strong>{(summary?.money ?? 0).toFixed(2)}</strong></span>
    </div>

    {message && <div className="error-strip" role="status">{message}</div>}
    {entries.length === 0
      ? <div className="paper-card basket-empty"><strong>鱼篓现在是空的</strong><span>下一条鱼钓上来后，会先在这里等你处理。</span></div>
      : <div className="basket-grid">{entries.map((entry) => <article className="basket-card" key={entry.roundNumber}>
        <header><PixelFishIcon fishId={entry.fishId ?? 1} label={entry.fishName ?? "鱼"} /><div><div className="fish-title-line"><h3>{entry.fishName ?? "未命名的鱼"}</h3>{entry.fishRarity && <FishRarityBadge rarity={entry.fishRarity} />}</div><p>第 {entry.roundNumber} 竿 · {formatDateTime(entry.settledAt)}</p></div></header>
        <p className="basket-description">{entry.description}</p>
        <div className="basket-meta"><span>{entry.lengthCm?.toFixed(1) ?? "—"} cm</span><span>{entry.weightKg?.toFixed(2) ?? "—"} kg</span><span>价值 {entry.value?.toFixed(2) ?? "—"} 金币</span></div>
        <small className="basket-bait">使用鱼饵：{entry.baitName}</small>
        <footer><button disabled={busyRound === entry.roundNumber} onClick={() => void dispose(entry, "eat")}>吃掉</button><button disabled={busyRound === entry.roundNumber} onClick={() => void dispose(entry, "sell")}>卖掉</button></footer>
      </article>)}</div>}
    <p className="log-rule-note">吃掉后会增加相当于鱼重 35%～80% 的产屎量；卖出会按这条鱼结算时已经固定的价值增加金币。每条鱼只能处理一次。</p>
  </section>;
}
