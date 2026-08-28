import { useEffect, useMemo, useState } from "react";
import type { TreasureRecord } from "../../domain/prototype";
import { getTreasureRecords } from "../../ipc/client";
import { TreasureIcon } from "../fish/TreasureIcon";

const ITEMS_PER_SHELF = 3;

export function TreasureRoomPage({ revision }: { revision: number }) {
  const [treasures, setTreasures] = useState<TreasureRecord[]>([]);
  const [selectedTreasure, setSelectedTreasure] = useState<TreasureRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getTreasureRecords()
      .then((next) => {
        setTreasures(next);
        setSelectedTreasure(null);
        setError(null);
      })
      .catch(() => setError("暂时无法打开藏宝室"));
  }, [revision]);

  useEffect(() => {
    if (!selectedTreasure) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedTreasure(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedTreasure]);

  const shelves = useMemo(() => {
    const rows: TreasureRecord[][] = [];
    for (let index = 0; index < treasures.length; index += ITEMS_PER_SHELF) {
      rows.push(treasures.slice(index, index + ITEMS_PER_SHELF));
    }
    return rows;
  }, [treasures]);
  const discoveredCount = treasures.filter((treasure) => treasure.discovered).length;

  return <section className="section-page treasure-room-page">
    <div className="section-intro">
      <div><h2>藏宝室</h2><p>货架只陈列奇遇藏品。点击任意物品，可以安静地查看它的来历。</p></div>
      <span>已发现 {discoveredCount} / {treasures.length}</span>
    </div>
    {error && <div className="error-strip" role="status">{error}</div>}
    {shelves.length === 0 && !error
      ? <div className="paper-card treasure-room-empty">展示架还空着，水下也许正藏着一些不太讲道理的东西。</div>
      : <div className="treasure-cabinet" aria-label="神秘奇遇展示架">
        <div className="treasure-cabinet-glow" aria-hidden="true" />
        {shelves.map((shelf, shelfIndex) => <section className="treasure-shelf" aria-label={`第 ${shelfIndex + 1} 层展示架`} key={shelfIndex}>
          <div className="treasure-shelf-items">
            {shelf.map((treasure) => <button
              type="button"
              className={`treasure-display ${treasure.discovered ? "discovered" : "locked"}`}
              key={treasure.treasureId}
              aria-label={treasure.discovered ? `查看${treasure.name}详情` : "查看未发现藏品详情"}
              onClick={() => setSelectedTreasure(treasure)}
            >
              <span className="treasure-display-stage">
                <TreasureIcon treasureId={treasure.treasureId} discovered={treasure.discovered} label={treasure.name} />
              </span>
            </button>)}
          </div>
          <div className="treasure-shelf-plank" aria-hidden="true" />
        </section>)}
      </div>}
    {selectedTreasure && <div className="treasure-detail-backdrop" onMouseDown={() => setSelectedTreasure(null)}>
      <article
        className={`treasure-detail-card ${selectedTreasure.discovered ? "discovered" : "locked"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="treasure-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="treasure-detail-close" type="button" aria-label="关闭藏品详情" autoFocus onClick={() => setSelectedTreasure(null)}>×</button>
        <div className="treasure-detail-visual">
          <span aria-hidden="true">MYSTERY FIND</span>
          <TreasureIcon treasureId={selectedTreasure.treasureId} discovered={selectedTreasure.discovered} label={selectedTreasure.name} />
        </div>
        <div className="treasure-detail-copy">
          <small>{selectedTreasure.discovered ? "神秘奇遇藏品" : "尚未解开的奇遇"}</small>
          <h3 id="treasure-detail-title">{selectedTreasure.name}</h3>
          <p>{selectedTreasure.description}</p>
          <div className="treasure-detail-meta">
            <div><span>收藏状态</span><strong>{selectedTreasure.discovered ? "已经发现" : "尚未发现"}</strong></div>
            <div><span>发现次数</span><strong>{selectedTreasure.discovered ? `${selectedTreasure.foundCount} 次` : "—"}</strong></div>
          </div>
        </div>
      </article>
    </div>}
  </section>;
}
