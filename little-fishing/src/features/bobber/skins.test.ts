import { describe, expect, it } from "vitest";
import type { BobberSkinId } from "../../domain/prototype";
import { bobberSkins, getBobberSkin } from "./skins";

describe("bobber skins", () => {
  it("defines twenty selectable skins with calibrated float positions", () => {
    expect(bobberSkins.map((skin) => skin.value)).toEqual([
      "orange", "gray", "calico", "siamese", "silver_tabby", "tuxedo", "ragdoll", "bengal",
      "samoyed", "golden_retriever",
      "treasure_pearl", "treasure_crystal_shoe", "treasure_seal", "treasure_wood_sword", "treasure_martial_manual",
      "treasure_perfume",
      "special_water_monster", "special_pizza_rabbit", "special_spaghetti_dog",
      "tom",
    ]);
    expect(new Set(bobberSkins.map((skin) => skin.image)).size).toBe(20);
    for (const skin of bobberSkins) {
      expect(skin.floatX).toBeGreaterThan(0);
      expect(skin.floatX).toBeLessThan(100);
      expect(skin.floatY).toBeGreaterThan(0);
      expect(skin.floatY).toBeLessThan(100);
      expect(skin.inset).toBeGreaterThanOrEqual(0);
      expect(skin.inset).toBeLessThan(50);
    }
  });

  it("falls back to the orange skin for an unknown stored value", () => {
    expect(getBobberSkin("unknown" as BobberSkinId).value).toBe("orange");
  });
});
