import orangeCatFishing from "../../assets/orange-cat-fishing.png";
import grayCatFishing from "../../assets/cat-skin-gray.png";
import calicoCatFishing from "../../assets/cat-skin-calico.png";
import siameseCatFishing from "../../assets/cat-skin-siamese.png";
import type { BobberSkinId } from "../../domain/prototype";

export interface BobberSkinOption {
  value: BobberSkinId;
  label: string;
  image: string;
  floatX: number;
  floatY: number;
}

export const bobberSkins: BobberSkinOption[] = [
  { value: "orange", label: "橙子猫", image: orangeCatFishing, floatX: 76.6, floatY: 72.2 },
  { value: "gray", label: "灰白猫", image: grayCatFishing, floatX: 86.1, floatY: 80.7 },
  { value: "calico", label: "三花猫", image: calicoCatFishing, floatX: 85, floatY: 76.4 },
  { value: "siamese", label: "暹罗猫", image: siameseCatFishing, floatX: 83.1, floatY: 77.2 },
];

export function getBobberSkin(value: BobberSkinId): BobberSkinOption {
  return bobberSkins.find((skin) => skin.value === value) ?? bobberSkins[0];
}
