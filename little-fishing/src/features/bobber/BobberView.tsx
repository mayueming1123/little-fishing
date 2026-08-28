import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { defaultAppSettings, type BobberAlertKind, type BobberSkinId, type MainSection } from "../../domain/prototype";
import { usePrototypeState } from "../../hooks/usePrototypeState";
import {
  activateBobberAlert,
  dismissBobberAlert,
  getAppSettings,
  openMainSection,
  setBobberNavigationExpanded,
  showBobberContextMenu,
  startWindowDrag,
  subscribeAppSettings,
  subscribeBobberAlert,
  subscribeBobberSkinPreview,
  toggleCompactPanel,
} from "../../ipc/client";
import { getBobberSkin } from "./skins";
import { GameSectionIcon } from "../main/GameSectionIcon";

const bobberNavigation: Array<{ id: MainSection; label: string }> = [
  { id: "fishing", label: "钓鱼主页" },
  { id: "basket", label: "鱼篓" },
  { id: "treasure", label: "藏宝室" },
  { id: "log", label: "钓鱼日志" },
  { id: "fish", label: "鱼类大全" },
  { id: "bait", label: "鱼饵配方" },
  { id: "store", label: "商店" },
  { id: "settings", label: "设置" },
];

export function BobberView() {
  const { state } = usePrototypeState();
  const [savedSkinId, setSavedSkinId] = useState(defaultAppSettings.bobberSkin);
  const [previewSkinId, setPreviewSkinId] = useState<BobberSkinId | null>(null);
  const [alertKind, setAlertKind] = useState<BobberAlertKind | null>(null);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const pointer = useRef<{ x: number; y: number; dragged: boolean } | null>(null);
  const navigationOpenRef = useRef(false);
  const closeTimer = useRef<number | null>(null);
  const phase = state?.phase ?? "stopped";
  const skin = getBobberSkin(previewSkinId ?? savedSkinId);
  const alertLabel = alertKind === "treasure"
    ? "发现神秘奇遇，点击打开藏宝室"
    : alertKind === "catch"
      ? "钓到鱼了，点击打开鱼篓"
      : alertKind === "special_catch"
        ? "钓到特殊鱼了，点击打开鱼篓"
        : "有新的钓鱼事件，点击打开主页";
  const characterLabel = state?.isFishing ? "钓鱼中，点击打开状态面板" : "已停止，点击打开状态面板";

  useEffect(() => {
    let active = true;
    let unlistenSettings: (() => void) | undefined;
    let unlistenPreview: (() => void) | undefined;
    let unlistenAlert: (() => void) | undefined;
    void getAppSettings().then((settings) => { if (active) setSavedSkinId(settings.bobberSkin); });
    void subscribeAppSettings((settings) => setSavedSkinId(settings.bobberSkin)).then((dispose) => { unlistenSettings = dispose; });
    void subscribeBobberSkinPreview(setPreviewSkinId).then((dispose) => { unlistenPreview = dispose; });
    void subscribeBobberAlert(setAlertKind).then((dispose) => { unlistenAlert = dispose; });
    return () => { active = false; unlistenSettings?.(); unlistenPreview?.(); unlistenAlert?.(); };
  }, []);

  useEffect(() => () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    if (navigationOpenRef.current) void setBobberNavigationExpanded(false);
  }, []);

  async function setNavigationExpanded(expanded: boolean) {
    if (navigationOpenRef.current === expanded) return Promise.resolve();
    navigationOpenRef.current = expanded;
    if (!expanded) setNavigationOpen(false);
    await setBobberNavigationExpanded(expanded).catch(() => undefined);
    if (expanded && navigationOpenRef.current) setNavigationOpen(true);
  }

  function revealNavigation(event: ReactPointerEvent<HTMLDivElement>) {
    if (pointer.current?.dragged) {
      if (event.buttons !== 0) return;
      pointer.current = null;
    }
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
    void setNavigationExpanded(true);
  }

  function scheduleNavigationClose() {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      void setNavigationExpanded(false);
    }, 160);
  }

  function openSection(section: MainSection) {
    setAlertKind(null);
    void dismissBobberAlert();
    void setNavigationExpanded(false).then(() => openMainSection(section));
  }

  return <main className={`bobber-stage ${navigationOpen ? "navigation-open" : ""}`}>
    <div
      className="bobber-hover-zone"
      data-testid="bobber-hover-zone"
      onPointerEnter={revealNavigation}
      onPointerLeave={scheduleNavigationClose}
    >
    {alertKind && <button
      type="button"
      className={`bobber-alert ${alertKind.replace("_", "-")}`}
      onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
      onClick={() => {
        setAlertKind(null);
        void activateBobberAlert();
      }}
    ><span className="bobber-accessible-label">{alertLabel}</span>{alertKind === "event" ? <span className="bobber-alert-mark" aria-hidden="true">!</span> : alertKind === "treasure" ? <TreasureAlertIcon /> : <FishAlertIcon special={alertKind === "special_catch"} />}</button>}
    <button
      className={`bobber-button ${phase}`}
      onPointerDown={(event) => {
        event.preventDefault();
        pointer.current = { x: event.screenX, y: event.screenY, dragged: false };
      }}
      onPointerMove={(event) => {
        if (!pointer.current || pointer.current.dragged) return;
        if (Math.hypot(event.screenX - pointer.current.x, event.screenY - pointer.current.y) >= 4) {
          pointer.current.dragged = true;
          void setNavigationExpanded(false).then(() => startWindowDrag());
        }
      }}
      onPointerUp={(event) => {
        const dragged = pointer.current?.dragged;
        pointer.current = null;
        event.currentTarget.blur();
        if (!dragged) {
          setAlertKind(null);
          void dismissBobberAlert();
          void setNavigationExpanded(false);
          void toggleCompactPanel();
        }
      }}
      onPointerCancel={() => { pointer.current = null; }}
      onContextMenu={(event) => { event.preventDefault(); void showBobberContextMenu(); }}
    >
      <span className="bobber-accessible-label">{characterLabel}</span>
      <span
        className="bobber-hit-area"
        data-skin={skin.value}
        style={{ "--bobber-float-x": `${skin.floatX}%`, "--bobber-float-y": `${skin.floatY}%`, "--bobber-skin-inset": `${skin.inset}%` } as CSSProperties}
      >
        <img className="bobber-cat-scene" src={skin.image} alt="" aria-hidden="true" draggable={false} />
        <img className="bobber-float-layer" src={skin.image} alt="" aria-hidden="true" draggable={false} />
      </span>
    </button>
    {navigationOpen && <nav className="bobber-hover-nav" aria-label="悬浮角色快捷导航">
      {bobberNavigation.map((item) => <button
        type="button"
        key={item.id}
        onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
        onClick={() => openSection(item.id)}
      ><span className="bobber-accessible-label">打开{item.label}</span><GameSectionIcon section={item.id} className="bobber-nav-icon" /></button>)}
    </nav>}
    </div>
  </main>;
}

