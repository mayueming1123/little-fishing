import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminSnapshot } from "../../domain/prototype";
import {
  createAdminDatabaseBackup,
  getAdminSnapshot,
  updateAdminFish,
  updateAdminPlayer,
} from "../../ipc/client";
import { AdminPage } from "./AdminPage";

vi.mock("../../ipc/client", () => ({
  createAdminDatabaseBackup: vi.fn(),
  getAdminSnapshot: vi.fn(),
  updateAdminFish: vi.fn(),
  updateAdminPlayer: vi.fn(),
}));

const snapshot: AdminSnapshot = {
  player: { bodyWeightKg: 80, money: 3000, pendingCatches: 2, eatenCount: 5, soldCount: 4 },
  stats: {
    fishCount: 43,
    enabledFishCount: 42,
    baitIngredientCount: 12,
    waitingEventCount: 80,
    outcomeDescriptionCount: 90,
    fishingRoundCount: 20,
    unlockedSkinCount: 3,
  },
  fish: [
    { id: 1, name: "鲫鱼", pricePerKg: 24, rarity: "common", minLengthCm: 8, maxLengthCm: 35, minWeightKg: 0.05, maxWeightKg: 1.5, enabled: true },
  ],
};

describe("AdminPage", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.mocked(getAdminSnapshot).mockReset().mockResolvedValue(snapshot);
    vi.mocked(createAdminDatabaseBackup).mockReset().mockResolvedValue("C:\\data\\admin-backups\\manual.sqlite3");
    vi.mocked(updateAdminPlayer).mockReset().mockResolvedValue({ snapshot, backupPath: "C:\\data\\admin-backups\\player.sqlite3" });
    vi.mocked(updateAdminFish).mockReset().mockResolvedValue({ snapshot, backupPath: "C:\\data\\admin-backups\\fish.sqlite3" });
  });

  it("shows local-only stats and creates a manual backup", async () => {
    render(<AdminPage />);
    expect(await screen.findByText("仅本机")).toBeTruthy();
    expect(screen.getByText("42/43")).toBeTruthy();
    expect(screen.getByText("170")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "立即备份数据库" }));
    await waitFor(() => expect(createAdminDatabaseBackup).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/manual\.sqlite3/)).toBeTruthy();
  });

  it("saves player values and a fish row", async () => {
    render(<AdminPage />);
    await screen.findByText("鲫鱼");

    const money = screen.getByLabelText("金币");
    fireEvent.change(money, { target: { value: "45000" } });
    fireEvent.click(screen.getByRole("button", { name: "保存玩家数据" }));
    await waitFor(() => expect(updateAdminPlayer).toHaveBeenCalledWith(80, 45000));

    fireEvent.change(screen.getByLabelText("鲫鱼价格"), { target: { value: "36" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(updateAdminFish).toHaveBeenCalledWith(expect.objectContaining({ id: 1, pricePerKg: 36 })));
  });
});
