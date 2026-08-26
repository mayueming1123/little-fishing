import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminSnapshot } from "../../domain/prototype";
import { getAdminSnapshot, updateAdminMoney } from "../../ipc/client";
import { AdminPage } from "./AdminPage";

vi.mock("../../ipc/client", () => ({ getAdminSnapshot: vi.fn(), updateAdminMoney: vi.fn() }));

const snapshot: AdminSnapshot = {
  player: { poopKg: 20, money: 3000, pendingCatches: 2, eatenCount: 5, soldCount: 4 },
  baitName: "综合试钓饵", preferenceDate: "2026-08-25",
  fish: [{ id: 1, name: "鲫鱼", pricePerKg: 24, rarity: "common", minimumSimilarity: 0.4, minLengthCm: 8, maxLengthCm: 35, minWeightKg: 0.05, maxWeightKg: 1.5, preference: { intensity: 0.8, color: 0.2, sweet: 0.4, sour: 0.1, salty: 0.3 }, similarity: 0.76, catchProbability: 0.083, enabled: true }],
};

describe("AdminPage", () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.mocked(getAdminSnapshot).mockReset().mockResolvedValue(snapshot);
    vi.mocked(updateAdminMoney).mockReset().mockResolvedValue({ snapshot, backupPath: "C:\\data\\backup.sqlite3" });
  });

  it("shows current fish odds and all five hidden attributes", async () => {
    render(<AdminPage onClose={vi.fn()} />);
    expect(await screen.findByText("鲫鱼")).toBeTruthy();
    expect(screen.getByText("8.30%")).toBeTruthy();
    expect(screen.getByText("76.0%")).toBeTruthy();
    for (const value of ["0.80", "0.20", "0.40", "0.10", "0.30"]) expect(screen.getByText(value)).toBeTruthy();
  });

  it("only updates money and can return to the game", async () => {
    const onClose = vi.fn();
    render(<AdminPage onClose={onClose} />);
    await screen.findByText("鲫鱼");
    fireEvent.change(screen.getByLabelText("金币"), { target: { value: "45000" } });
    fireEvent.click(screen.getByRole("button", { name: "保存金币" }));
    await waitFor(() => expect(updateAdminMoney).toHaveBeenCalledWith(45000));
    fireEvent.click(screen.getByRole("button", { name: "返回游戏" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
