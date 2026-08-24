import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultAppSettings } from "../../domain/prototype";
import { getAppSettings, getSkinStoreState, sendPrototypeNotification, updateAppSettings } from "../../ipc/client";
import { SettingsPage } from "./SettingsPage";

vi.mock("../../ipc/client", () => ({
  getAppSettings: vi.fn(),
  getSkinStoreState: vi.fn(),
  sendPrototypeNotification: vi.fn(),
  updateAppSettings: vi.fn(),
}));

describe("SettingsPage", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.mocked(getAppSettings).mockReset().mockResolvedValue({ ...defaultAppSettings, bobberSkin: "gray" });
    vi.mocked(getSkinStoreState).mockReset().mockResolvedValue({
      money: 0,
      bodyWeightKg: 60,
      ownedSkinIds: ["orange", "gray"],
    });
    vi.mocked(updateAppSettings).mockReset().mockImplementation(async (settings) => settings);
    vi.mocked(sendPrototypeNotification).mockReset().mockResolvedValue(false);
  });

  it("shows purchased skins and can switch back to the free orange skin", async () => {
    render(<SettingsPage />);

    const gray = await screen.findByRole("button", { name: "灰白猫" });
    const orange = screen.getByRole("button", { name: "橙子猫" });
    expect(gray.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(orange);
    fireEvent.click(screen.getByRole("button", { name: "保存设置" }));

    await waitFor(() => expect(updateAppSettings).toHaveBeenCalledWith(
      expect.objectContaining({ bobberSkin: "orange" }),
    ));
  });

  it("still shows purchased skins when reading other settings fails", async () => {
    vi.mocked(getAppSettings).mockRejectedValueOnce(new Error("autostart unavailable"));
    render(<SettingsPage />);

    expect(await screen.findByRole("button", { name: "灰白猫" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "橙子猫" })).toBeTruthy();
    expect(screen.getByText(/暂时无法读取当前设置/)).toBeTruthy();
  });
});
