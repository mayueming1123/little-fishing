export type FishingPhase = "stopped" | "waiting" | "settling";

export interface WaitingEvent {
  id: number;
  category: "environment" | "water" | "tackle" | "wildlife" | "story";
  scheduledAt: string;
  description: string;
}

export interface PrototypeState {
  phase: FishingPhase;
  isFishing: boolean;
  roundStartedAt: string | null;
  scheduledEndTime: string | null;
  plannedDurationSeconds: number;
  statusText: string;
  waitingEvents: WaitingEvent[];
  roundNumber: number;
  selectedRecipeId: number;
  selectedRecipeName: string | null;
  lastResult: string | null;
  stateRevision: number;
}

export const initialPrototypeState: PrototypeState = {
  phase: "stopped",
  isFishing: false,
  roundStartedAt: null,
  scheduledEndTime: null,
  plannedDurationSeconds: 0,
  statusText: "岸边很安静，随时可以开始。",
  waitingEvents: [],
  roundNumber: 0,
  selectedRecipeId: 1,
  selectedRecipeName: "综合试钓饵",
  lastResult: null,
  stateRevision: 0,
};

export function createMockWaitingState(previous: PrototypeState, now = Date.now()): PrototypeState {
  const roll = Math.floor(Math.random() * 10_000);
  const [firstTick, lastTick] = roll < 150 ? [1, 9]
    : roll < 3_550 ? [10, 29]
      : roll < 6_950 ? [30, 59]
        : roll < 8_950 ? [60, 89]
          : roll < 9_850 ? [90, 120]
            : [121, 240];
  const durationSeconds = (firstTick + Math.floor(Math.random() * (lastTick - firstTick + 1))) * 30;
  return {
    ...previous,
    phase: "waiting",
    isFishing: true,
    roundStartedAt: new Date(now).toISOString(),
    scheduledEndTime: new Date(now + durationSeconds * 1_000).toISOString(),
    plannedDurationSeconds: durationSeconds,
    statusText: "鱼饵已经下水，接下来交给耐心和一点运气。",
    waitingEvents: [],
    roundNumber: previous.roundNumber + 1,
    stateRevision: previous.stateRevision + 1,
  };
}

export interface BaitIngredient {
  id: number;
  name: string;
  flavor: BaitFlavorVector;
}

export interface BaitFlavorVector {
  intensity: number;
  color: number;
  sweet: number;
  sour: number;
  salty: number;
}

export interface BaitRecipeComponent {
  ingredientId: number;
  percentage: number;
}

export interface BaitRecipeOption {
  id: number;
  name: string;
}

export interface BaitEditorData {
  ingredients: BaitIngredient[];
  recipeId: number;
  recipeName: string;
  recipes: BaitRecipeOption[];
  components: BaitRecipeComponent[];
  canEdit: boolean;
}

export type FishRarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "special";

export interface FishRecord {
  fishId: number;
  name: string;
  pricePerKg: number;
  rarity: FishRarity;
  caughtCount: number;
  maxLengthCm: number | null;
  maxWeightKg: number | null;
  latestDescription: string | null;
}

export interface TreasureRecord {
  treasureId: number;
  discovered: boolean;
  name: string;
  description: string;
  foundCount: number;
}

export interface PlayerSummary {
  poopKg: number;
  money: number;
  pendingCatches: number;
  eatenCount: number;
  soldCount: number;
}

export interface AdminFishRecord {
  id: number;
  name: string;
  pricePerKg: number;
  rarity: FishRarity;
  minimumSimilarity: number;
  minLengthCm: number;
  maxLengthCm: number;
  minWeightKg: number;
  maxWeightKg: number;
  preference: {
    intensity: number;
    color: number;
    sweet: number;
    sour: number;
    salty: number;
  };
  preferenceSources: Array<{
    ingredientId: number;
    ingredientName: string;
    percentage: number;
  }>;
  similarity: number;
  catchProbability: number;
  enabled: boolean;
}

export interface AdminSnapshot {
  player: PlayerSummary;
  fish: AdminFishRecord[];
  baitName: string;
  preferenceDate: string;
}

export interface AdminMutationResult {
  snapshot: AdminSnapshot;
  backupPath: string;
}

export type CatchDisposition = "pending" | "eaten" | "sold" | "not_applicable";

export interface FishingLogEntry {
  roundNumber: number;
  roundStartedAt: string | null;
  settledAt: string;
  plannedDurationSeconds: number;
  waitingEvents: WaitingEvent[];
  baitName: string;
  resultType: "caught" | "missed" | "treasure";
  fishId: number | null;
  fishName: string | null;
  fishRarity: FishRarity | null;
  lengthCm: number | null;
  weightKg: number | null;
  value: number | null;
  description: string;
  disposition: CatchDisposition;
  dispositionAt: string | null;
  gainedPoopKg: number | null;
  gainedMoney: number | null;
}

export type MainSection = "fishing" | "basket" | "treasure" | "log" | "fish" | "bait" | "store" | "settings";
export type BobberAlertKind = "event" | "catch" | "special_catch" | "treasure";

export type AppTheme = "system" | "light" | "dark";
export type BobberSkinId = "orange" | "gray" | "calico" | "siamese" | "silver_tabby" | "tuxedo" | "ragdoll" | "bengal" | "samoyed" | "golden_retriever" | "treasure_pearl" | "treasure_crystal_shoe" | "treasure_seal" | "treasure_wood_sword" | "treasure_martial_manual" | "treasure_perfume" | "special_water_monster" | "special_pizza_rabbit" | "special_spaghetti_dog" | "tom";

export interface SkinStoreState {
  money: number;
  poopKg: number;
  ownedSkinIds: BobberSkinId[];
  ownedBuffIds: string[];
}

export interface AppSettings {
  notificationsEnabled: boolean;
  bobberVisible: boolean;
  bobberAlwaysOnTop: boolean;
  theme: AppTheme;
  reducedMotion: boolean;
  autostartEnabled: boolean;
  bobberSkin: BobberSkinId;
}

export const defaultAppSettings: AppSettings = {
  notificationsEnabled: true,
  bobberVisible: true,
  bobberAlwaysOnTop: true,
  theme: "system",
  reducedMotion: false,
  autostartEnabled: false,
  bobberSkin: "orange",
};

export function createMockStoppedState(previous: PrototypeState): PrototypeState {
  return {
    ...previous,
    phase: "stopped",
    isFishing: false,
    roundStartedAt: null,
    scheduledEndTime: null,
    plannedDurationSeconds: 0,
    waitingEvents: [],
    stateRevision: previous.stateRevision + 1,
  };
}
