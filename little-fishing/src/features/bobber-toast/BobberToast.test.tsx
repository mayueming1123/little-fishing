import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BobberToastPayload } from "../../domain/prototype";
import { activateBobberToast, subscribeBobberToast } from "../../ipc/client";
import { BobberToast } from "./BobberToast";

vi.mock("../../ipc/client", () => ({
  activateBobberToast: vi.fn(),
  subscribeBobberToast: vi.fn(),
}));

describe("BobberToast", () => {
  afterEach(cleanup);

  it("shows a counted catch bubble with its distinct visual kind", async () => {
    let listener: ((message: BobberToastPayload) => void) | undefined;
    vi.mocked(subscribeBobberToast).mockImplementation(async (next) => {
      listener = next;
      return () => undefined;
    });
    render(<BobberToast />);
    await act(async () => undefined);

    act(() => listener?.({ title: "中鱼了", body: "钓到一条披萨鱼", kind: "catch", count: 3 }));

    const bubble = screen.getByRole("button");
    expect(bubble.className).toContain("catch");
    expect(screen.getByText("×3")).toBeTruthy();
    expect(screen.getByLabelText("累计 3 条消息")).toBeTruthy();
    fireEvent.click(bubble);
    expect(activateBobberToast).toHaveBeenCalled();
  });
});
