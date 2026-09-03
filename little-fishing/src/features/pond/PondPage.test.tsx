import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultAppSettings, type PondState } from "../../domain/prototype";
import { assignPondSkin, getAppSettings, getPondState, getSkinStoreState, purchasePondSlot, subscribeAppSettings, subscribePondState } from "../../ipc/client";
import { formatPondElapsed, PondPage } from "./PondPage";

vi.mock("../../ipc/client", () => ({
  assignPondSkin: vi.fn(),
  getAppSettings: vi.fn(),
  getPondState: vi.fn(),
  getSkinStoreState: vi.fn(),
  purchasePondSlot: vi.fn(),
  subscribeAppSettings: vi.fn(),
  subscribePondState: vi.fn(),
}));

const pondState: PondState = {
  money: 300_000,
  isFishing: true,
  activities: [{ slotIndex: 2, skinId: "gray", summary: "钓到一条鲫鱼。", settledAt: "2026-09-02T08:00:00Z" }],
  slots: Array.from({ length: 6 }, (_, index) => ({
    slotIndex: index + 1,
    unlocked: index < 2,
    fixedDesktopSlot: index === 0,
    unlockPrice: index === 0 ? null : 50_000 + (index - 1) * 30_000,
    skinId: index === 0 ? "orange" : index === 1 ? "gray" : null,
    phase: index < 2 ? "waiting" : "stopped",
    roundStartedAt: index < 2 ? "2026-09-02T08:00:00Z" : null,
    scheduledEndTime: index < 2 ? "2099-09-02T08:30:00Z" : null,
    lastResult: index === 1 ? "这一竿没有收获。" : null,
  })),
};

describe("PondPage", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.mocked(getPondState).mockReset().mockResolvedValue(pondState);
    vi.mocked(getAppSettings).mockReset().mockResolvedValue(defaultAppSettings);
    vi.mocked(getSkinStoreState).mockReset().mockResolvedValue({ money: 300_000, poopKg: 0, ownedSkinIds: ["orange", "gray", "calico"], ownedBuffIds: [] });
    vi.mocked(subscribePondState).mockReset().mockResolvedValue(() => undefined);
    vi.mocked(subscribeAppSettings).mockReset().mockResolvedValue(() => undefined);
    vi.mocked(purchasePondSlot).mockReset().mockResolvedValue({ ...pondState, slots: pondState.slots.map((slot) => slot.slotIndex === 3 ? { ...slot, unlocked: true } : slot) });
    vi.mocked(assignPondSkin).mockReset().mockResolvedValue(pondState);
  });

  it("formats the current cast as elapsed time instead of time remaining", () => {
    const now = new Date("2026-09-03T09:12:45Z").getTime();
    expect(formatPondElapsed("2026-09-03T08:00:00Z", now)).toBe("已钓 1:12:45");
    expect(formatPondElapsed("2026-09-03T09:12:15Z", now)).toBe("已钓 0:30");
    expect(formatPondElapsed(null, now)).toBe("等待开竿");
  });

  it("shows six seats, the fixed desktop pet, countdown state and last result", async () => {
    const { container } = render(<PondPage />);

    expect(await screen.findByText("桌宠固定席", { exact: false })).toBeTruthy();
    expect(screen.getByText("这一竿没有收获。")).toBeTruthy();
    expect(screen.getByText("钓到一条鲫鱼。")).toBeTruthy();
    expect(screen.getByRole("button", { name: /第 3 席.*80,000 金币/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /第 6 席.*170,000 金币/ })).toBeTruthy();
    const avatarSources = Array.from(container.querySelectorAll<HTMLImageElement>(".pond-character img, .pond-activity-list img"))
      .map((image) => image.src);
    expect(avatarSources.some((source) => source.includes("/pond-avatars/orange.png"))).toBe(true);
    expect(avatarSources.some((source) => source.includes("/pond-avatars/gray.png"))).toBe(true);
  });

  it("can unlock the next seat and assign an owned unused character", async () => {
    render(<PondPage />);
    fireEvent.click(await screen.findByRole("button", { name: /第 3 席.*80,000 金币/ }));
    await waitFor(() => expect(purchasePondSlot).toHaveBeenCalledWith(3));

    fireEvent.click(await screen.findByRole("button", { name: /安排伙伴/ }));
    fireEvent.click(await screen.findByRole("button", { name: "三花猫" }));
    await waitFor(() => expect(assignPondSkin).toHaveBeenCalledWith(3, "calico"));
  });
});
