import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { baitIconSpecs, PixelBaitIcon } from "./PixelBaitIcon";

describe("PixelBaitIcon", () => {
  afterEach(cleanup);

  it("defines and renders a pixel icon for all thirty bait ingredients", () => {
    expect(baitIconSpecs.map((spec) => spec.id)).toEqual(Array.from({ length: 30 }, (_, index) => index + 1));
    expect(new Set(baitIconSpecs.map((spec) => spec.kind)).size).toBe(30);

    render(<>{baitIconSpecs.map((spec) => <PixelBaitIcon key={spec.id} ingredientId={spec.id} label={`鱼饵${spec.id}`} />)}</>);
    expect(screen.getAllByRole("img")).toHaveLength(30);
    expect(screen.getByRole("img", { name: "鱼饵1像素图标" }).getAttribute("data-bait-id")).toBe("1");
    expect(screen.getByRole("img", { name: "鱼饵30像素图标" }).getAttribute("data-bait-id")).toBe("30");
  });
});
