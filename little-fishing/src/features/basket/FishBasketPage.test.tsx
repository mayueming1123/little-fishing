import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FishingLogEntry } from "../../domain/prototype";
import { getPendingCatches, getPlayerSummary, handleCatch } from "../../ipc/client";
import { FishBasketPage } from "./FishBasketPage";

vi.mock("../../ipc/client", () => ({
  getPendingCatches: vi.fn(),
  getPlayerSummary: vi.fn(),
  handleCatch: vi.fn(),
}));

const pendingCatch: FishingLogEntry = {
  roundNumber: 8,
  roundStartedAt: "2026-08-24T07:30:00Z",
  settledAt: "2026-08-24T08:00:00Z",
  plannedDurationSeconds: 1800,
  waitingEvents: [],
  baitName: "综合试钓饵",
  resultType: "caught",
  fishId: 1,
  fishName: "鲤鱼",
  fishRarity: "common",
  lengthCm: 31.2,
  weightKg: 1.1,
  value: 13.2,
  description: "鳞片在水边闪了一下。",
  disposition: "pending",
  dispositionAt: null,
  gainedWeightKg: null,
  gainedMoney: null,
};

const summary = { bodyWeightKg: 60, money: 0, pendingCatches: 1, eatenCount: 0, soldCount: 0 };

describe("FishBasketPage", () => {
  beforeEach(() => {
    vi.mocked(getPendingCatches).mockReset().mockResolvedValue([pendingCatch]);
    vi.mocked(getPlayerSummary).mockReset().mockResolvedValue(summary);
    vi.mocked(handleCatch).mockReset().mockResolvedValue({ ...summary, money: 13.2, pendingCatches: 0, soldCount: 1 });
  });

  it("lists pending catches and removes a fish after it is sold", async () => {
    render(<FishBasketPage revision={0} />);
    await waitFor(() => expect(screen.getByText("鲤鱼")).toBeTruthy());
    vi.mocked(getPendingCatches).mockResolvedValue([]);

    fireEvent.click(screen.getByRole("button", { name: "卖掉" }));

    await waitFor(() => expect(handleCatch).toHaveBeenCalledWith(8, "sell"));
    await waitFor(() => expect(screen.queryByText("鲤鱼")).toBeNull());
    expect(screen.getByText("鱼篓现在是空的")).toBeTruthy();
  });
});
