import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { FishRarity } from "../../domain/prototype";
import { FishRarityBadge } from "./FishRarityBadge";

describe("FishRarityBadge", () => {
  it("uses a distinct color class without revealing similarity thresholds", () => {
    const rarities: FishRarity[] = ["common", "uncommon", "rare", "epic", "legendary", "special"];
    const badges = rarities.map((rarity) => renderToStaticMarkup(<FishRarityBadge rarity={rarity} />));

    expect(new Set(badges).size).toBe(6);
    expect(badges.join("")).not.toContain("%");
    expect(badges.join("")).not.toContain("≥");
    for (const rarity of rarities) expect(badges.join("")).toContain(`rarity-${rarity}`);
  });
});
