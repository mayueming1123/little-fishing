import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SkinStoreState } from "../../domain/prototype";
import { claimWeightSkin, getSkinStoreState, purchaseSkin } from "../../ipc/client";
import { SkinStorePage } from "./SkinStorePage";

vi.mock("../../ipc/client", () => ({
  getSkinStoreState: vi.fn(),
  purchaseSkin: vi.fn(),
  claimWeightSkin: vi.fn(),
}));

const baseSkins = ["orange"] as const;

describe("SkinStorePage", () => {
  afterEach(cleanup);

  beforeEach(() => {
    const initial: SkinStoreState = {
      money: 60_000,
      bodyWeightKg: 1_000,
      ownedSkinIds: [...baseSkins],
    };
    vi.mocked(getSkinStoreState).mockReset().mockResolvedValue(initial);
    vi.mocked(purchaseSkin).mockReset().mockResolvedValue({
      ...initial,
      money: 30_000,
      ownedSkinIds: [...baseSkins, "silver_tabby"],
    });
    vi.mocked(claimWeightSkin).mockReset().mockResolvedValue({
      ...initial,
      ownedSkinIds: [...baseSkins, "bengal"],
    });
  });

  it("charges 30000 coins to unlock a paid skin", async () => {
    render(<SkinStorePage />);
    await waitFor(() => expect(screen.getByText("银虎斑")).toBeTruthy());

    fireEvent.click(screen.getAllByRole("button", { name: "购买 · 30,000 金币" })[0]);

    await waitFor(() => expect(purchaseSkin).toHaveBeenCalledWith("silver_tabby"));
    expect(await screen.findByText("购买成功，皮肤已经放进设置里。")).toBeTruthy();
  });

  it("claims the bengal reward without spending achievement weight", async () => {
    render(<SkinStorePage />);
    await waitFor(() => expect(screen.getByText("孟加拉猫")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "领取成就奖励" }));

    await waitFor(() => expect(claimWeightSkin).toHaveBeenCalledWith("bengal"));
    expect(await screen.findByText(/体重不会被扣除/)).toBeTruthy();
  });
});
