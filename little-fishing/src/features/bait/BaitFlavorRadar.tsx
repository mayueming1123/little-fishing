import type { BaitFlavorVector, BaitIngredient, BaitRecipeComponent } from "../../domain/prototype";

const axes: Array<{ key: keyof BaitFlavorVector; label: string; shortLabel: string }> = [
  { key: "intensity", label: "味道浓烈程度", shortLabel: "浓烈" },
  { key: "color", label: "色彩鲜艳程度", shortLabel: "鲜艳" },
  { key: "sweet", label: "甜味", shortLabel: "甜味" },
  { key: "sour", label: "酸味", shortLabel: "酸味" },
  { key: "salty", label: "咸味", shortLabel: "咸味" },
];

const emptyFlavor: BaitFlavorVector = { intensity: 0, color: 0, sweet: 0, sour: 0, salty: 0 };

export function calculateBaitFlavor(
  ingredients: BaitIngredient[],
  components: BaitRecipeComponent[],
): BaitFlavorVector {
  const selected = components.flatMap((component) => {
    const ingredient = ingredients.find((candidate) => candidate.id === component.ingredientId);
    return ingredient && Number.isFinite(component.percentage) && component.percentage > 0
      ? [{ ingredient, percentage: component.percentage }]
      : [];
  });
  const total = selected.reduce((sum, item) => sum + item.percentage, 0);
  if (total <= 0) return { ...emptyFlavor };

  return axes.reduce((result, axis) => {
    result[axis.key] = selected.reduce(
      (sum, item) => sum + item.ingredient.flavor[axis.key] * item.percentage / total,
      0,
    );
    return result;
  }, { ...emptyFlavor });
}

function radarPoint(index: number, value: number, radius = 74) {
  const angle = -Math.PI / 2 + index * Math.PI * 2 / axes.length;
  const distance = radius * Math.max(0, Math.min(1, value));
  return `${130 + Math.cos(angle) * distance},${112 + Math.sin(angle) * distance}`;
}

function polygonPoints(value: number) {
  return axes.map((_, index) => radarPoint(index, value)).join(" ");
}

export function BaitFlavorRadar({ flavor }: { flavor: BaitFlavorVector }) {
  const valuePoints = axes.map((axis, index) => radarPoint(index, flavor[axis.key])).join(" ");
  return <div className="bait-flavor-radar">
    <svg viewBox="0 0 260 224" role="img" aria-label="当前鱼饵五维属性图">
      <title>当前鱼饵五维属性图</title>
      <desc>按当前配方比例计算的浓烈、鲜艳、甜味、酸味和咸味雷达图，所有数值最大为一。</desc>
      {[0.25, 0.5, 0.75, 1].map((ring) => <polygon className="radar-ring" points={polygonPoints(ring)} key={ring} />)}
      {axes.map((axis, index) => <line className="radar-axis" x1="130" y1="112" x2={radarPoint(index, 1).split(",")[0]} y2={radarPoint(index, 1).split(",")[1]} key={axis.key} />)}
      <polygon className="radar-value" points={valuePoints} />
      {axes.map((axis, index) => {
        const [x, y] = radarPoint(index, 1, 96).split(",");
        return <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" key={axis.key}>{axis.shortLabel}</text>;
      })}
    </svg>
    <div className="bait-flavor-values">
      {axes.map((axis) => <div key={axis.key}><span>{axis.label}</span><strong>{flavor[axis.key].toFixed(2)}</strong></div>)}
    </div>
  </div>;
}
