import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  createMockStoppedState,
  createMockWaitingState,
  initialPrototypeState,
  defaultAppSettings,
  type AppSettings,
  type BaitEditorData,
  type BaitRecipeComponent,
  type BobberToastPayload,
  type FishRecord,
  type FishingLogEntry,
  type PlayerSummary,
  type PrototypeState,
} from "../domain/prototype";

declare global {
  interface Window { __TAURI_INTERNALS__?: unknown; }
}

let mockState = initialPrototypeState;
let mockSettings = defaultAppSettings;
const mockListeners = new Set<(state: PrototypeState) => void>();
const mockSettingsListeners = new Set<(settings: AppSettings) => void>();

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function emitMock() {
  for (const listener of mockListeners) listener(mockState);
}

export async function getPrototypeState(): Promise<PrototypeState> {
  return isTauriRuntime() ? invoke<PrototypeState>("get_prototype_state") : mockState;
}

export async function startFishing(): Promise<PrototypeState> {
  if (isTauriRuntime()) return invoke<PrototypeState>("start_fishing");
  mockState = createMockWaitingState(mockState);
  emitMock();
  return mockState;
}

export async function stopFishing(): Promise<PrototypeState> {
  if (isTauriRuntime()) return invoke<PrototypeState>("stop_fishing");
  mockState = createMockStoppedState(mockState);
  emitMock();
  return mockState;
}

export async function getBaitEditorData(): Promise<BaitEditorData> {
  if (isTauriRuntime()) return invoke<BaitEditorData>("get_bait_editor_data");
  return {
    ingredients: [],
    recipeName: mockState.selectedRecipeName ?? "综合试钓饵",
    components: [],
    canEdit: !mockState.isFishing,
  };
}

export async function saveBaitRecipe(
  name: string,
  components: BaitRecipeComponent[],
): Promise<PrototypeState> {
  if (isTauriRuntime()) return invoke<PrototypeState>("save_bait_recipe", { name, components });
  return mockState;
}

export async function getFishRecords(): Promise<FishRecord[]> {
  return isTauriRuntime() ? invoke<FishRecord[]>("get_fish_records") : [];
}

export async function getPlayerSummary(): Promise<PlayerSummary> {
  if (isTauriRuntime()) return invoke<PlayerSummary>("get_player_summary");
  return { bodyWeightKg: 60, money: 0, pendingCatches: 0, eatenCount: 0, soldCount: 0 };
}

export async function getFishingLog(limit = 100): Promise<FishingLogEntry[]> {
  return isTauriRuntime() ? invoke<FishingLogEntry[]>("get_fishing_log", { limit }) : [];
}

export async function handleCatch(
  roundNumber: number,
  action: "eat" | "sell",
): Promise<PlayerSummary> {
  if (isTauriRuntime()) return invoke<PlayerSummary>("handle_catch", { roundNumber, action });
  return getPlayerSummary();
}

export async function getAppSettings(): Promise<AppSettings> {
  return isTauriRuntime() ? invoke<AppSettings>("get_app_settings") : mockSettings;
}

export async function updateAppSettings(settings: AppSettings): Promise<AppSettings> {
  if (isTauriRuntime()) return invoke<AppSettings>("update_app_settings", { settings });
  mockSettings = settings;
  for (const listener of mockSettingsListeners) listener(mockSettings);
  return mockSettings;
}

export async function subscribeAppSettings(listener: (settings: AppSettings) => void): Promise<UnlistenFn> {
  if (!isTauriRuntime()) {
    mockSettingsListeners.add(listener);
    return () => mockSettingsListeners.delete(listener);
  }
  return listen<AppSettings>("app-settings-changed", (event) => listener(event.payload));
}

export async function showMainWindow(): Promise<void> {
  if (isTauriRuntime()) await invoke("show_main_window");
}

export async function toggleCompactPanel(): Promise<void> {
  if (isTauriRuntime()) await invoke("toggle_compact_panel");
}

export async function showBobberContextMenu(): Promise<void> {
  if (isTauriRuntime()) await invoke("show_bobber_context_menu");
}

export async function requestAppExit(): Promise<void> {
  if (isTauriRuntime()) await invoke("request_app_exit");
}

export async function startWindowDrag(): Promise<void> {
  if (isTauriRuntime()) await getCurrentWindow().startDragging();
}

export async function sendPrototypeNotification(): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  if (!(await getAppSettings()).notificationsEnabled) return false;
  await invoke("send_test_notification");
  return true;
}

export async function subscribeBobberToast(listener: (message: BobberToastPayload) => void): Promise<UnlistenFn> {
  if (!isTauriRuntime()) return () => undefined;
  const unlisten = await listen<BobberToastPayload>("bobber-toast", (event) => listener(event.payload));
  const pending = await invoke<BobberToastPayload | null>("get_pending_bobber_toast");
  if (pending) listener(pending);
  return unlisten;
}

export async function activateBobberToast(): Promise<void> {
  if (isTauriRuntime()) await invoke("activate_bobber_toast");
}

export async function subscribePrototypeState(listener: (state: PrototypeState) => void): Promise<UnlistenFn> {
  if (!isTauriRuntime()) {
    mockListeners.add(listener);
    return () => mockListeners.delete(listener);
  }
  return listen<PrototypeState>("prototype-state-changed", (event) => listener(event.payload));
}
