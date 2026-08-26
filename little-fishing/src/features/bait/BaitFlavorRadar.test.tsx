import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { BaitIngredient } from "../../domain/prototype";
import { BaitFlavorRadar, calculateBaitFlavor } from "./BaitFlavorRadar";

const ingredients: BaitIngredient[] = [
  { id: 1, name: "甜饵", flavor: { intensity: 0.2, color: 0.4, sweet: 1, sour: 0, salty: 0.1 } },
  { id: 2, name: "咸饵", flavor: { intensity: 0.8, color: 0.2, sweet: 0, sour: 0.6, salty: 0.9 } },
];

describe("BaitFlavorRadar", () => {
  afterEach(cleanup);

  it("calculates the five dimensions using normalized recipe shares", () => {
    const flavor = calculateBaitFlavor(ingredients, [
      { ingredientId: 1, percentage: 3 },
      { ingredientId: 2, percentage: 1 },
    ]);

    expect(flavor.intensity).toBeCloseTo(0.35);
    expect(flavor.color).toBeCloseTo(0.35);
    expect(flavor.sweet).toBeCloseTo(0.75);
    expect(flavor.sour).toBeCloseTo(0.15);
    expect(flavor.salty).toBeCloseTo(0.3);
  });

  it("renders an accessible radar chart and exact values", () => {
    render(<BaitFlavorRadar flavor={{ intensity: 0.35, color: 0.35, sweet: 0.75, sour: 0.15, salty: 0.3 }} />);

    expect(screen.getByRole("img", { name: "当前鱼饵五维属性图" })).toBeTruthy();
    expect(screen.getByText("味道浓烈程度")).toBeTruthy();
    expect(screen.getByText("0.75")).toBeTruthy();
  });
});
