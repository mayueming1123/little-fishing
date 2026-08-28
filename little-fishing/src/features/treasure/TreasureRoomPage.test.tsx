import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TreasureRecord } from "../../domain/prototype";
import { getTreasureRecords } from "../../ipc/client";
import { TreasureRoomPage } from "./TreasureRoomPage";

vi.mock("../../ipc/client", () => ({ getTreasureRecords: vi.fn() }));

const treasures: TreasureRecord[] = [
  { treasureId: 1, discovered: true, name: "巨大的黑色珍珠", description: "比拳头还大。", foundCount: 2 },
  { treasureId: 2, discovered: false, name: "？？？", description: "尚未发现", foundCount: 0 },
  { treasureId: 3, discovered: false, name: "？？？", description: "尚未发现", foundCount: 0 },
  { treasureId: 4, discovered: true, name: "宝剑树枝", description: "很像一把剑。", foundCount: 1 },
];

describe("TreasureRoomPage", () => {
  afterEach(cleanup);

  it("places item-only discoveries and locked mysteries across expanding shelves", async () => {
    vi.mocked(getTreasureRecords).mockResolvedValue(treasures);
    render(<TreasureRoomPage revision={1} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "查看巨大的黑色珍珠详情" })).toBeTruthy());
    expect(screen.getByText("已发现 2 / 4")).toBeTruthy();
    expect(screen.getByLabelText("第 1 层展示架")).toBeTruthy();
    expect(screen.getByLabelText("第 2 层展示架")).toBeTruthy();
    expect(screen.queryByText("比拳头还大。")).toBeNull();
    expect(screen.getAllByRole("button", { name: "查看未发现藏品详情" })).toHaveLength(2);
  });

  it("opens item details on demand and closes them with Escape", async () => {
    vi.mocked(getTreasureRecords).mockResolvedValue(treasures);
    render(<TreasureRoomPage revision={1} />);

    fireEvent.click(await screen.findByRole("button", { name: "查看巨大的黑色珍珠详情" }));
    expect(screen.getByRole("dialog", { name: "巨大的黑色珍珠" })).toBeTruthy();
    expect(screen.getByText("比拳头还大。")).toBeTruthy();
    expect(screen.getByText("2 次")).toBeTruthy();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
