import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BobberAlertKind } from "../../domain/prototype";
import { activateBobberAlert, dismissBobberAlert, openMainSection, setBobberNavigationExpanded, startWindowDrag, subscribeBobberAlert, toggleCompactPanel } from "../../ipc/client";
import { BobberView } from "./BobberView";

vi.mock("../../hooks/usePrototypeState", () => ({
  usePrototypeState: () => ({ state: { phase: "stopped", isFishing: false } }),
}));

vi.mock("../../ipc/client", () => ({
  activateBobberAlert: vi.fn(),
  dismissBobberAlert: vi.fn(),
  getAppSettings: vi.fn().mockResolvedValue({
    skinNames: { orange: "小橘" },
    notificationsEnabled: true,
    bobberVisible: true,
    bobberAlwaysOnTop: true,
    theme: "light",
    reducedMotion: false,
    autostartEnabled: false,
    bobberSkin: "orange",
  }),
  openMainSection: vi.fn(),
  setBobberNavigationExpanded: vi.fn().mockResolvedValue(undefined),
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
    vi.mocked(setBobberNavigationExpanded).mockResolvedValue(undefined);
  });

  it("shows one attached exclamation alert and opens the home page when clicked", async () => {
    let alertListener: ((pending: BobberAlertKind | null) => void) | undefined;
    vi.mocked(subscribeBobberAlert).mockImplementation(async (listener) => {
      alertListener = listener;
      return () => undefined;
    });
    render(<BobberView />);
    await act(async () => undefined);

    act(() => alertListener?.("event"));
    const alert = screen.getByRole("button", { name: "有新的钓鱼事件，点击打开主页" });
    expect(screen.getByText("!")).toBeTruthy();
    fireEvent.click(alert);

    expect(activateBobberAlert).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "有新的钓鱼事件，点击打开主页" })).toBeNull();
  });

  it("clears the alert when the character opens the compact panel", async () => {
    let alertListener: ((pending: BobberAlertKind | null) => void) | undefined;
    vi.mocked(subscribeBobberAlert).mockImplementation(async (listener) => {
      alertListener = listener;
      return () => undefined;
    });
    render(<BobberView />);
    await act(async () => undefined);
    act(() => alertListener?.("catch"));

    const character = screen.getByRole("button", { name: "已停止，点击打开状态面板" });
    fireEvent.pointerDown(character, { screenX: 100, screenY: 100 });
    fireEvent.pointerUp(character, { screenX: 100, screenY: 100 });

    expect(dismissBobberAlert).toHaveBeenCalledOnce();
    expect(toggleCompactPanel).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "钓到鱼了，点击打开鱼篓" })).toBeNull();
  });

  it.each([
    ["catch", "钓到鱼了，点击打开鱼篓"],
    ["special_catch", "钓到特殊鱼了，点击打开鱼篓"],
    ["treasure", "发现神秘奇遇，点击打开藏宝室"],
  ] as const)("renders the %s result icon with its own destination", async (kind, label) => {
    let alertListener: ((pending: BobberAlertKind | null) => void) | undefined;
    vi.mocked(subscribeBobberAlert).mockImplementation(async (listener) => {
      alertListener = listener;
      return () => undefined;
    });
    render(<BobberView />);
    await act(async () => undefined);

    act(() => alertListener?.(kind));
    fireEvent.click(screen.getByRole("button", { name: label }));

    expect(activateBobberAlert).toHaveBeenCalledOnce();
  });

  it("reveals an icon-only navigation on hover, retracts it, and opens a section", async () => {
    vi.mocked(subscribeBobberAlert).mockResolvedValue(() => undefined);
    render(<BobberView />);
    await act(async () => undefined);
    const stage = screen.getByTestId("bobber-hover-zone");

    fireEvent.pointerEnter(stage);
    const navigation = await screen.findByRole("navigation", { name: "悬浮角色快捷导航" });
    const navigationButtons = within(navigation).getAllByRole("button");
    expect(navigationButtons).toHaveLength(8);
    expect(navigationButtons.every((button) => button.querySelector(".bobber-accessible-label"))).toBe(true);
    expect(navigationButtons.every((button) => !button.hasAttribute("title"))).toBe(true);
    expect(navigationButtons.every((button) => !button.hasAttribute("aria-label"))).toBe(true);

    fireEvent.pointerLeave(stage);
    await waitFor(() => expect(screen.queryByRole("navigation", { name: "悬浮角色快捷导航" })).toBeNull());

    fireEvent.pointerEnter(stage);
    await screen.findByRole("navigation", { name: "悬浮角色快捷导航" });
    fireEvent.click(screen.getByRole("button", { name: "打开藏宝室" }));
    await waitFor(() => expect(openMainSection).toHaveBeenCalledWith("treasure"));
    expect(screen.queryByRole("navigation", { name: "悬浮角色快捷导航" })).toBeNull();
  });

  it("waits for the native window expansion before revealing navigation", async () => {
    let finishExpansion: (() => void) | undefined;
    vi.mocked(setBobberNavigationExpanded).mockImplementation((expanded) => expanded
      ? new Promise<void>((resolve) => { finishExpansion = resolve; })
      : Promise.resolve());
    vi.mocked(subscribeBobberAlert).mockResolvedValue(() => undefined);
    render(<BobberView />);
    await act(async () => undefined);

    fireEvent.pointerEnter(screen.getByTestId("bobber-hover-zone"));
    expect(screen.queryByRole("navigation", { name: "悬浮角色快捷导航" })).toBeNull();

    await act(async () => finishExpansion?.());
    expect(await screen.findByRole("navigation", { name: "悬浮角色快捷导航" })).toBeTruthy();
  });

  it("can reveal navigation again after the character was dragged", async () => {
    vi.mocked(subscribeBobberAlert).mockResolvedValue(() => undefined);
    render(<BobberView />);
    await act(async () => undefined);
    const stage = screen.getByTestId("bobber-hover-zone");
    fireEvent.pointerEnter(stage);
    await screen.findByRole("navigation", { name: "悬浮角色快捷导航" });

    const character = screen.getByRole("button", { name: "已停止，点击打开状态面板" });
    fireEvent.pointerDown(character, { screenX: 100, screenY: 100, buttons: 1 });
    fireEvent.pointerMove(character, { screenX: 108, screenY: 100, buttons: 1 });
    await waitFor(() => expect(startWindowDrag).toHaveBeenCalledOnce());
    expect(screen.queryByRole("navigation", { name: "悬浮角色快捷导航" })).toBeNull();

    fireEvent.pointerEnter(stage, { buttons: 0 });
    expect(await screen.findByRole("navigation", { name: "悬浮角色快捷导航" })).toBeTruthy();
  });
});
