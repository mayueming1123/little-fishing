import { useEffect, useState, type CSSProperties } from "react";
import type { BobberSkinId, SkinStoreState } from "../../domain/prototype";
import { claimWeightSkin, getSkinStoreState, purchaseSkin } from "../../ipc/client";
import { getBobberSkin } from "../bobber/skins";

const REQUIRED_WEIGHT_KG = 1_000;

type StoreItem = {
  skinId: BobberSkinId;
  description: string;
  unlock: "free" | "shop" | "achievement" | "mystery";
  price?: number;
};

const skinStoreItems: StoreItem[] = [
  { skinId: "orange", description: "最初陪你来到岸边的橙子猫，所有玩家免费拥有。", unlock: "free" },
  { skinId: "gray", description: "沉稳的灰白猫，适合安安静静守着水面。", unlock: "shop", price: 5_000 },
  { skinId: "calico", description: "花色热闹的三花猫，给桌面添一点好心情。", unlock: "shop", price: 10_000 },
  { skinId: "siamese", description: "深色面罩很有辨识度，等鱼时格外专注。", unlock: "shop", price: 20_000 },
  { skinId: "silver_tabby", description: "银灰条纹像水面的细浪，安静又精神。", unlock: "shop", price: 30_000 },
  { skinId: "tuxedo", description: "穿着黑白小礼服，等鱼时也很体面。", unlock: "shop", price: 30_000 },
  { skinId: "ragdoll", description: "软乎乎的浅色长毛猫，适合慢慢守一竿。", unlock: "shop", price: 30_000 },
  { skinId: "bengal", description: "带着野性斑纹，只奖励给真正吃得下鱼的钓友。", unlock: "achievement" },
  { skinId: "samoyed", description: "像一团守在岸边的白云，偶尔会对浮标吐吐舌头。", unlock: "shop", price: 20_000 },
  { skinId: "golden_retriever", description: "暖金色的耐心钓友，看起来很擅长陪你慢慢等鱼。", unlock: "shop", price: 20_000 },
  { skinId: "treasure_pearl", description: "通过某种特殊成就获得。", unlock: "mystery" },
  { skinId: "treasure_crystal_shoe", description: "通过某种特殊成就获得。", unlock: "mystery" },
  { skinId: "treasure_seal", description: "通过某种特殊成就获得。", unlock: "mystery" },
  { skinId: "treasure_wood_sword", description: "通过某种特殊成就获得。", unlock: "mystery" },
  { skinId: "treasure_martial_manual", description: "通过某种特殊成就获得。", unlock: "mystery" },
];

function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "操作没有完成，请稍后再试";
}

