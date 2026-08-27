import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FishRecord } from "../../domain/prototype";
import { getFishRecords } from "../../ipc/client";
import { FishRecordsPage } from "./FishRecordsPage";

vi.mock("../../ipc/client", () => ({
  getFishRecords: vi.fn(),
}));

const records: FishRecord[] = [
  { fishId: 1, name: "鲤鱼", pricePerKg: 12, rarity: "common", caughtCount: 2, maxLengthCm: 31, maxWeightKg: 1.2, latestDescription: "鳞片发亮。" },
  { fishId: 2, name: "鲫鱼", pricePerKg: 15, rarity: "uncommon", caughtCount: 0, maxLengthCm: null, maxWeightKg: null, latestDescription: null },
  { fishId: 41, name: "番茄肉丸意大利面鱼", pricePerKg: 1000, rarity: "special", caughtCount: 0, maxLengthCm: null, maxWeightKg: null, latestDescription: null },
];

describe("FishRecordsPage", () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.mocked(getFishRecords).mockResolvedValue(records);
  });

  it("can filter the encyclopedia to fish that have never been caught", async () => {
    render(<FishRecordsPage />);
    await waitFor(() => expect(screen.getByText("鲤鱼")).toBeTruthy());
    expect(screen.getByText("普通")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "未钓到 2" }));

    expect(screen.queryByText("鲤鱼")).toBeNull();
    expect(screen.getByText("鲫鱼")).toBeTruthy();
    expect(screen.getByText("少见")).toBeTruthy();
    expect(screen.getByText("番茄肉丸意大利面鱼")).toBeTruthy();
    expect(screen.getByText("特殊")).toBeTruthy();
    expect(screen.getByText(/鱼身缠满番茄酱色的面条纹路/)).toBeTruthy();
    expect(screen.getByText("显示 2 / 3 种")).toBeTruthy();
  });

  it("combines caught-state and rarity filters", async () => {
    render(<FishRecordsPage />);
    await waitFor(() => expect(screen.getByText("鲤鱼")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "未钓到 2" }));
    fireEvent.click(screen.getByRole("button", { name: "特殊 1" }));

    expect(screen.queryByText("鲤鱼")).toBeNull();
    expect(screen.queryByText("鲫鱼")).toBeNull();
    expect(screen.getByText("番茄肉丸意大利面鱼")).toBeTruthy();
    expect(screen.getByText("显示 1 / 3 种")).toBeTruthy();
  });
});
