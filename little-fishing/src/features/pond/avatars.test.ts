import { describe, expect, it } from "vitest";
import { bobberSkins } from "../bobber/skins";
import { getPondAvatar, pondAvatarBySkin } from "./avatars";

describe("pond avatars", () => {
  it("has one dedicated avatar for every character skin", () => {
    expect(Object.keys(pondAvatarBySkin)).toHaveLength(25);
    expect(new Set(Object.values(pondAvatarBySkin))).toHaveLength(25);
    for (const skin of bobberSkins) {
      expect(getPondAvatar(skin.value)).toContain("/pond-avatars/");
    }
  });
});
