import { describe, expect, it } from "vitest";
import type { BobberSkinId } from "../../domain/prototype";
import { bobberSkins, getBobberSkin } from "./skins";

describe("bobber skins", () => {
  it("defines four selectable skins with calibrated float positions", () => {
    expect(bobberSkins.map((skin) => skin.value)).toEqual(["orange", "gray", "calico", "siamese"]);
    expect(new Set(bobberSkins.map((skin) => skin.image)).size).toBe(4);
    for (const skin of bobberSkins) {
      expect(skin.floatX).toBeGreaterThan(0);
      expect(skin.floatX).toBeLessThan(100);
      expect(skin.floatY).toBeGreaterThan(0);
      expect(skin.floatY).toBeLessThan(100);
    }
  });

  it("falls back to the orange skin for an unknown stored value", () => {
    expect(getBobberSkin("unknown" as BobberSkinId).value).toBe("orange");
  });
});
