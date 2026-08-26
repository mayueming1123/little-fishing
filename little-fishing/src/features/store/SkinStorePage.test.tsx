import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SkinStoreState } from "../../domain/prototype";
import { claimPoopSkin, getSkinStoreState, purchaseSkin, purchaseStoreBuff } from "../../ipc/client";
import { SkinStorePage } from "./SkinStorePage";

vi.mock("../../ipc/client", () => ({
  getSkinStoreState: vi.fn(),
  purchaseSkin: vi.fn(),
  purchaseStoreBuff: vi.fn(),
  claimPoopSkin: vi.fn(),
}));

const baseSkins = ["orange"] as const;

describe("SkinStorePage", () => {
  afterEach(cleanup);

  beforeEach(() => {
    const initial: SkinStoreState = {
      money: 60_000,
      poopKg: 1_000,
      ownedSkinIds: [...baseSkins],
      ownedBuffIds: [],
    };
    vi.mocked(getSkinStoreState).mockReset().mockResolvedValue(initial);
    vi.mocked(purchaseSkin).mockReset().mockResolvedValue({
      ...initial,
      money: 30_000,
      ownedSkinIds: [...baseSkins, "silver_tabby"],
    });
    vi.mocked(purchaseStoreBuff).mockReset().mockResolvedValue({
      ...initial,
      money: 30_000,
      ownedBuffIds: ["shorter_rounds_30"],
    });
    vi.mocked(claimPoopSkin).mockReset().mockResolvedValue({
      ...initial,
      ownedSkinIds: [...baseSkins, "bengal"],
    });
  });

  it("sells a permanent thirty-percent duration buff for 30000 coins", async () => {
    render(<SkinStorePage />);
    const button = await screen.findByRole("button", { name: "购买永久 Buff" });

    fireEvent.click(button);

    await waitFor(() => expect(purchaseStoreBuff).toHaveBeenCalledWith("shorter_rounds_30"));
    expect(await screen.findByText(/等待时间永久缩短 30%/)).toBeTruthy();
  });

  it("charges 30000 coins to unlock a paid skin", async () => {
    render(<SkinStorePage />);
    await waitFor(() => expect(screen.getByText("银虎斑")).toBeTruthy());

    fireEvent.click(screen.getAllByRole("button", { name: "购买 · 30,000 金币" })[0]);

    await waitFor(() => expect(purchaseSkin).toHaveBeenCalledWith("silver_tabby"));
    expect(await screen.findByText("购买成功，皮肤已经放进设置里。")).toBeTruthy();
  });

  it("claims the bengal reward without spending poop progress", async () => {
    render(<SkinStorePage />);
    await waitFor(() => expect(screen.getByText("孟加拉猫")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "领取成就奖励" }));

    await waitFor(() => expect(claimPoopSkin).toHaveBeenCalledWith("bengal"));
    expect(await screen.findByText(/累计产屎量不会被扣除/)).toBeTruthy();
  });

  it("hides mystery achievement skins until their matching discovery", async () => {
    render(<SkinStorePage />);

    await waitFor(() => expect(screen.getAllByText("通过某种特殊成就获得。")).toHaveLength(8));
    expect(screen.getAllByText("？？？")).toHaveLength(8);
    expect(screen.getAllByAltText("未解锁成就皮肤剪影")).toHaveLength(8);
    expect(screen.getAllByRole("button", { name: "通过某种特殊成就获得" })).toHaveLength(8);
  });
});
