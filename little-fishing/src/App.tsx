import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { BobberView } from "./features/bobber/BobberView";
import { BobberToast } from "./features/bobber-toast/BobberToast";
import { CompactPanel } from "./features/compact-panel/CompactPanel";
import { MainWindow } from "./features/main/MainWindow";
import { AdminPage } from "./features/admin/AdminPage";
import { isTauriRuntime } from "./ipc/client";
import { getAppSettings, requestLocalAdminAccess, subscribeAppSettings } from "./ipc/client";
import type { AppSettings } from "./domain/prototype";
import "./App.css";

type WindowView = "main" | "admin" | "bobber" | "panel" | "toast";

function viewFromLocation(): WindowView {
  const requested = new URLSearchParams(window.location.search).get("view");
  return requested === "admin" || requested === "bobber" || requested === "panel" || requested === "toast" ? requested : "main";
}

function App() {
  const [view, setView] = useState<WindowView>(viewFromLocation);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    const label = getCurrentWindow().label;
    if (label === "admin" || label === "bobber" || label === "panel" || label === "toast" || label === "main") setView(label);
  }, []);

  useEffect(() => {
    document.body.dataset.window = view;
    document.documentElement.dataset.window = view;
    return () => {
      delete document.body.dataset.window;
      delete document.documentElement.dataset.window;
    };
  }, [view]);

  useEffect(() => {
    if (view !== "main") return;
    function openOwnerAdmin(event: KeyboardEvent) {
      if (!event.repeat && event.ctrlKey && event.altKey && event.shiftKey && event.key === "F12") {
        event.preventDefault();
        void requestLocalAdminAccess().catch(() => undefined);
      }
    }
    window.addEventListener("keydown", openOwnerAdmin);
    return () => window.removeEventListener("keydown", openOwnerAdmin);
  }, [view]);

  useEffect(() => {
    function apply(settings: AppSettings) {
      if (settings.theme === "system") delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = settings.theme;
      document.documentElement.dataset.motion = settings.reducedMotion ? "reduce" : "full";
    }
    void getAppSettings().then(apply);
    let unlisten: (() => void) | undefined;
    void subscribeAppSettings(apply).then((dispose) => { unlisten = dispose; });
    return () => unlisten?.();
  }, []);

  if (view === "bobber") return <BobberView />;
  if (view === "panel") return <CompactPanel />;
  if (view === "toast") return <BobberToast />;
  if (view === "admin") return <AdminPage />;
  return <MainWindow />;
}

export default App;
