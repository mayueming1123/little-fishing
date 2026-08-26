import { useEffect, useMemo, useState } from "react";
import type { BaitEditorData, BaitRecipeComponent } from "../../domain/prototype";
import { getBaitEditorData, saveBaitRecipe } from "../../ipc/client";
import { BaitFlavorRadar, calculateBaitFlavor } from "./BaitFlavorRadar";

export function BaitRecipePage({ isFishing, onSaved }: { isFishing: boolean; onSaved: () => Promise<void> }) {
  const [data, setData] = useState<BaitEditorData | null>(null);
  const [name, setName] = useState("我的配方");
  const [percentages, setPercentages] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const next = await getBaitEditorData();
    setData(next);
    setName(next.recipeName === "综合试钓饵" ? "我的配方" : next.recipeName);
    setPercentages(Object.fromEntries(next.components.map((item) => [item.ingredientId, String(item.percentage)])));
  }
  useEffect(() => { void load().catch(() => setMessage("暂时无法读取鱼饵数据")); }, [isFishing]);

  const entries = useMemo(() => Object.entries(percentages)
    .map(([id, value]) => ({ ingredientId: Number(id), percentage: Number(value) }))
    .filter((item) => Number.isFinite(item.percentage) && item.percentage > 0), [percentages]);
  const total = entries.reduce((sum, item) => sum + item.percentage, 0);
  const currentFlavor = useMemo(
    () => calculateBaitFlavor(data?.ingredients ?? [], entries),
    [data, entries],
  );

  async function save() {
    try {
      await saveBaitRecipe(name, entries as BaitRecipeComponent[]);
      await onSaved();
      await load();
      setMessage("配方已保存，将从下一次抛竿开始使用。");
    } catch (error) {
      setMessage(typeof error === "string" ? error : "配方保存失败");
    }
  }

  if (!data) return <section className="section-page"><div className="paper-card">正在准备鱼饵盒……</div></section>;
  return <section className="section-page">
    <div className="section-intro"><div><h2>鱼饵配方</h2><p>比例不必凑成 100，系统会按总量自动归一化；未填写或为 0 的成分不会加入。</p></div><span>{isFishing ? "钓鱼中，暂不可修改" : "停止状态，可修改"}</span></div>
    <div className="bait-layout"><article className="paper-card"><label className="field-label">配方名称<input value={name} maxLength={24} disabled={isFishing} onChange={(event) => setName(event.target.value)} /></label><div className="ingredient-list">{data.ingredients.map((ingredient) => {
      const raw = percentages[ingredient.id] ?? "";
      const effective = total > 0 && Number(raw) > 0 ? Number(raw) / total * 100 : 0;
      return <div className="ingredient-row" key={ingredient.id}><div><strong>{ingredient.name}</strong><small>属性会按配比汇总到右侧维度图</small></div><label><input type="number" min="0" step="1" value={raw} disabled={isFishing} placeholder="0" onChange={(event) => setPercentages((current) => ({ ...current, [ingredient.id]: event.target.value }))} /><span>份</span></label><em>{effective.toFixed(1)}%</em></div>;
    })}</div></article><aside className="paper-card bait-preview"><h3>本次配方</h3><p>已选 {entries.length} 种成分 · 当前填写总量 {total.toFixed(1)} 份</p><BaitFlavorRadar flavor={currentFlavor} /><p className="hidden-rule-note">五维属性按当前配比归一化计算，最大值为 1。鱼类每天变化的偏好与实际匹配度仍保持隐藏。</p><button className="primary-button" disabled={isFishing || total <= 0 || !name.trim()} onClick={save}>保存并选用</button>{message && <div className="error-strip" role="status">{message}</div>}</aside></div>
  </section>;
}
