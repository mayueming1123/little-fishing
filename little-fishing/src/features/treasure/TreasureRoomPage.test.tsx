import { cleanup, render, screen, waitFor } from "@testing-library/react";
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

  it("places discoveries and locked mysteries across expanding shelves", async () => {
    vi.mocked(getTreasureRecords).mockResolvedValue(treasures);
    render(<TreasureRoomPage revision={1} />);

    await waitFor(() => expect(screen.getByText("巨大的黑色珍珠")).toBeTruthy());
    expect(screen.getByText("已发现 2 / 4")).toBeTruthy();
    expect(screen.getByLabelText("第 1 层展示架")).toBeTruthy();
    expect(screen.getByLabelText("第 2 层展示架")).toBeTruthy();
    expect(screen.getAllByText("尚未发现").length).toBeGreaterThan(0);
  });
});
