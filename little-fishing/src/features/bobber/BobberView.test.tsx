import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { activateBobberAlert, subscribeBobberAlert } from "../../ipc/client";
import { BobberView } from "./BobberView";

vi.mock("../../hooks/usePrototypeState", () => ({
  usePrototypeState: () => ({ state: { phase: "stopped", isFishing: false } }),
}));

vi.mock("../../ipc/client", () => ({
  activateBobberAlert: vi.fn(),
  getAppSettings: vi.fn().mockResolvedValue({
    notificationsEnabled: true,
    bobberVisible: true,
    bobberAlwaysOnTop: true,
    theme: "system",
    reducedMotion: false,
    autostartEnabled: false,
    bobberSkin: "orange",
  }),
  showBobberContextMenu: vi.fn(),
  startWindowDrag: vi.fn(),
  subscribeAppSettings: vi.fn().mockResolvedValue(() => undefined),
  subscribeBobberAlert: vi.fn(),
  subscribeBobberSkinPreview: vi.fn().mockResolvedValue(() => undefined),
  toggleCompactPanel: vi.fn(),
}));

describe("BobberView", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows one attached exclamation alert and opens the home page when clicked", async () => {
    let alertListener: ((pending: boolean) => void) | undefined;
    vi.mocked(subscribeBobberAlert).mockImplementation(async (listener) => {
      alertListener = listener;
      return () => undefined;
    });
    render(<BobberView />);
    await act(async () => undefined);

    act(() => alertListener?.(true));
    const alert = screen.getByRole("button", { name: "有新的钓鱼事件，点击打开主页" });
    expect(screen.getByText("!")).toBeTruthy();
    fireEvent.click(alert);

    expect(activateBobberAlert).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "有新的钓鱼事件，点击打开主页" })).toBeNull();
  });
});
