import orange from "../../assets/pond-avatars/orange.png";
import gray from "../../assets/pond-avatars/gray.png";
import calico from "../../assets/pond-avatars/calico.png";
import siamese from "../../assets/pond-avatars/siamese.png";
import silverTabby from "../../assets/pond-avatars/silver-tabby.png";
import tuxedo from "../../assets/pond-avatars/tuxedo.png";
import ragdoll from "../../assets/pond-avatars/ragdoll.png";
import bengal from "../../assets/pond-avatars/bengal.png";
import samoyed from "../../assets/pond-avatars/samoyed.png";
import goldenRetriever from "../../assets/pond-avatars/golden-retriever.png";
import treasurePearl from "../../assets/pond-avatars/treasure-pearl.png";
import treasureCrystalShoe from "../../assets/pond-avatars/treasure-crystal-shoe.png";
import treasureSeal from "../../assets/pond-avatars/treasure-seal.png";
import treasureWoodSword from "../../assets/pond-avatars/treasure-wood-sword.png";
import treasureMartialManual from "../../assets/pond-avatars/treasure-martial-manual.png";
import treasurePerfume from "../../assets/pond-avatars/treasure-perfume.png";
import specialWaterMonster from "../../assets/pond-avatars/special-water-monster.png";
import specialPizzaRabbit from "../../assets/pond-avatars/special-pizza-rabbit.png";
import specialSpaghettiDog from "../../assets/pond-avatars/special-spaghetti-dog.png";
import specialPuddingDog from "../../assets/pond-avatars/special-pudding-dog.png";
import specialPrincessCat from "../../assets/pond-avatars/special-princess-cat.png";
import tom from "../../assets/pond-avatars/tom.png";
import ditto from "../../assets/pond-avatars/ditto.png";
import cuteDog from "../../assets/pond-avatars/cute-dog.png";
import pinkRabbit from "../../assets/pond-avatars/pink-rabbit.png";
import type { BobberSkinId } from "../../domain/prototype";

export const pondAvatarBySkin: Record<BobberSkinId, string> = {
  orange,
  gray,
  calico,
  siamese,
  silver_tabby: silverTabby,
  tuxedo,
  ragdoll,
  bengal,
  samoyed,
  golden_retriever: goldenRetriever,
  treasure_pearl: treasurePearl,
  treasure_crystal_shoe: treasureCrystalShoe,
  treasure_seal: treasureSeal,
  treasure_wood_sword: treasureWoodSword,
  treasure_martial_manual: treasureMartialManual,
  treasure_perfume: treasurePerfume,
  special_water_monster: specialWaterMonster,
  special_pizza_rabbit: specialPizzaRabbit,
  special_spaghetti_dog: specialSpaghettiDog,
  special_pudding_dog: specialPuddingDog,
  special_princess_cat: specialPrincessCat,
  tom,
  ditto,
  cute_dog: cuteDog,
  pink_rabbit: pinkRabbit,
};

export function getPondAvatar(skinId: BobberSkinId): string {
  return pondAvatarBySkin[skinId];
}
