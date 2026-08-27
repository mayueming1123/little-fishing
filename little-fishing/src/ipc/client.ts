import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  createMockStoppedState,
  createMockWaitingState,
  initialPrototypeState,
  defaultAppSettings,
  type AppSettings,
  type AdminMutationResult,
  type AdminSnapshot,
  type BaitEditorData,
  type BaitRecipeComponent,
  type FishRecord,
  type TreasureRecord,
  type FishingLogEntry,
  type PlayerSummary,
  type DailyFishHint,
  type PrototypeState,
  type MainSection,
  type SkinStoreState,
  type BobberSkinId,
  type BobberAlertKind,
} from "../domain/prototype";

declare global {
  interface Window { __TAURI_INTERNALS__?: unknown; }
}

let mockState = initialPrototypeState;
let mockSettings = defaultAppSettings;
let mockSkinStore: SkinStoreState = {
  money: 0,
  poopKg: 0,
  ownedSkinIds: ["orange"],
  ownedBuffIds: [],
};
let mockAdminSnapshot: AdminSnapshot = {
  player: { poopKg: 0, money: 12800, pendingCatches: 2, eatenCount: 16, soldCount: 9 },
  baitName: "综合试钓饵",
  preferenceDate: "2026-08-25",
  fish: [
    { id: 1, name: "鲫鱼", pricePerKg: 24, rarity: "common", minimumSimilarity: 0.4, minLengthCm: 8, maxLengthCm: 35, minWeightKg: 0.05, maxWeightKg: 1.5, preference: { intensity: 0.8, color: 0.2, sweet: 0.4, sour: 0.1, salty: 0.3 }, preferenceSources: [{ ingredientId: 1, ingredientName: "玉米粉", percentage: 60 }, { ingredientId: 2, ingredientName: "虾粉", percentage: 40 }], similarity: 0.76, catchProbability: 0.083, enabled: true },
    { id: 16, name: "鳜鱼", pricePerKg: 96, rarity: "rare", minimumSimilarity: 0.65, minLengthCm: 18, maxLengthCm: 60, minWeightKg: 0.25, maxWeightKg: 5, preference: { intensity: 0.9, color: 0.5, sweet: 0.1, sour: 0.2, salty: 0.7 }, preferenceSources: [{ ingredientId: 8, ingredientName: "鱼粉", percentage: 100 }], similarity: 0.68, catchProbability: 0.011, enabled: true },
    { id: 41, name: "番茄肉丸意大利面鱼", pricePerKg: 1000, rarity: "special", minimumSimilarity: 0, minLengthCm: 22, maxLengthCm: 58, minWeightKg: 0.8, maxWeightKg: 6.5, preference: { intensity: 0.7, color: 0.9, sweet: 0.4, sour: 0.5, salty: 0.2 }, preferenceSources: [{ ingredientId: 11, ingredientName: "果酸粉", percentage: 100 }], similarity: 0.61, catchProbability: 0.003, enabled: true },
  ],
};
const mockListeners = new Set<(state: PrototypeState) => void>();
const mockSettingsListeners = new Set<(settings: AppSettings) => void>();
const mockSkinPreviewListeners = new Set<(skinId: BobberSkinId | null) => void>();

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
    recipeId: mockState.selectedRecipeId,
    recipeName: mockState.selectedRecipeName ?? "综合试钓饵",
    recipes: [{ id: 1, name: "综合试钓饵" }],
    components: [],
    canEdit: !mockState.isFishing,
  };
}

export async function saveBaitRecipe(
  recipeId: number | null,
  name: string,
  components: BaitRecipeComponent[],
  saveAsNew: boolean,
): Promise<PrototypeState> {
  if (isTauriRuntime()) return invoke<PrototypeState>("save_bait_recipe", { recipeId, name, components, saveAsNew });
  return mockState;
}

export async function selectBaitRecipe(recipeId: number): Promise<PrototypeState> {
  if (isTauriRuntime()) return invoke<PrototypeState>("select_bait_recipe", { recipeId });
  mockState = { ...mockState, selectedRecipeId: recipeId, stateRevision: mockState.stateRevision + 1 };
  emitMock();
  return mockState;
}

export async function deleteBaitRecipe(recipeId: number): Promise<PrototypeState> {
  if (isTauriRuntime()) return invoke<PrototypeState>("delete_bait_recipe", { recipeId });
  if (recipeId <= 1) throw new Error("默认鱼饵方案不能删除");
  mockState = {
    ...mockState,
    selectedRecipeId: 1,
    selectedRecipeName: "综合试钓饵",
    stateRevision: mockState.stateRevision + 1,
  };
  emitMock();
  return mockState;
}

export async function getFishRecords(): Promise<FishRecord[]> {
  return isTauriRuntime() ? invoke<FishRecord[]>("get_fish_records") : [];
}

export async function getTreasureRecords(): Promise<TreasureRecord[]> {
  return isTauriRuntime() ? invoke<TreasureRecord[]>("get_treasure_records") : [];
}

export async function getPlayerSummary(): Promise<PlayerSummary> {
  if (isTauriRuntime()) return invoke<PlayerSummary>("get_player_summary");
  return { poopKg: 0, money: 0, pendingCatches: 0, eatenCount: 0, soldCount: 0 };
}

export async function getDailyFishHint(): Promise<DailyFishHint | null> {
  if (isTauriRuntime()) return invoke<DailyFishHint | null>("get_daily_fish_hint");
  return {
    localDate: new Date().toISOString().slice(0, 10),
    fishName: "鲫鱼",
    ingredientNames: ["玉米粉", "麦香粉"],
  };
}

export async function getAdminSnapshot(): Promise<AdminSnapshot> {
  return isTauriRuntime() ? invoke<AdminSnapshot>("get_admin_snapshot") : structuredClone(mockAdminSnapshot);
}

