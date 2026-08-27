import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PixelFishIcon, fishIconSpecs } from "./PixelFishIcon";

describe("PixelFishIcon", () => {
  it("provides one distinct visual specification for every seeded fish", () => {
    expect(fishIconSpecs).toHaveLength(50);
    const fishIds = [...Array.from({ length: 40 }, (_, index) => index + 1), ...Array.from({ length: 10 }, (_, index) => index + 44)];
    const icons = fishIconSpecs.map((spec, index) => ({
      signature: JSON.stringify(spec),
      markup: renderToStaticMarkup(<PixelFishIcon fishId={fishIds[index]} label="鱼" />),
    }));
    expect(new Set(icons.map((icon) => icon.signature)).size).toBe(50);
    expect(new Set(icons.map((icon) => icon.markup)).size).toBe(50);
  });

  it("uses three distinct generated pixel images for the special fish", () => {
    const icons = [41, 42, 43].map((fishId) => renderToStaticMarkup(<PixelFishIcon fishId={fishId} label="特殊鱼" />));
    expect(new Set(icons).size).toBe(3);
    for (const [index, markup] of icons.entries()) {
      expect(markup).toContain("special-fish-icon");
      expect(markup).toContain(`data-fish-id=\"${index + 41}\"`);
      expect(markup).toContain("像素图标");
    }
  });
});
