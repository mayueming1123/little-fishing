import orangeCatFishing from "../../assets/orange-cat-fishing.png";
import grayCatFishing from "../../assets/cat-skin-gray.png";
import calicoCatFishing from "../../assets/cat-skin-calico.png";
import siameseCatFishing from "../../assets/cat-skin-siamese.png";
import silverTabbyCatFishing from "../../assets/cat-skin-silver-tabby.png";
import tuxedoCatFishing from "../../assets/cat-skin-tuxedo.png";
import ragdollCatFishing from "../../assets/cat-skin-ragdoll.png";
import bengalCatFishing from "../../assets/cat-skin-bengal.png";
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
];

export function getBobberSkin(value: BobberSkinId): BobberSkinOption {
  return bobberSkins.find((skin) => skin.value === value) ?? bobberSkins[0];
}
