import { useEffect, useMemo, useState } from "react";
import type { AdminFishInput, AdminSnapshot, FishRarity } from "../../domain/prototype";
import {
  createAdminDatabaseBackup,
  getAdminSnapshot,
  updateAdminFish,
  updateAdminPlayer,
} from "../../ipc/client";

const rarityOptions: { value: FishRarity; label: string }[] = [
  { value: "common", label: "普通" },
  { value: "uncommon", label: "少见" },
  { value: "rare", label: "稀有" },
  { value: "epic", label: "史诗" },
  { value: "legendary", label: "传说" },
  { value: "special", label: "特殊" },
];

function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "操作失败，请稍后重试";
}

function formatBackupMessage(path: string): string {
  return path.startsWith("浏览器") ? path : `已自动备份到：${path}`;
}

export function AdminPage() {
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null);
  const [fishDrafts, setFishDrafts] = useState<AdminFishInput[]>([]);
  const [money, setMoney] = useState(0);
  const [bodyWeightKg, setBodyWeightKg] = useState(60);
  const [message, setMessage] = useState("正在读取本机数据库……");
  const [busy, setBusy] = useState(false);
  const [busyFishId, setBusyFishId] = useState<number | null>(null);

  async function refresh() {
    setBusy(true);
    try {
      const next = await getAdminSnapshot();
      setSnapshot(next);
      setFishDrafts(next.fish);
      setMoney(next.player.money);
      setBodyWeightKg(next.player.bodyWeightKg);
      setMessage("已读取本机数据");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const eventTextCount = useMemo(
    () => snapshot ? snapshot.stats.waitingEventCount + snapshot.stats.outcomeDescriptionCount : 0,
    [snapshot],
  );

  async function savePlayer() {
    setBusy(true);
    try {
      const result = await updateAdminPlayer(bodyWeightKg, money);
      setSnapshot(result.snapshot);
      setMessage(`玩家数据已保存。${formatBackupMessage(result.backupPath)}`);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function backup() {
    setBusy(true);
    try {
      const path = await createAdminDatabaseBackup();
      setMessage(`备份完成。${formatBackupMessage(path)}`);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function changeFish(id: number, patch: Partial<AdminFishInput>) {
    setFishDrafts((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  async function saveFish(fish: AdminFishInput) {
    setBusyFishId(fish.id);
    try {
      const result = await updateAdminFish(fish);
      setSnapshot(result.snapshot);
      setFishDrafts(result.snapshot.fish);
      setMessage(`${fish.name}的参数已保存。${formatBackupMessage(result.backupPath)}`);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusyFishId(null);
    }
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">LOCAL CONTROL ROOM</p>
          <div className="admin-title-line">
            <h1>小小钓鱼 · 管理后台</h1>
            <span className="admin-local-badge">仅本机</span>
          </div>
          <p className="subtitle">不启动网络服务，不开放局域网端口；所有操作直接作用于这台电脑上的游戏数据库。</p>
        </div>
        <div className="admin-header-actions">
          <button className="quiet-button" type="button" onClick={() => void refresh()} disabled={busy}>刷新</button>
          <button className="primary-button" type="button" onClick={() => void backup()} disabled={busy}>立即备份数据库</button>
        </div>
      </header>

      <p className="admin-message" role="status">{message}</p>

      {snapshot && (
        <>
          <section className="admin-stat-grid" aria-label="内容统计">
            <article><strong>{snapshot.stats.enabledFishCount}/{snapshot.stats.fishCount}</strong><span>启用鱼种</span></article>
            <article><strong>{snapshot.stats.baitIngredientCount}</strong><span>饵料原料</span></article>
            <article><strong>{eventTextCount}</strong><span>事件与结果描述</span></article>
            <article><strong>{snapshot.stats.fishingRoundCount}</strong><span>已结算轮次</span></article>
            <article><strong>{snapshot.stats.unlockedSkinCount}</strong><span>已拥有皮肤</span></article>
          </section>

          <section className="admin-card admin-player-card">
            <div>
              <p className="eyebrow">PLAYER DATA</p>
              <h2>玩家数据</h2>
              <p>鱼篓待处理 {snapshot.player.pendingCatches} 条 · 吃掉 {snapshot.player.eatenCount} 条 · 卖出 {snapshot.player.soldCount} 条</p>
            </div>
            <label>当前体重（kg）<input type="number" min="0" step="0.01" value={bodyWeightKg} onChange={(event) => setBodyWeightKg(event.currentTarget.valueAsNumber)} /></label>
            <label>金币<input type="number" min="0" step="1" value={money} onChange={(event) => setMoney(event.currentTarget.valueAsNumber)} /></label>
            <button className="primary-button" type="button" onClick={() => void savePlayer()} disabled={busy}>保存玩家数据</button>
          </section>

          <section className="admin-card admin-fish-card">
            <div className="admin-section-heading">
              <div><p className="eyebrow">FISH CATALOG</p><h2>鱼类参数</h2></div>
              <p>最低饵料相似度随稀有度自动计算，不在后台或玩家界面公开。</p>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>鱼种</th><th>稀有度</th><th>元/kg</th><th>长度最小</th><th>长度最大</th><th>重量最小</th><th>重量最大</th><th>启用</th><th>操作</th></tr></thead>
                <tbody>
                  {fishDrafts.map((fish) => (
                    <tr key={fish.id}>
                      <td><span className="admin-fish-id">#{fish.id}</span><strong>{fish.name}</strong></td>
                      <td><select value={fish.rarity} onChange={(event) => changeFish(fish.id, { rarity: event.currentTarget.value as FishRarity })}>{rarityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></td>
                      <td><input aria-label={`${fish.name}价格`} type="number" min="0" step="0.01" value={fish.pricePerKg} onChange={(event) => changeFish(fish.id, { pricePerKg: event.currentTarget.valueAsNumber })} /></td>
                      <td><input aria-label={`${fish.name}最小长度`} type="number" min="0" step="0.01" value={fish.minLengthCm} onChange={(event) => changeFish(fish.id, { minLengthCm: event.currentTarget.valueAsNumber })} /></td>
                      <td><input aria-label={`${fish.name}最大长度`} type="number" min="0" step="0.01" value={fish.maxLengthCm} onChange={(event) => changeFish(fish.id, { maxLengthCm: event.currentTarget.valueAsNumber })} /></td>
                      <td><input aria-label={`${fish.name}最小重量`} type="number" min="0" step="0.01" value={fish.minWeightKg} onChange={(event) => changeFish(fish.id, { minWeightKg: event.currentTarget.valueAsNumber })} /></td>
                      <td><input aria-label={`${fish.name}最大重量`} type="number" min="0" step="0.01" value={fish.maxWeightKg} onChange={(event) => changeFish(fish.id, { maxWeightKg: event.currentTarget.valueAsNumber })} /></td>
                      <td><input aria-label={`${fish.name}启用`} type="checkbox" checked={fish.enabled} onChange={(event) => changeFish(fish.id, { enabled: event.currentTarget.checked })} /></td>
                      <td><button className="admin-save-row" type="button" disabled={busyFishId === fish.id} onClick={() => void saveFish(fish)}>{busyFishId === fish.id ? "保存中" : "保存"}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
