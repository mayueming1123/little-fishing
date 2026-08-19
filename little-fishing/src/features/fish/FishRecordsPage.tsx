import { useEffect, useState } from "react";
import type { FishRecord } from "../../domain/prototype";
import { getFishRecords } from "../../ipc/client";
import { PixelFishIcon } from "./PixelFishIcon";

export function FishRecordsPage() {
  const [records, setRecords] = useState<FishRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void getFishRecords().then(setRecords).catch(() => setError("暂时无法读取鱼类记录"));
  }, []);

  return <section className="section-page">
    <div className="section-intro"><div><h2>鱼类记录</h2><p>价格是固定数据；没有钓到过的鱼也会显示，但偏好永远保持隐藏。</p></div><span>{records.length} 种鱼</span></div>
    {error && <div className="error-strip">{error}</div>}
    <div className="fish-record-grid">{records.map((record) => <article className="fish-record-card" key={record.fishId}>
      <div className="fish-card-head"><PixelFishIcon fishId={record.fishId} label={record.name} /><div><h3>{record.name}</h3><p>{record.pricePerKg.toFixed(2)} 元/公斤</p></div></div>
      <div className="fish-stats"><div><span>钓获</span><strong>{record.caughtCount} 条</strong></div><div><span>最长</span><strong>{record.maxLengthCm == null ? "—" : `${record.maxLengthCm.toFixed(1)} cm`}</strong></div><div><span>最重</span><strong>{record.maxWeightKg == null ? "—" : `${record.maxWeightKg.toFixed(2)} kg`}</strong></div></div>
      <p className="fish-description">{record.latestDescription ?? "还没有钓到过，记录页安静得像一片水。"}</p>
    </article>)}</div>
  </section>;
}
