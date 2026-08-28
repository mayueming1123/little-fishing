import { useEffect, useState } from "react";
import type { FishRarity, FishRecord } from "../../domain/prototype";
import { getFishRecords } from "../../ipc/client";
import { PixelFishIcon, specialFishDescriptions } from "./PixelFishIcon";
import { FishRarityBadge } from "./FishRarityBadge";

type RecordFilter = "all" | "caught" | "uncaught";
type RarityFilter = "all" | FishRarity;

const rarityFilters: Array<{ value: RarityFilter; label: string }> = [
  { value: "all", label: "全部稀有度" },
  { value: "common", label: "普通" },
  { value: "uncommon", label: "少见" },
  { value: "rare", label: "稀有" },
  { value: "epic", label: "史诗" },
  { value: "legendary", label: "传说" },
  { value: "special", label: "特殊" },
];

export function FishRecordsPage() {
  const [records, setRecords] = useState<FishRecord[]>([]);
  const [filter, setFilter] = useState<RecordFilter>("all");
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>("all");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void getFishRecords()
      .then(setRecords)
      .catch(() => setError("暂时无法读取鱼类记录"));
  }, []);

  const caughtCount = records.filter((record) => record.caughtCount > 0).length;
  const uncaughtCount = records.length - caughtCount;
  const visibleRecords = records.filter((record) => {
    const matchesCatch = filter === "caught" ? record.caughtCount > 0
      : filter === "uncaught" ? record.caughtCount === 0
        : true;
    return matchesCatch && (rarityFilter === "all" || record.rarity === rarityFilter);
  });

  return <section className="section-page">
    <div className="section-intro"><div><h2>鱼类大全</h2><p>看看水下还有哪些熟面孔和新朋友。</p></div><span>显示 {visibleRecords.length} / {records.length} 种</span></div>
    {error && <div className="error-strip">{error}</div>}
    <div className="record-filter" role="group" aria-label="筛选鱼类记录">
      <button className={filter === "all" ? "active" : ""} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>全部 {records.length}</button>
      <button className={filter === "caught" ? "active" : ""} aria-pressed={filter === "caught"} onClick={() => setFilter("caught")}>已钓到 {caughtCount}</button>
      <button className={filter === "uncaught" ? "active" : ""} aria-pressed={filter === "uncaught"} onClick={() => setFilter("uncaught")}>未钓到 {uncaughtCount}</button>
    </div>
    <div className="record-filter rarity-filter" role="group" aria-label="按稀有度筛选">
      {rarityFilters.map((item) => {
        const count = item.value === "all" ? records.length : records.filter((record) => record.rarity === item.value).length;
        return <button className={rarityFilter === item.value ? "active" : ""} aria-pressed={rarityFilter === item.value} onClick={() => setRarityFilter(item.value)} key={item.value}>{item.label} {count}</button>;
      })}
    </div>
    {visibleRecords.length === 0
      ? <div className="paper-card empty-log">这个筛选条件下暂时没有鱼。换个标签，再看看水下还有谁。</div>
      : <div className="fish-record-grid">{visibleRecords.map((record) => <article className={`fish-record-card ${record.caughtCount === 0 ? "uncaught" : ""}`} key={record.fishId}>
      <div className="fish-card-head"><PixelFishIcon fishId={record.fishId} label={record.name} /><div><div className="fish-title-line"><h3>{record.name}</h3><FishRarityBadge rarity={record.rarity} /></div><p>{record.pricePerKg.toFixed(2)} 元/公斤</p></div></div>
      <div className="fish-stats"><div><span>钓获</span><strong>{record.caughtCount} 条</strong></div><div><span>最长</span><strong>{record.maxLengthCm == null ? "—" : `${record.maxLengthCm.toFixed(1)} cm`}</strong></div><div><span>最重</span><strong>{record.maxWeightKg == null ? "—" : `${record.maxWeightKg.toFixed(2)} kg`}</strong></div></div>
      <p className="fish-description">{record.latestDescription ?? specialFishDescriptions[record.fishId] ?? "还没有钓到过，记录页安静得像一片水。"}</p>
    </article>)}</div>}

  </section>;
}
