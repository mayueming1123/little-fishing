import type { FishRarity } from "../../domain/prototype";

const rarityLabels: Record<FishRarity, string> = {
  common: "普通",
  uncommon: "少见",
  rare: "稀有",
  epic: "史诗",
  legendary: "传说",
  special: "特殊",
};

export function FishRarityBadge({ rarity }: {
  rarity: FishRarity;
}) {
  const label = rarityLabels[rarity];
  return <span
    className={`rarity-badge rarity-${rarity}`}
    title={`${label}鱼`}
  >{label}</span>;
}