export async function updateAdminMoney(money: number): Promise<AdminMutationResult> {
  if (isTauriRuntime()) return invoke<AdminMutationResult>("update_admin_money", { money });
  mockAdminSnapshot = {
    ...mockAdminSnapshot,
    player: { ...mockAdminSnapshot.player, money },
  };
  return { snapshot: structuredClone(mockAdminSnapshot), backupPath: "浏览器预览不会写入数据库" };
}

export async function getSkinStoreState(): Promise<SkinStoreState> {
  return isTauriRuntime() ? invoke<SkinStoreState>("get_skin_store_state") : mockSkinStore;
}

export async function purchaseSkin(skinId: BobberSkinId): Promise<SkinStoreState> {
  if (isTauriRuntime()) return invoke<SkinStoreState>("purchase_skin", { skinId });
  const price = skinId === "gray" ? 5_000
    : skinId === "calico" ? 10_000
      : ["siamese", "samoyed", "golden_retriever"].includes(skinId) ? 20_000
        : ["silver_tabby", "tuxedo", "ragdoll"].includes(skinId) ? 30_000
          : skinId === "tom" ? 50_000
          : null;
  if (price === null) throw new Error("这款皮肤不是商店售卖项目");
  if (mockSkinStore.ownedSkinIds.includes(skinId)) throw new Error("这款皮肤已经拥有");
  if (mockSkinStore.money < price) throw new Error("金币不足");
  mockSkinStore = {
    ...mockSkinStore,
    money: mockSkinStore.money - price,
    ownedSkinIds: [...mockSkinStore.ownedSkinIds, skinId],
  };
  return mockSkinStore;
}

export async function purchaseStoreBuff(buffId: string): Promise<SkinStoreState> {
  if (isTauriRuntime()) return invoke<SkinStoreState>("purchase_store_buff", { buffId });
  if (buffId !== "shorter_rounds_30") throw new Error("未知的商店 Buff");
  if (mockSkinStore.ownedBuffIds.includes(buffId)) throw new Error("这个 Buff 已经永久生效");
  if (mockSkinStore.money < 30_000) throw new Error("金币不足");
  mockSkinStore = {
    ...mockSkinStore,
    money: mockSkinStore.money - 30_000,
    ownedBuffIds: [...mockSkinStore.ownedBuffIds, buffId],
  };
  return mockSkinStore;
}

export async function claimPoopSkin(skinId: BobberSkinId): Promise<SkinStoreState> {
  if (isTauriRuntime()) return invoke<SkinStoreState>("claim_poop_skin", { skinId });
  if (mockSkinStore.ownedSkinIds.includes(skinId)) throw new Error("这款皮肤已经拥有");
  if (mockSkinStore.poopKg < 1_000) throw new Error("累计产屎量尚未达标");
  mockSkinStore = {
    ...mockSkinStore,
    ownedSkinIds: [...mockSkinStore.ownedSkinIds, skinId],
  };
  return mockSkinStore;
}

export async function previewBobberSkin(skinId: BobberSkinId): Promise<void> {
  if (isTauriRuntime()) {
    await invoke("preview_bobber_skin", { skinId });
    return;
  }
  for (const listener of mockSkinPreviewListeners) listener(skinId);
}

export async function clearBobberSkinPreview(): Promise<void> {
  if (isTauriRuntime()) {
    await invoke("clear_bobber_skin_preview");
    return;
  }
  for (const listener of mockSkinPreviewListeners) listener(null);
}

export async function subscribeBobberSkinPreview(
  listener: (skinId: BobberSkinId | null) => void,
): Promise<UnlistenFn> {
  if (!isTauriRuntime()) {
    mockSkinPreviewListeners.add(listener);
    return () => mockSkinPreviewListeners.delete(listener);
  }
  return listen<BobberSkinId | null>("bobber-skin-preview", (event) => listener(event.payload));
}

export async function getFishingLog(limit = 100): Promise<FishingLogEntry[]> {
  return isTauriRuntime() ? invoke<FishingLogEntry[]>("get_fishing_log", { limit }) : [];
}

export async function getPendingCatches(): Promise<FishingLogEntry[]> {
  return isTauriRuntime() ? invoke<FishingLogEntry[]>("get_pending_catches") : [];
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

export async function requestLocalAdminAccess(): Promise<void> {
  if (isTauriRuntime()) await invoke("request_local_admin_access");
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

export async function subscribeBobberAlert(listener: (pending: BobberAlertKind | null) => void): Promise<UnlistenFn> {
  if (!isTauriRuntime()) return () => undefined;
  const unlisten = await listen<BobberAlertKind | null>("bobber-alert", (event) => listener(event.payload));
  const pending = await invoke<BobberAlertKind | null>("get_pending_bobber_alert");
  listener(pending);
  return unlisten;
}

export async function activateBobberAlert(): Promise<void> {
  if (isTauriRuntime()) await invoke("activate_bobber_alert");
}

export async function dismissBobberAlert(): Promise<void> {
  if (isTauriRuntime()) await invoke("dismiss_bobber_alert");
}

export async function subscribeMainNavigation(listener: (section: MainSection) => void): Promise<UnlistenFn> {
  if (!isTauriRuntime()) return () => undefined;
  return listen<MainSection>("main-navigate", (event) => listener(event.payload));
}

export async function subscribePrototypeState(listener: (state: PrototypeState) => void): Promise<UnlistenFn> {
  if (!isTauriRuntime()) {
    mockListeners.add(listener);
    return () => mockListeners.delete(listener);
  }
  return listen<PrototypeState>("prototype-state-changed", (event) => listener(event.payload));
}
