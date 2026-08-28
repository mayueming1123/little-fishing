import type { DailyFishHint } from "../../domain/prototype";

export const dailyFishHintTemplates = [
  "今天{fish}似乎对{bait}情有独钟。",
  "水下传来一点风声：{fish}今天可能更惦记{bait}。",
  "从几次轻微试口来看，{fish}似乎正在找{bait}。",
  "岸边的老钓友猜，今天的{fish}闻到{bait}会多看一眼。",
  "今天的水情有些特别，{fish}可能偏爱带有{bait}的组合。",
  "浮标附近偶有鱼影，像是{fish}在寻觅{bait}。",
  "若想试探今天的{fish}，不妨从{bait}这条线索入手。",
  "水下的小道消息说，{fish}今天对{bait}格外好奇。",
  "一阵细碎气泡掠过，今天的{fish}或许喜欢{bait}。",
  "从水面留下的动静看，{fish}今天可能在等{bait}。",
  "今天的{fish}口味有点挑，不过{bait}似乎值得一试。",
  "鱼群绕了几圈，{fish}好像被{bait}的味道吸引了。",
  "若水下也有菜单，{fish}今天可能会点一份{bait}。",
  "今天的秘密线索指向了{fish}与{bait}。",
  "几次若有若无的试探表明，{fish}也许中意{bait}。",
  "风把一点线索吹上岸：{fish}今天似乎想尝尝{bait}。",
  "水草边的鱼影像是{fish}，它似乎在寻找{bait}。",
  "今日口味推测：{fish}可能会被{bait}留住脚步。",
  "如果想和{fish}碰碰运气，{bait}也许是不错的方向。",
  "今天尚未说破的答案里，{fish}和{bait}似乎挨得很近。",
] as const;

function joinIngredientNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "某种鱼饵";
  return names.length === 2 ? names.join("和") : `${names.slice(0, -1).join("、")}和${names[names.length - 1]}`;
}

function stableTemplateIndex(hint: DailyFishHint): number {
  const source = `${hint.localDate}:${hint.fishName}:${hint.ingredientNames.join(",")}`;
  let hash = 2_166_136_261;
  for (const character of source) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16_777_619) >>> 0;
  }
  return hash % dailyFishHintTemplates.length;
}

export function formatDailyFishHint(hint: DailyFishHint): string {
  return dailyFishHintTemplates[stableTemplateIndex(hint)]
    .replace("{fish}", hint.fishName)
    .replace("{bait}", joinIngredientNames(hint.ingredientNames));
}

export function DailyFishHintCard({ hint }: { hint: DailyFishHint | null }) {
  return <article className="paper-card underwater-hint-card">
    <div className="underwater-hint-heading"><span aria-hidden="true">◌</span><h3>水下悄悄话</h3></div>
    <p>{hint ? formatDailyFishHint(hint) : "今天的水下口味还没有露出线索，再等一会儿看看。"}</p>
  </article>;
}