function FishAlertIcon({ special }: { special: boolean }) {
  return <svg className="bobber-alert-icon" viewBox="0 0 32 24" aria-hidden="true">
    {special && <><circle cx="15" cy="12" r="12" fill="#ffe79a" opacity=".28" /><path d="M4 4v3M4 17v3M27 3v3M28 17v3" stroke="#ffd45d" strokeWidth="2" strokeLinecap="round" /></>}
    <path d="M5 12c4-7 12-8 18-3l5-3-1 6 1 6-5-3c-6 5-14 4-18-3z" fill={special ? "#f3b84b" : "#63a9b5"} stroke="#fff" strokeWidth="1.5" />
    <circle cx="10" cy="10" r="1.3" fill="#263f45" />
  </svg>;
}

function TreasureAlertIcon() {
  return <svg className="bobber-alert-icon" viewBox="0 0 32 28" aria-hidden="true">
    <path d="M4 10h24v14H4z" rx="3" fill="#9b5c34" stroke="#fff5c7" strokeWidth="1.5" />
    <path d="M5 10c1-7 21-7 22 0z" fill="#d18a3d" stroke="#fff5c7" strokeWidth="1.5" />
    <path d="M14 9h5v16h-5z" fill="#f4c64f" /><circle cx="16.5" cy="16" r="2.2" fill="#fff0a6" />
    <path d="M3 3v3M28 2v4M1 14h3M29 14h3" stroke="#ffe878" strokeWidth="2" strokeLinecap="round" />
  </svg>;
}
