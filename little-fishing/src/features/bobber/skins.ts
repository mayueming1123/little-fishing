import orangeCatFishing from "../../assets/orange-cat-fishing.png";
import grayCatFishing from "../../assets/cat-skin-gray.png";
import calicoCatFishing from "../../assets/cat-skin-calico.png";
import siameseCatFishing from "../../assets/cat-skin-siamese.png";
import silverTabbyCatFishing from "../../assets/cat-skin-silver-tabby.png";
import tuxedoCatFishing from "../../assets/cat-skin-tuxedo.png";
import ragdollCatFishing from "../../assets/cat-skin-ragdoll.png";
import bengalCatFishing from "../../assets/cat-skin-bengal.png";
import treasurePearlCatFishing from "../../assets/cat-skin-treasure-pearl.png";
import treasureCrystalShoeCatFishing from "../../assets/cat-skin-treasure-crystal-shoe.png";
import treasureSealCatFishing from "../../assets/cat-skin-treasure-seal.png";
import treasureWoodSwordCatFishing from "../../assets/cat-skin-treasure-wood-sword.png";
import treasureMartialManualCatFishing from "../../assets/cat-skin-treasure-martial-manual.png";
import samoyedFishing from "../../assets/dog-skin-samoyed.png";
import goldenRetrieverFishing from "../../assets/dog-skin-golden-retriever.png";
import specialWaterMonsterFishing from "../../assets/skin-special-water-monster.png";
import specialPizzaRabbitFishing from "../../assets/skin-special-pizza-rabbit.png";
import specialSpaghettiDogFishing from "../../assets/skin-special-spaghetti-dog.png";
import type { BobberSkinId } from "../../domain/prototype";

export interface BobberSkinOption {
  value: BobberSkinId;
  label: string;
  image: string;
  floatX: number;
  floatY: number;
  inset: number;
}

export const bobberSkins: BobberSkinOption[] = [
  { value: "orange", label: "橙子猫", image: orangeCatFishing, floatX: 76.6, floatY: 72.2, inset: 0 },
  { value: "gray", label: "灰白猫", image: grayCatFishing, floatX: 76.7, floatY: 72.2, inset: 0 },
  { value: "calico", label: "三花猫", image: calicoCatFishing, floatX: 75.9, floatY: 69.1, inset: 0 },
  { value: "siamese", label: "暹罗猫", image: siameseCatFishing, floatX: 74.5, floatY: 69.7, inset: 0 },
  { value: "silver_tabby", label: "银虎斑", image: silverTabbyCatFishing, floatX: 86.1, floatY: 80.2, inset: 12.5 },
  { value: "tuxedo", label: "奶牛猫", image: tuxedoCatFishing, floatX: 86.0, floatY: 80.8, inset: 12.5 },
  { value: "ragdoll", label: "布偶猫", image: ragdollCatFishing, floatX: 84.8, floatY: 80.0, inset: 12.5 },
  { value: "bengal", label: "孟加拉猫", image: bengalCatFishing, floatX: 85.8, floatY: 80.0, inset: 12.5 },
  { value: "samoyed", label: "萨摩耶", image: samoyedFishing, floatX: 86.5, floatY: 81.0, inset: 12.5 },
  { value: "golden_retriever", label: "金毛犬", image: goldenRetrieverFishing, floatX: 86.2, floatY: 80.9, inset: 12.5 },
  { value: "treasure_pearl", label: "黑珍珠奇遇猫", image: treasurePearlCatFishing, floatX: 85.7, floatY: 80.4, inset: 12.5 },
  { value: "treasure_crystal_shoe", label: "水晶鞋奇遇猫", image: treasureCrystalShoeCatFishing, floatX: 85.4, floatY: 80.9, inset: 12.5 },
  { value: "treasure_seal", label: "公章奇遇猫", image: treasureSealCatFishing, floatX: 84.0, floatY: 81.3, inset: 12.5 },
  { value: "treasure_wood_sword", label: "木剑奇遇猫", image: treasureWoodSwordCatFishing, floatX: 84.5, floatY: 80.7, inset: 12.5 },
  { value: "treasure_martial_manual", label: "武功秘籍奇遇猫", image: treasureMartialManualCatFishing, floatX: 86.5, floatY: 80.8, inset: 12.5 },
  { value: "special_water_monster", label: "小水怪伙伴", image: specialWaterMonsterFishing, floatX: 84.0, floatY: 82.1, inset: 12.5 },
  { value: "special_pizza_rabbit", label: "披萨小兔", image: specialPizzaRabbitFishing, floatX: 85.0, floatY: 82.5, inset: 12.5 },
  { value: "special_spaghetti_dog", label: "意面小狗", image: specialSpaghettiDogFishing, floatX: 85.1, floatY: 82.0, inset: 12.5 },
];

export function getBobberSkin(value: BobberSkinId): BobberSkinOption {
  return bobberSkins.find((skin) => skin.value === value) ?? bobberSkins[0];
}
