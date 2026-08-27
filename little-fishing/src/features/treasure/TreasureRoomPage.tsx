import { useEffect, useMemo, useState } from "react";
import type { TreasureRecord } from "../../domain/prototype";
import { getTreasureRecords } from "../../ipc/client";
import { TreasureIcon } from "../fish/TreasureIcon";

const ITEMS_PER_SHELF = 3;

export function TreasureRoomPage({ revision }: { revision: number }) {
  const [treasures, setTreasures] = useState<TreasureRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getTreasureRecords()
      .then((next) => {
        setTreasures(next);
        setError(null);
      })
      .catch(() => setError("暂时无法打开藏宝室"));
  }, [revision]);

  const shelves = useMemo(() => {
    const rows: TreasureRecord[][] = [];
    for (let index = 0; index < treasures.length; index += ITEMS_PER_SHELF) {
      rows.push(treasures.slice(index, index + ITEMS_PER_SHELF));
    }
    return rows;
  }, [treasures]);
  const discoveredCount = treasures.filter((treasure) => treasure.discovered).length;

  return <section className="section-page treasure-room-page">
    <div className="section-intro"><div><h2>藏宝室</h2><p>每一次神秘奇遇都会在这里留下纪念。展示架会随着藏品增加不断向下延伸。</p></div><span>已发现 {discoveredCount} / {treasures.length}</span></div>
    {error && <div className="error-strip" role="status">{error}</div>}
    {shelves.length === 0 && !error
      ? <div className="paper-card treasure-room-empty">展示架还空着，水下也许正藏着一些不太讲道理的东西。</div>
      : <div className="treasure-cabinet" aria-label="神秘奇遇展示架">
        {shelves.map((shelf, shelfIndex) => <section className="treasure-shelf" aria-label={`第 ${shelfIndex + 1} 层展示架`} key={shelfIndex}>
          <div className="treasure-shelf-items">
            {shelf.map((treasure) => <article className={`treasure-display ${treasure.discovered ? "discovered" : "locked"}`} key={treasure.treasureId}>
              <div className="treasure-display-stage"><TreasureIcon treasureId={treasure.treasureId} discovered={treasure.discovered} label={treasure.name} /></div>
              <h3>{treasure.name}</h3>
              <p>{treasure.description}</p>
              <small>{treasure.discovered ? `发现 ${treasure.foundCount} 次` : "尚未发现"}</small>
            </article>)}
          </div>
          <div className="treasure-shelf-plank" aria-hidden="true" />
        </section>)}
      </div>}
  </section>;
}