export function SkinStorePage() {
  const [store, setStore] = useState<SkinStoreState | null>(null);
  const [busySkinId, setBusySkinId] = useState<BobberSkinId | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void getSkinStoreState()
      .then(setStore)
      .catch((error) => setMessage(errorMessage(error)));
  }, []);

  async function unlock(skinId: BobberSkinId, unlockType: StoreItem["unlock"]) {
    if (unlockType === "free" || unlockType === "mystery") return;
    setBusySkinId(skinId);
    setMessage(null);
    try {
      const next = unlockType === "shop"
        ? await purchaseSkin(skinId)
        : await claimWeightSkin(skinId);
      setStore(next);
      setMessage(unlockType === "shop" ? "购买成功，皮肤已经放进设置里。" : "成就达成，奖励皮肤已经领取。体重不会被扣除。");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusySkinId(null);
    }
  }

  const weightProgress = Math.min(100, Math.max(0, ((store?.bodyWeightKg ?? 0) / REQUIRED_WEIGHT_KG) * 100));
  return <section className="section-page">
    <div className="section-intro">
      <div><h2>悬浮皮肤商店</h2><p>卖鱼得到的金币可以换外观；皮肤只改变桌面浮标，不会影响钓鱼概率。</p></div>
      <span>{store ? `已拥有 ${store.ownedSkinIds.length} / 15` : "正在清点"}</span>
    </div>

    <div className="store-balance" aria-label="商店账户">
      <article><span>现有金币</span><strong>{(store?.money ?? 0).toLocaleString("zh-CN", { maximumFractionDigits: 0 })}</strong><small>出售鱼获可以增加金币</small></article>
      <article><span>当前体重</span><strong>{(store?.bodyWeightKg ?? 0).toFixed(1)} kg</strong><small>吃掉鱼获可以增加体重</small></article>
    </div>

    {message && <div className="error-strip store-message" role="status">{message}</div>}
    <div className="store-grid">
      {skinStoreItems.map((item) => {
        const skin = getBobberSkin(item.skinId);
        const owned = store?.ownedSkinIds.includes(item.skinId) ?? false;
        const mysteryLocked = item.unlock === "mystery" && !owned;
        const price = item.price ?? 0;
        const eligible = item.unlock === "free" ? true : item.unlock === "shop"
          ? (store?.money ?? 0) >= price
          : item.unlock === "achievement" ? (store?.bodyWeightKg ?? 0) >= REQUIRED_WEIGHT_KG : false;
        const waiting = busySkinId === item.skinId;
        const buttonText = owned ? "已经拥有"
          : waiting ? "正在处理…"
            : item.unlock === "free" ? "免费默认拥有"
            : item.unlock === "shop" ? eligible
              ? `购买 · ${price.toLocaleString("zh-CN")} 金币`
              : `还差 ${(price - (store?.money ?? 0)).toLocaleString("zh-CN", { maximumFractionDigits: 0 })} 金币`
              : item.unlock === "achievement" ? eligible ? "领取成就奖励" : `还差 ${(REQUIRED_WEIGHT_KG - (store?.bodyWeightKg ?? 0)).toFixed(1)} kg`
              : "通过某种特殊成就获得";
        return <article className={`store-card ${owned ? "owned" : ""} ${mysteryLocked ? "mystery-locked" : ""}`} key={item.skinId}>
          <div className="store-skin-stage">
            <img
              src={skin.image}
              alt={mysteryLocked ? "未解锁成就皮肤剪影" : `${skin.label}钓鱼皮肤`}
              draggable={false}
              style={{ "--skin-preview-inset": `${skin.inset}%` } as CSSProperties}
            />
            {owned && <span className="owned-mark">已拥有</span>}
          </div>
          <div className="store-card-copy">
            <header><div><h3>{mysteryLocked ? "？？？" : skin.label}</h3><p>{item.description}</p></div><em>{item.unlock === "free" ? "免费皮肤" : item.unlock === "shop" ? "商店皮肤" : item.unlock === "achievement" ? "体重成就" : "特殊成就"}</em></header>
            {item.unlock === "achievement" && <div className="store-progress-block">
              <div><span>体重进度</span><strong>{Math.min(store?.bodyWeightKg ?? 0, REQUIRED_WEIGHT_KG).toFixed(1)} / {REQUIRED_WEIGHT_KG} kg</strong></div>
              <i><b style={{ width: `${weightProgress}%` }} /></i>
              <small>达到 1000 kg 后可兑换，领取不会消耗体重。</small>
            </div>}
            {item.unlock === "free" && <p className="store-price"><strong>免费</strong></p>}
            {item.unlock === "shop" && <p className="store-price"><strong>{price.toLocaleString("zh-CN")}</strong> 金币</p>}
            {item.unlock === "mystery" && <p className="store-price mystery"><strong>隐藏奖励</strong></p>}
            <button
              type="button"
              className="primary-button"
              disabled={!store || owned || item.unlock === "free" || !eligible || busySkinId !== null}
              onClick={() => void unlock(item.skinId, item.unlock)}
            >{buttonText}</button>
          </div>
        </article>;
      })}
    </div>
  </section>;
}
