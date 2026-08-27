import { useEffect, useState } from "react";
import type { AdminSnapshot, FishRarity } from "../../domain/prototype";
import { getAdminSnapshot, updateAdminMoney } from "../../ipc/client";

const rarityLabels: Record<FishRarity, string> = {
  common: "普通", uncommon: "少见", rare: "稀有", epic: "史诗", legendary: "传说", special: "特殊",
};
const preferenceLabels = [
  ["intensity", "浓"], ["color", "色"], ["sweet", "甜"], ["sour", "酸"], ["salty", "咸"],
] as const;

function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "操作失败，请稍后重试";
}

function formatProbability(value: number): string {
  if (value <= 0) return "0%";
  const percentage = value * 100;
  return percentage < 0.01 ? `${percentage.toFixed(4)}%` : `${percentage.toFixed(2)}%`;
}

export function AdminPage({ onClose }: { onClose: () => void }) {
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null);
  const [money, setMoney] = useState(0);
  const [message, setMessage] = useState("正在读取本机数据……");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    try {
      const next = await getAdminSnapshot();
      setSnapshot(next);
      setMoney(next.player.money);
      setMessage("概率已按当前鱼饵和今天的鱼类属性重新计算");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function saveMoney() {
    if (!Number.isFinite(money) || money < 0) {
      setMessage("金币必须是大于或等于 0 的数字");
      return;
    }
    setBusy(true);
    try {
      const result = await updateAdminMoney(money);
      setSnapshot(result.snapshot);
      setMessage("金币已保存，修改前的数据已自动备份");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return <main className="admin-shell">
    <header className="admin-header">
      <div><p className="eyebrow">LOCAL FISH VIEW</p><div className="admin-title-line"><h1>小小钓鱼 · 简易管理模式</h1><span className="admin-local-badge">仅本机</span></div><p className="subtitle">只查看今日鱼类概率与隐藏属性，并允许修改金币。</p></div>
      <div className="admin-header-actions"><button className="quiet-button" type="button" onClick={onClose}>返回游戏</button><button className="quiet-button" type="button" onClick={() => void refresh()} disabled={busy}>刷新概率</button></div>
    </header>
    <p className="admin-message" role="status">{message}</p>
    {snapshot && <>
      <section className="admin-card admin-money-card">
        <div><p className="eyebrow">PLAYER MONEY</p><h2>金币</h2><p>这里只修改金币，保存前仍会自动备份本机数据库。</p></div>
        <label>当前金币<input aria-label="金币" type="number" min="0" step="1" value={money} onChange={(event) => setMoney(event.currentTarget.valueAsNumber)} /></label>
        <button className="primary-button" type="button" onClick={() => void saveMoney()} disabled={busy}>保存金币</button>
      </section>
      <section className="admin-card admin-fish-card">
        <div className="admin-section-heading"><div><p className="eyebrow">TODAY'S FISH ODDS</p><h2>鱼类爆率与属性</h2></div><p>日期 {snapshot.preferenceDate} · 当前鱼饵「{snapshot.baitName}」。爆率表示按当前鱼饵完成一整轮后，最终钓到该鱼的实际概率。</p></div>
        <div className="admin-table-wrap"><table className="admin-table admin-odds-table">
          <thead><tr><th>鱼种</th><th>稀有度</th><th>单轮爆率</th><th>当前匹配</th><th>最低匹配</th><th>今日五维属性</th><th>五维来源</th><th>价格</th><th>长度</th><th>重量</th><th>状态</th></tr></thead>
          <tbody>{snapshot.fish.map((fish) => <tr key={fish.id}>
            <td><span className="admin-fish-id">#{fish.id}</span><strong>{fish.name}</strong></td>
            <td><span className={`rarity-badge rarity-${fish.rarity}`}>{rarityLabels[fish.rarity]}</span></td>
            <td><strong className="admin-probability">{formatProbability(fish.catchProbability)}</strong></td>
            <td>{(fish.similarity * 100).toFixed(1)}%</td>
            <td>{fish.rarity === "special" ? "特殊判定" : `${(fish.minimumSimilarity * 100).toFixed(0)}%`}</td>
            <td><div className="admin-flavor-grid">{preferenceLabels.map(([key, label]) => <span key={key}><b>{label}</b>{fish.preference[key].toFixed(2)}</span>)}</div></td>
            <td><div className="admin-preference-sources">{fish.preferenceSources.length > 0 ? fish.preferenceSources.map((source) => <span key={source.ingredientId}>{source.ingredientName} {source.percentage.toFixed(1)}%</span>) : <span>旧数据待刷新</span>}</div></td>
            <td>{fish.pricePerKg.toFixed(2)} /kg</td><td>{fish.minLengthCm.toFixed(1)}–{fish.maxLengthCm.toFixed(1)} cm</td><td>{fish.minWeightKg.toFixed(2)}–{fish.maxWeightKg.toFixed(2)} kg</td><td>{fish.enabled ? "启用" : "停用"}</td>
          </tr>)}</tbody>
        </table></div>
      </section>
    </>}
  </main>;
}
