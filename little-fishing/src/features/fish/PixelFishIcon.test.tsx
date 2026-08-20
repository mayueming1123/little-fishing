import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PixelFishIcon, fishIconSpecs } from "./PixelFishIcon";

describe("PixelFishIcon", () => {
  it("provides one distinct visual specification for every seeded fish", () => {
    expect(fishIconSpecs).toHaveLength(30);
    const icons = fishIconSpecs.map((spec, index) => ({
      signature: JSON.stringify(spec),
      markup: renderToStaticMarkup(<PixelFishIcon fishId={index + 1} label="鱼" />),
    }));
    expect(new Set(icons.map((icon) => icon.signature)).size).toBe(30);
    expect(new Set(icons.map((icon) => icon.markup)).size).toBe(30);
  });
});
