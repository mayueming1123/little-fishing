mod fishing_rules;
mod persistence;
mod round_engine;

use chrono::{DateTime, Duration as ChronoDuration, Local, SecondsFormat, Utc};
use fishing_rules::{
    BaitIngredientInfo, FishRecord, FlavorVector, OutcomeTextCatalog, resolve_round,
};
use persistence::{
    FishingLogEntry, PersistedRoundState, PlayerSummary, SqliteStore, StoredAppSettings,
};
use rand::Rng;
use round_engine::{EventCatalog, WaitingEvent, generate_round_plan};
use serde::{Deserialize, Serialize};
use std::sync::{
    Mutex,
    atomic::{AtomicBool, AtomicU64, Ordering},
};
use std::thread;
use std::time::Duration;
use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
};
use tauri::{
    AppHandle, Emitter, Manager, WebviewWindow, WindowEvent,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt as AutostartManagerExt};

const STATE_EVENT: &str = "prototype-state-changed";
const SETTINGS_EVENT: &str = "app-settings-changed";
const TOAST_EVENT: &str = "bobber-toast";
const ACHIEVEMENT_SKIN_ID: &str = "bengal";
const ACHIEVEMENT_WEIGHT_KG: f64 = 1_000.0;

fn shop_skin_price(value: &str) -> Option<f64> {
    match value {
        "gray" => Some(5_000.0),
        "calico" => Some(10_000.0),
        "siamese" => Some(20_000.0),
        "silver_tabby" | "tuxedo" | "ragdoll" => Some(30_000.0),
        _ => None,
    }
}

fn is_known_skin_id(value: &str) -> bool {
    matches!(
        value,
        "orange" | "gray" | "calico" | "siamese" | "silver_tabby" | "tuxedo" | "ragdoll" | "bengal"
    )
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum FishingPhase {
    Stopped,
    Waiting,
    Settling,
}

impl FishingPhase {
    fn code(self) -> &'static str {
        match self {
            Self::Stopped => "stopped",
            Self::Waiting => "waiting",
            Self::Settling => "settling",
        }
    }

    fn from_code(value: &str) -> Self {
        match value {
            "waiting" => Self::Waiting,
            "settling" => Self::Settling,
            _ => Self::Stopped,
        }
    }
}

struct PrototypeRoundState {
    phase: FishingPhase,
    is_fishing: bool,
    round_started_at: Option<DateTime<Utc>>,
    scheduled_end_time: Option<DateTime<Utc>>,
    planned_duration_seconds: u64,
    status_text: String,
    waiting_events: Vec<WaitingEvent>,
    notified_waiting_event_ids: BTreeSet<u32>,
    round_number: u64,
    selected_recipe_id: u64,
    selected_recipe_name: Option<String>,
    selected_bait_flavor: Option<FlavorVector>,
    last_result: Option<String>,
    state_revision: u64,
    stop_after_settlement: bool,
}

impl Default for PrototypeRoundState {
    fn default() -> Self {
        Self {
            phase: FishingPhase::Stopped,
            is_fishing: false,
            round_started_at: None,
            scheduled_end_time: None,
            planned_duration_seconds: 0,
            status_text: "岸边很安静，随时可以开始。".to_owned(),
            waiting_events: Vec::new(),
            notified_waiting_event_ids: BTreeSet::new(),
            round_number: 0,
            selected_recipe_id: 1,
            selected_recipe_name: None,
            selected_bait_flavor: None,
            last_result: None,
            state_revision: 0,
            stop_after_settlement: false,
        }
    }
}

impl PrototypeRoundState {
    fn from_persisted(value: PersistedRoundState) -> Self {
        Self {
            phase: FishingPhase::from_code(&value.phase),
            is_fishing: value.is_fishing,
            round_started_at: value
                .round_started_at
                .and_then(|time| DateTime::parse_from_rfc3339(&time).ok())
                .map(|time| time.with_timezone(&Utc)),
            scheduled_end_time: value
                .scheduled_end_time
                .and_then(|time| DateTime::parse_from_rfc3339(&time).ok())
                .map(|time| time.with_timezone(&Utc)),
            planned_duration_seconds: value.planned_duration_seconds,
            status_text: value.status_text,
            waiting_events: serde_json::from_str(&value.waiting_events_json).unwrap_or_default(),
            notified_waiting_event_ids: serde_json::from_str(&value.notified_events_json)
                .unwrap_or_default(),
            round_number: value.round_number,
            selected_recipe_id: value.selected_recipe_id,
            selected_recipe_name: value.selected_recipe_name,
            selected_bait_flavor: None,
            last_result: value.last_result,
            state_revision: value.state_revision,
            stop_after_settlement: value.stop_after_settlement,
        }
    }

    fn persisted(&self) -> PersistedRoundState {
        PersistedRoundState {
            phase: self.phase.code().to_owned(),
            is_fishing: self.is_fishing,
            round_started_at: self
                .round_started_at
                .map(|value| value.to_rfc3339_opts(SecondsFormat::Secs, true)),
            scheduled_end_time: self
                .scheduled_end_time
                .map(|value| value.to_rfc3339_opts(SecondsFormat::Secs, true)),
            planned_duration_seconds: self.planned_duration_seconds,
            status_text: self.status_text.clone(),
            waiting_events_json: serde_json::to_string(&self.waiting_events)
                .unwrap_or_else(|_| "[]".to_owned()),
            notified_events_json: serde_json::to_string(&self.notified_waiting_event_ids)
                .unwrap_or_else(|_| "[]".to_owned()),
            round_number: self.round_number,
            selected_recipe_id: self.selected_recipe_id,
            selected_recipe_name: self.selected_recipe_name.clone(),
            last_result: self.last_result.clone(),
            state_revision: self.state_revision,
            stop_after_settlement: self.stop_after_settlement,
        }
    }

    fn settle_after_relaunch(&mut self, now: DateTime<Utc>, catalog: &EventCatalog) {
        if self.phase == FishingPhase::Stopped {
            self.is_fishing = false;
            self.round_started_at = None;
            self.scheduled_end_time = None;
            self.planned_duration_seconds = 0;
            self.waiting_events.clear();
            self.notified_waiting_event_ids.clear();
            self.stop_after_settlement = false;
            return;
        }

        self.last_result =
            Some("重新回来时，上一竿刚好有了结果；离线期间只结算这一轮。".to_owned());
        if self.is_fishing && !self.stop_after_settlement {
            self.schedule_round(now, catalog);
        } else {
            self.phase = FishingPhase::Stopped;
            self.is_fishing = false;
            self.round_started_at = None;
            self.scheduled_end_time = None;
            self.planned_duration_seconds = 0;
            self.waiting_events.clear();
            self.notified_waiting_event_ids.clear();
        }
        self.stop_after_settlement = false;
        self.state_revision += 1;
    }

    fn snapshot(&self) -> PrototypeSnapshot {
        PrototypeSnapshot {
            phase: self.phase.code(),
            is_fishing: self.is_fishing,
            round_started_at: self
                .round_started_at
                .map(|value| value.to_rfc3339_opts(SecondsFormat::Secs, true)),
            scheduled_end_time: self
                .scheduled_end_time
                .map(|value| value.to_rfc3339_opts(SecondsFormat::Secs, true)),
            planned_duration_seconds: self.planned_duration_seconds,
            status_text: self.status_text.clone(),
            waiting_events: self.waiting_events.clone(),
            round_number: self.round_number,
            selected_recipe_id: self.selected_recipe_id,
            selected_recipe_name: self.selected_recipe_name.clone(),
            last_result: self.last_result.clone(),
            state_revision: self.state_revision,
        }
    }

    fn start(&mut self, now: DateTime<Utc>, catalog: &EventCatalog) {
        if self.phase != FishingPhase::Stopped {
            return;
        }
        self.phase = FishingPhase::Waiting;
        self.is_fishing = true;
        self.stop_after_settlement = false;
        self.schedule_round(now, catalog);
        self.state_revision += 1;
    }

    fn schedule_round(&mut self, now: DateTime<Utc>, catalog: &EventCatalog) {
        let mut rng = rand::rng();
        let plan = generate_round_plan(now, &mut rng, catalog);
        self.phase = FishingPhase::Waiting;
        self.is_fishing = true;
        self.stop_after_settlement = false;
        self.round_number += 1;
        self.round_started_at = Some(now);
        self.scheduled_end_time = Some(now + ChronoDuration::seconds(plan.duration_seconds));
        self.planned_duration_seconds = plan.duration_seconds as u64;
        self.status_text = plan.status_text;
        self.waiting_events = plan.waiting_events;
        self.notified_waiting_event_ids.clear();
    }

    fn take_next_due_waiting_event(&mut self, now: DateTime<Utc>) -> Option<WaitingEvent> {
        if self.phase != FishingPhase::Waiting {
            return None;
        }
        let event = self
            .waiting_events
            .iter()
            .find(|event| {
                event.scheduled_at <= now && !self.notified_waiting_event_ids.contains(&event.id)
            })?
            .clone();
        self.notified_waiting_event_ids.insert(event.id);
        Some(event)
    }

    fn stop(&mut self) {
        match self.phase {
            FishingPhase::Stopped => {}
            FishingPhase::Waiting => {
                self.phase = FishingPhase::Stopped;
                self.is_fishing = false;
                self.round_started_at = None;
                self.scheduled_end_time = None;
                self.planned_duration_seconds = 0;
                self.waiting_events.clear();
                self.notified_waiting_event_ids.clear();
                self.state_revision += 1;
            }
            FishingPhase::Settling => {
                self.is_fishing = false;
                self.stop_after_settlement = true;
                self.state_revision += 1;
            }
        }
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PrototypeSnapshot {
    phase: &'static str,
    is_fishing: bool,
    round_started_at: Option<String>,
    scheduled_end_time: Option<String>,
    planned_duration_seconds: u64,
    status_text: String,
    waiting_events: Vec<WaitingEvent>,
    round_number: u64,
    selected_recipe_id: u64,
    selected_recipe_name: Option<String>,
    last_result: Option<String>,
    state_revision: u64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct BaitRecipeComponentSnapshot {
    ingredient_id: i64,
    percentage: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BaitEditorData {
    ingredients: Vec<BaitIngredientInfo>,
    recipe_name: String,
    components: Vec<BaitRecipeComponentSnapshot>,
    can_edit: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct BaitRecipeComponentInput {
    ingredient_id: i64,
    percentage: f64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppSettings {
    notifications_enabled: bool,
    bobber_visible: bool,
    bobber_always_on_top: bool,
    theme: String,
    reduced_motion: bool,
    autostart_enabled: bool,
    bobber_skin: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self::from_stored(StoredAppSettings::default(), false)
    }
}

impl AppSettings {
    fn from_stored(value: StoredAppSettings, autostart_enabled: bool) -> Self {
        let theme = if matches!(value.theme.as_str(), "system" | "light" | "dark") {
            value.theme
        } else {
            "system".to_owned()
        };
        let bobber_skin = if is_known_skin_id(&value.bobber_skin) {
            value.bobber_skin
        } else {
            "orange".to_owned()
        };
        Self {
            notifications_enabled: value.notifications_enabled,
            bobber_visible: value.bobber_visible,
            bobber_always_on_top: value.bobber_always_on_top,
            theme,
            reduced_motion: value.reduced_motion,
            autostart_enabled,
            bobber_skin,
        }
    }

    fn stored(&self) -> StoredAppSettings {
        StoredAppSettings {
            notifications_enabled: self.notifications_enabled,
            bobber_visible: self.bobber_visible,
            bobber_always_on_top: self.bobber_always_on_top,
            theme: self.theme.clone(),
            reduced_motion: self.reduced_motion,
            bobber_skin: self.bobber_skin.clone(),
        }
    }
}

#[derive(Default)]
struct PrototypeAppState(Mutex<PrototypeRoundState>);

struct PersistenceState {
    store: SqliteStore,
    event_catalog: EventCatalog,
    outcome_text_catalog: OutcomeTextCatalog,
}

#[derive(Default)]
struct SettingsState(Mutex<AppSettings>);

#[derive(Default)]
struct LifecycleState {
    is_quitting: AtomicBool,
}

#[derive(Default)]
struct ToastState {
    sequence: AtomicU64,
    latest: Mutex<Option<BobberToastPayload>>,
}

#[derive(Clone, Serialize)]
struct BobberToastPayload {
    title: String,
    body: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SkinStoreState {
    money: f64,
    body_weight_kg: f64,
    owned_skin_ids: Vec<String>,
}

fn load_skin_store_state(store: &SqliteStore) -> Result<SkinStoreState, String> {
    let player = store
        .load_player_summary()
        .map_err(|error| error.to_string())?;
    let owned_skin_ids = store
        .load_owned_skin_ids()
        .map_err(|error| error.to_string())?;
    Ok(SkinStoreState {
        money: player.money,
        body_weight_kg: player.body_weight_kg,
        owned_skin_ids,
    })
}

fn snapshot(app: &AppHandle) -> PrototypeSnapshot {
    app.state::<PrototypeAppState>()
        .0
        .lock()
        .expect("prototype state poisoned")
        .snapshot()
}

fn broadcast(app: &AppHandle, value: PrototypeSnapshot) {
    let _ = app.emit(STATE_EVENT, value);
}

fn broadcast_settings(app: &AppHandle, value: AppSettings) {
    let _ = app.emit(SETTINGS_EVENT, value);
}

fn save_state(app: &AppHandle, state: &PrototypeRoundState) {
    if let Err(error) = app.state::<PersistenceState>().store.save(
        &state.persisted(),
        &Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true),
    ) {
        eprintln!("failed to persist fishing state: {error}");
    }
}

fn resolve_with_store(
    store: &SqliteStore,
    outcome_text_catalog: &OutcomeTextCatalog,
    round_number: u64,
    recipe_id: u64,
    round_started_at: Option<DateTime<Utc>>,
    planned_duration_seconds: u64,
    waiting_events: &[WaitingEvent],
) -> Result<String, String> {
    let local_date = Local::now().date_naive().to_string();
    let mut rng = rand::rng();
    store
        .ensure_daily_preferences(&local_date, &mut rng)
        .map_err(|error| error.to_string())?;
    let bait = store
        .load_bait_profile(recipe_id.min(i64::MAX as u64) as i64)
        .map_err(|error| error.to_string())?;
    let fish = store
        .load_fish_profiles(&local_date)
        .map_err(|error| error.to_string())?;
    let outcome = resolve_round(&bait, &fish, outcome_text_catalog, &mut rng);
    let settled_at = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
    let round_started_at =
        round_started_at.map(|value| value.to_rfc3339_opts(SecondsFormat::Secs, true));
    store
        .save_round_outcome(
            round_number,
            round_started_at.as_deref(),
            &settled_at,
            planned_duration_seconds,
            waiting_events,
            &local_date,
            &bait.name,
            &outcome,
        )
        .map_err(|error| error.to_string())?;
    Ok(outcome.summary())
}

fn resolve_current_round(
    app: &AppHandle,
    round_number: u64,
    recipe_id: u64,
    round_started_at: Option<DateTime<Utc>>,
    planned_duration_seconds: u64,
    waiting_events: &[WaitingEvent],
) -> Result<String, String> {
    let persistence = app.state::<PersistenceState>();
    resolve_with_store(
        &persistence.store,
        &persistence.outcome_text_catalog,
        round_number,
        recipe_id,
        round_started_at,
        planned_duration_seconds,
        waiting_events,
    )
}

fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn toast_position(
    anchor_position: tauri::PhysicalPosition<i32>,
    anchor_size: tauri::PhysicalSize<u32>,
    toast_size: tauri::PhysicalSize<u32>,
    monitor_position: tauri::PhysicalPosition<i32>,
    monitor_size: tauri::PhysicalSize<u32>,
) -> tauri::PhysicalPosition<i32> {
    let monitor_right = monitor_position.x.saturating_add(monitor_size.width as i32);
    let monitor_bottom = monitor_position
        .y
        .saturating_add(monitor_size.height as i32);
    let toast_width = toast_size.width as i32;
    let toast_height = toast_size.height as i32;
    let preferred_left = anchor_position
        .x
        .saturating_sub(toast_width.saturating_add(12));
    let preferred_x = if preferred_left >= monitor_position.x {
        preferred_left
    } else {
        anchor_position
            .x
            .saturating_add(anchor_size.width as i32)
            .saturating_add(12)
    };
    let x = preferred_x.clamp(
        monitor_position.x,
        monitor_right.saturating_sub(toast_width),
    );
    let centered_y = anchor_position
        .y
        .saturating_add(anchor_size.height as i32 / 2)
        .saturating_sub(toast_height / 2);
    let y = centered_y.clamp(
        monitor_position.y,
        monitor_bottom.saturating_sub(toast_height),
    );
    tauri::PhysicalPosition::new(x, y)
}

fn place_toast_near_bobber(app: &AppHandle) {
    let (Some(bobber), Some(toast)) = (
        app.get_webview_window("bobber"),
        app.get_webview_window("toast"),
    ) else {
        return;
    };
    let (Ok(anchor_position), Ok(anchor_size), Ok(toast_size), Ok(Some(monitor))) = (
        bobber.outer_position(),
        bobber.outer_size(),
        toast.outer_size(),
        bobber.current_monitor(),
    ) else {
        return;
    };
    let position = toast_position(
        anchor_position,
        anchor_size,
        toast_size,
        *monitor.position(),
        *monitor.size(),
    );
    let _ = toast.set_position(position);
}

fn send_interactive_notification(app: &AppHandle, title: &str, body: &str) -> Result<(), String> {
    if !app
        .state::<SettingsState>()
        .0
        .lock()
        .expect("settings state poisoned")
        .notifications_enabled
    {
        return Ok(());
    }
    let toast = app
        .get_webview_window("toast")
        .ok_or("toast window not found")?;
    let sequence = app
        .state::<ToastState>()
        .sequence
        .fetch_add(1, Ordering::SeqCst)
        .saturating_add(1);
    *app.state::<ToastState>()
        .latest
        .lock()
        .expect("toast state poisoned") = Some(BobberToastPayload {
        title: title.to_owned(),
        body: body.to_owned(),
    });
    place_toast_near_bobber(app);
    toast
        .emit(
            TOAST_EVENT,
            BobberToastPayload {
                title: title.to_owned(),
                body: body.to_owned(),
            },
        )
        .map_err(|error| error.to_string())?;
    toast.show().map_err(|error| error.to_string())?;
    let app = app.clone();
    thread::spawn(move || {
        thread::sleep(Duration::from_secs(8));
        if app.state::<ToastState>().sequence.load(Ordering::SeqCst) == sequence
            && let Some(toast) = app.get_webview_window("toast")
        {
            let _ = toast.hide();
            *app.state::<ToastState>()
                .latest
                .lock()
                .expect("toast state poisoned") = None;
        }
    });
    Ok(())
}

fn apply_window_settings(app: &AppHandle, settings: &AppSettings) {
    if let Some(bobber) = app.get_webview_window("bobber") {
        let _ = bobber.set_always_on_top(settings.bobber_always_on_top);
        if settings.bobber_visible {
            let _ = bobber.show();
        } else {
            let _ = bobber.hide();
        }
    }
    if let Some(panel) = app.get_webview_window("panel") {
        let _ = panel.set_always_on_top(settings.bobber_always_on_top);
        if !settings.bobber_visible {
            let _ = panel.hide();
        }
    }
    if let Some(toast) = app.get_webview_window("toast") {
        let _ = toast.set_always_on_top(settings.bobber_always_on_top);
        if !settings.bobber_visible {
            let _ = toast.hide();
        }
    }
}

fn set_bobber_visible(app: &AppHandle, visible: bool) {
    let next = {
        let state = app.state::<SettingsState>();
        let mut settings = state.0.lock().expect("settings state poisoned");
        settings.bobber_visible = visible;
        settings.clone()
    };
    apply_window_settings(app, &next);
    if let Err(error) = app.state::<PersistenceState>().store.save_app_settings(
        &next.stored(),
        &Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true),
    ) {
        eprintln!("failed to persist bobber visibility: {error}");
    }
    broadcast_settings(app, next);
}

fn toggle_bobber(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("bobber") {
        set_bobber_visible(app, !window.is_visible().unwrap_or(false));
    }
}

fn place_bobber_initially(app: &AppHandle) {
    let Some(bobber) = app.get_webview_window("bobber") else {
        return;
    };
    let (Ok(Some(monitor)), Ok(size)) = (app.primary_monitor(), bobber.outer_size()) else {
        return;
    };
    let monitor_position = monitor.position();
    let monitor_size = monitor.size();
    let x = monitor_position
        .x
        .saturating_add(monitor_size.width as i32)
        .saturating_sub(size.width as i32)
        .saturating_sub(48);
    let y = monitor_position
        .y
        .saturating_add(monitor_size.height as i32 / 3);
    let _ = bobber.set_position(tauri::PhysicalPosition::new(x, y));
}

fn toggle_fishing(app: &AppHandle) -> PrototypeSnapshot {
    let value = {
        let persistence = app.state::<PersistenceState>();
        let state = app.state::<PrototypeAppState>();
        let mut state = state.0.lock().expect("prototype state poisoned");
        if state.is_fishing {
            state.stop();
        } else {
            state.start(Utc::now(), &persistence.event_catalog);
        }
        save_state(app, &state);
        state.snapshot()
    };
    broadcast(app, value.clone());
    value
}

fn exit_app(app: &AppHandle) {
    {
        let state = app.state::<PrototypeAppState>();
        let state = state.0.lock().expect("prototype state poisoned");
        save_state(app, &state);
    }
    app.state::<LifecycleState>()
        .is_quitting
        .store(true, Ordering::SeqCst);
    app.exit(0);
}

fn handle_menu_action(app: &AppHandle, id: &str) {
    match id {
        "open-main" => show_main(app),
        "toggle-panel" => {
            let _ = toggle_panel(app);
        }
        "toggle-bobber" => toggle_bobber(app),
        "toggle-fishing" => {
            toggle_fishing(app);
        }
        "quit" => exit_app(app),
        _ => {}
    }
}

fn toggle_panel(app: &AppHandle) -> Result<(), String> {
    let panel = app
        .get_webview_window("panel")
        .ok_or("panel window not found")?;
    if panel.is_visible().map_err(|error| error.to_string())? {
        panel.hide().map_err(|error| error.to_string())?;
    } else {
        if let Some(bobber) = app.get_webview_window("bobber") {
            if let (Ok(position), Ok(size), Ok(panel_size), Ok(Some(monitor))) = (
                bobber.outer_position(),
                bobber.outer_size(),
                panel.outer_size(),
                bobber.current_monitor(),
            ) {
                let monitor_position = monitor.position();
                let monitor_size = monitor.size();
                let monitor_right = monitor_position.x.saturating_add(monitor_size.width as i32);
                let monitor_bottom = monitor_position
                    .y
                    .saturating_add(monitor_size.height as i32);
                let panel_width = panel_size.width as i32;
                let panel_height = panel_size.height as i32;
                let preferred_left = position.x.saturating_sub(panel_width.saturating_add(12));
                let preferred_x = if preferred_left >= monitor_position.x {
                    preferred_left
                } else {
                    position
                        .x
                        .saturating_add(size.width as i32)
                        .saturating_add(12)
                };
                let panel_x = preferred_x.clamp(
                    monitor_position.x,
                    monitor_right.saturating_sub(panel_width),
                );
                let centered_y = position
                    .y
                    .saturating_add(size.height as i32 / 2)
                    .saturating_sub(panel_height / 2);
                let panel_y = centered_y.clamp(
                    monitor_position.y,
                    monitor_bottom.saturating_sub(panel_height),
                );
                let _ = panel.set_position(tauri::PhysicalPosition::new(panel_x, panel_y));
            }
        }
        panel.show().map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn create_menu(app: &AppHandle, include_status: bool) -> tauri::Result<Menu<tauri::Wry>> {
    let state = snapshot(app);
    let status_text = if state.is_fishing {
        "状态：钓鱼中"
    } else {
        "状态：已停止"
    };
    let status = MenuItem::with_id(app, "status", status_text, false, None::<&str>)?;
    let panel = MenuItem::with_id(app, "toggle-panel", "打开状态面板", true, None::<&str>)?;
    let main = MenuItem::with_id(app, "open-main", "打开完整窗口", true, None::<&str>)?;
    let fishing_text = if state.is_fishing {
        "停止钓鱼"
    } else {
        "开始钓鱼"
    };
    let fishing = MenuItem::with_id(app, "toggle-fishing", fishing_text, true, None::<&str>)?;
    let bobber = MenuItem::with_id(app, "toggle-bobber", "显示或隐藏浮标", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "退出应用", true, None::<&str>)?;
    if include_status {
        Menu::with_items(
            app,
            &[&status, &panel, &main, &fishing, &bobber, &separator, &quit],
        )
    } else {
        Menu::with_items(app, &[&main, &panel, &fishing, &bobber, &separator, &quit])
    }
}

fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let menu = create_menu(app.handle(), false)?;
    TrayIconBuilder::with_id("main-tray")
        .tooltip("小小钓鱼")
        .icon(
            app.default_window_icon()
                .expect("application icon missing")
                .clone(),
        )
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}

fn waiting_event_notification_title(category: &str) -> &'static str {
    match category {
        "water" => "小小钓鱼 · 浮标有动静",
        "tackle" => "小小钓鱼 · 钓组出了点状况",
        "wildlife" => "小小钓鱼 · 岸边来客",
        "story" => "小小钓鱼 · 一点小插曲",
        _ => "小小钓鱼 · 岸边有动静",
    }
}

fn spawn_scheduler(app: AppHandle) {
    thread::spawn(move || {
        loop {
            thread::sleep(Duration::from_millis(500));
            let (waiting_event, settling) = {
                let state = app.state::<PrototypeAppState>();
                let mut state = state.0.lock().expect("prototype state poisoned");
                let due = state.phase == FishingPhase::Waiting
                    && state
                        .scheduled_end_time
                        .is_some_and(|end| end <= Utc::now());
                if due {
                    state.phase = FishingPhase::Settling;
                    state.state_revision += 1;
                    save_state(&app, &state);
                    (None, Some(state.snapshot()))
                } else if let Some(event) = state.take_next_due_waiting_event(Utc::now()) {
                    save_state(&app, &state);
                    (Some(event), None)
                } else {
                    (None, None)
                }
            };
            if let Some(event) = waiting_event {
                let _ = send_interactive_notification(
                    &app,
                    waiting_event_notification_title(&event.category),
                    &event.description,
                );
                continue;
            }
            let Some(settling) = settling else { continue };
            let settling_round_number = settling.round_number;
            let settling_recipe_id = settling.selected_recipe_id;
            let settling_started_at = settling
                .round_started_at
                .as_deref()
                .and_then(|value| DateTime::parse_from_rfc3339(value).ok())
                .map(|value| value.with_timezone(&Utc));
            let settling_duration = settling.planned_duration_seconds;
            let settling_events = settling.waiting_events.clone();
            broadcast(&app, settling);
            thread::sleep(Duration::from_millis(650));
            let result_summary = resolve_current_round(
                &app,
                settling_round_number,
                settling_recipe_id,
                settling_started_at,
                settling_duration,
                &settling_events,
            )
            .unwrap_or_else(|error| {
                eprintln!("failed to resolve fishing round: {error}");
                "这一竿到了结算时间，但记录结果时出了点小问题。".to_owned()
            });
            let _ = send_interactive_notification(&app, "小小钓鱼 · 本竿结果", &result_summary);
            let completed = {
                let persistence = app.state::<PersistenceState>();
                let state = app.state::<PrototypeAppState>();
                let mut state = state.0.lock().expect("prototype state poisoned");
                if state.phase != FishingPhase::Settling {
                    continue;
                }
                state.last_result = Some(result_summary);
                if state.is_fishing && !state.stop_after_settlement {
                    state.schedule_round(Utc::now(), &persistence.event_catalog);
                } else {
                    state.phase = FishingPhase::Stopped;
                    state.is_fishing = false;
                    state.round_started_at = None;
                    state.scheduled_end_time = None;
                    state.planned_duration_seconds = 0;
                    state.waiting_events.clear();
                    state.notified_waiting_event_ids.clear();
                    state.stop_after_settlement = false;
                }
                state.state_revision += 1;
                save_state(&app, &state);
                state.snapshot()
            };
            broadcast(&app, completed);
        }
    });
}

#[tauri::command]
fn get_prototype_state(app: AppHandle) -> PrototypeSnapshot {
    snapshot(&app)
}

#[tauri::command]
fn start_fishing(app: AppHandle) -> PrototypeSnapshot {
    let value = {
        let persistence = app.state::<PersistenceState>();
        let state = app.state::<PrototypeAppState>();
        let mut state = state.0.lock().expect("prototype state poisoned");
        state.start(Utc::now(), &persistence.event_catalog);
        save_state(&app, &state);
        state.snapshot()
    };
    broadcast(&app, value.clone());
    value
}

#[tauri::command]
fn stop_fishing(app: AppHandle) -> PrototypeSnapshot {
    let value = {
        let state = app.state::<PrototypeAppState>();
        let mut state = state.0.lock().expect("prototype state poisoned");
        state.stop();
        save_state(&app, &state);
        state.snapshot()
    };
    broadcast(&app, value.clone());
    value
}

#[tauri::command]
fn get_bait_editor_data(app: AppHandle) -> Result<BaitEditorData, String> {
    let persistence = app.state::<PersistenceState>();
    let state = app.state::<PrototypeAppState>();
    let state = state.0.lock().expect("prototype state poisoned");
    let recipe_id = state.selected_recipe_id.min(i64::MAX as u64) as i64;
    let profile = persistence
        .store
        .load_bait_profile(recipe_id)
        .map_err(|error| error.to_string())?;
    let ingredients = persistence
        .store
        .load_bait_ingredients()
        .map_err(|error| error.to_string())?;
    let components = persistence
        .store
        .load_recipe_components(recipe_id)
        .map_err(|error| error.to_string())?
        .into_iter()
        .map(|(ingredient_id, percentage)| BaitRecipeComponentSnapshot {
            ingredient_id,
            percentage,
        })
        .collect();
    Ok(BaitEditorData {
        ingredients,
        recipe_name: profile.name,
        components,
        can_edit: state.phase == FishingPhase::Stopped,
    })
}

#[tauri::command]
fn save_bait_recipe(
    app: AppHandle,
    name: String,
    components: Vec<BaitRecipeComponentInput>,
) -> Result<PrototypeSnapshot, String> {
    let cleaned_name = name.trim();
    if cleaned_name.is_empty() || cleaned_name.chars().count() > 24 {
        return Err("配方名称需要包含 1～24 个字符".to_owned());
    }
    let mut combined = BTreeMap::<i64, f64>::new();
    for component in components {
        if component.ingredient_id <= 0
            || !component.percentage.is_finite()
            || component.percentage <= 0.0
        {
            return Err("每个已使用成分都需要填写大于 0 的百分比".to_owned());
        }
        *combined.entry(component.ingredient_id).or_default() += component.percentage;
    }
    if combined.is_empty() {
        return Err("至少选择一种鱼饵成分".to_owned());
    }
    let normalized_components: Vec<_> = combined.into_iter().collect();
    let value = {
        let persistence = app.state::<PersistenceState>();
        let state = app.state::<PrototypeAppState>();
        let mut state = state.0.lock().expect("prototype state poisoned");
        if state.phase != FishingPhase::Stopped {
            return Err("请先停止钓鱼，再修改鱼饵配方".to_owned());
        }
        let profile = persistence
            .store
            .save_custom_bait_recipe(cleaned_name, &normalized_components)
            .map_err(|error| error.to_string())?;
        state.selected_recipe_id = 2;
        state.selected_recipe_name = Some(profile.name);
        state.selected_bait_flavor = Some(profile.flavor);
        state.state_revision += 1;
        save_state(&app, &state);
        state.snapshot()
    };
    broadcast(&app, value.clone());
    Ok(value)
}

#[tauri::command]
fn get_fish_records(app: AppHandle) -> Result<Vec<FishRecord>, String> {
    app.state::<PersistenceState>()
        .store
        .load_fish_records()
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn get_player_summary(app: AppHandle) -> Result<PlayerSummary, String> {
    app.state::<PersistenceState>()
        .store
        .load_player_summary()
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn get_skin_store_state(app: AppHandle) -> Result<SkinStoreState, String> {
    load_skin_store_state(&app.state::<PersistenceState>().store)
}

#[tauri::command]
fn purchase_skin(app: AppHandle, skin_id: String) -> Result<SkinStoreState, String> {
    let price = shop_skin_price(&skin_id).ok_or_else(|| "这款皮肤不是商店售卖项目".to_owned())?;
    let persistence = app.state::<PersistenceState>();
    let current = load_skin_store_state(&persistence.store)?;
    if current.owned_skin_ids.iter().any(|owned| owned == &skin_id) {
        return Err("这款皮肤已经拥有".to_owned());
    }
    if current.money < price {
        return Err(format!("金币不足，还差 {:.0} 金币", price - current.money));
    }
    persistence
        .store
        .purchase_skin(
            &skin_id,
            price,
            &Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true),
        )
        .map_err(|error| match error {
            rusqlite::Error::QueryReturnedNoRows => "金币不足，购买没有完成".to_owned(),
            rusqlite::Error::InvalidQuery => "这款皮肤已经拥有".to_owned(),
            _ => error.to_string(),
        })?;
    load_skin_store_state(&persistence.store)
}

#[tauri::command]
fn claim_weight_skin(app: AppHandle, skin_id: String) -> Result<SkinStoreState, String> {
    if skin_id != ACHIEVEMENT_SKIN_ID {
        return Err("这款皮肤不是体重成就奖励".to_owned());
    }
    let persistence = app.state::<PersistenceState>();
    let current = load_skin_store_state(&persistence.store)?;
    if current.owned_skin_ids.iter().any(|owned| owned == &skin_id) {
        return Err("这款皮肤已经拥有".to_owned());
    }
    if current.body_weight_kg < ACHIEVEMENT_WEIGHT_KG {
        return Err(format!(
            "体重尚未达标，还差 {:.1} kg",
            ACHIEVEMENT_WEIGHT_KG - current.body_weight_kg
        ));
    }
    persistence
        .store
        .claim_weight_skin(
            &skin_id,
            ACHIEVEMENT_WEIGHT_KG,
            &Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true),
        )
        .map_err(|error| match error {
            rusqlite::Error::QueryReturnedNoRows => "体重尚未达到 1000 kg".to_owned(),
            rusqlite::Error::InvalidQuery => "这款皮肤已经拥有".to_owned(),
            _ => error.to_string(),
        })?;
    load_skin_store_state(&persistence.store)
}

#[tauri::command]
fn get_fishing_log(app: AppHandle, limit: Option<u32>) -> Result<Vec<FishingLogEntry>, String> {
    app.state::<PersistenceState>()
        .store
        .load_fishing_log(limit.unwrap_or(100))
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn get_pending_catches(app: AppHandle) -> Result<Vec<FishingLogEntry>, String> {
    app.state::<PersistenceState>()
        .store
        .load_pending_catches()
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn handle_catch(
    app: AppHandle,
    round_number: u64,
    action: String,
) -> Result<PlayerSummary, String> {
    if action != "eat" && action != "sell" {
        return Err("未知的鱼获处理方式".to_owned());
    }
    let eaten_ratio = if action == "eat" {
        rand::rng().random_range(0.35..=0.80)
    } else {
        0.0
    };
    app.state::<PersistenceState>()
        .store
        .handle_catch(
            round_number,
            &action,
            eaten_ratio,
            &Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true),
        )
        .map_err(|error| match error {
            rusqlite::Error::QueryReturnedNoRows => "这条鱼已经处理过，或对应记录不存在".to_owned(),
            _ => error.to_string(),
        })
}

#[tauri::command]
fn get_app_settings(app: AppHandle) -> Result<AppSettings, String> {
    let mut settings = app
        .state::<SettingsState>()
        .0
        .lock()
        .expect("settings state poisoned")
        .clone();
    settings.autostart_enabled = app
        .autolaunch()
        .is_enabled()
        .map_err(|error| error.to_string())?;
    Ok(settings)
}

#[tauri::command]
fn update_app_settings(app: AppHandle, mut settings: AppSettings) -> Result<AppSettings, String> {
    if !matches!(settings.theme.as_str(), "system" | "light" | "dark") {
        return Err("未知的界面主题".to_owned());
    }
    if !is_known_skin_id(&settings.bobber_skin) {
        return Err("未知的悬浮猫咪皮肤".to_owned());
    }
    if !app
        .state::<PersistenceState>()
        .store
        .is_skin_owned(&settings.bobber_skin)
        .map_err(|error| error.to_string())?
    {
        return Err("这款皮肤尚未解锁，请先前往商店".to_owned());
    }
    let autostart = app.autolaunch();
    let autostart_enabled = autostart.is_enabled().map_err(|error| error.to_string())?;
    if settings.autostart_enabled != autostart_enabled {
        if settings.autostart_enabled {
            autostart.enable().map_err(|error| error.to_string())?;
        } else {
            autostart.disable().map_err(|error| error.to_string())?;
        }
    }
    settings.autostart_enabled = autostart.is_enabled().map_err(|error| error.to_string())?;
    app.state::<PersistenceState>()
        .store
        .save_app_settings(
            &settings.stored(),
            &Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true),
        )
        .map_err(|error| error.to_string())?;
    {
        let state = app.state::<SettingsState>();
        *state.0.lock().expect("settings state poisoned") = settings.clone();
    }
    apply_window_settings(&app, &settings);
    broadcast_settings(&app, settings.clone());
    Ok(settings)
}

#[tauri::command]
fn show_main_window(app: AppHandle) {
    show_main(&app);
}

#[tauri::command]
fn toggle_compact_panel(app: AppHandle) -> Result<(), String> {
    toggle_panel(&app)
}

#[tauri::command]
fn show_bobber_context_menu(app: AppHandle, window: WebviewWindow) -> Result<(), String> {
    let menu = create_menu(&app, true).map_err(|error| error.to_string())?;
    window.popup_menu(&menu).map_err(|error| error.to_string())
}

#[tauri::command]
fn request_app_exit(app: AppHandle) {
    exit_app(&app);
}

#[tauri::command]
fn send_test_notification(app: AppHandle) -> Result<(), String> {
    send_interactive_notification(&app, "小小钓鱼", "测试提示已送达，点击可以打开主窗口。")
}

#[tauri::command]
fn get_pending_bobber_toast(app: AppHandle) -> Option<BobberToastPayload> {
    app.state::<ToastState>()
        .latest
        .lock()
        .expect("toast state poisoned")
        .clone()
}

#[tauri::command]
fn activate_bobber_toast(app: AppHandle) {
    app.state::<ToastState>()
        .sequence
        .fetch_add(1, Ordering::SeqCst);
    *app.state::<ToastState>()
        .latest
        .lock()
        .expect("toast state poisoned") = None;
    if let Some(toast) = app.get_webview_window("toast") {
        let _ = toast.hide();
    }
    show_main(&app);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main(app)
        }))
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--background"]),
        ))
        .manage(PrototypeAppState::default())
        .manage(SettingsState::default())
        .manage(LifecycleState::default())
        .manage(ToastState::default())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            eprintln!("using app data directory: {}", app_data_dir.display());
            fs::create_dir_all(&app_data_dir).map_err(|error| {
                std::io::Error::other(format!(
                    "failed to create app data directory {}: {error}",
                    app_data_dir.display()
                ))
            })?;
            let database_path = app_data_dir.join("little-fishing.sqlite3");
            let store = SqliteStore::open(&database_path).map_err(|error| {
                std::io::Error::other(format!(
                    "failed to open sqlite database {}: {error}",
                    database_path.display()
                ))
            })?;
            let stored_settings = store.load_app_settings().map_err(|error| {
                std::io::Error::other(format!("failed to load app settings: {error}"))
            })?;
            let settings = AppSettings::from_stored(
                stored_settings,
                app.autolaunch().is_enabled().unwrap_or(false),
            );
            let event_catalog = store.load_event_catalog().map_err(|error| {
                std::io::Error::other(format!("failed to load waiting event catalog: {error}"))
            })?;
            let outcome_text_catalog = store.load_outcome_text_catalog().map_err(|error| {
                std::io::Error::other(format!("failed to load outcome text catalog: {error}"))
            })?;
            let local_date = Local::now().date_naive().to_string();
            store
                .ensure_daily_preferences(&local_date, &mut rand::rng())
                .map_err(|error| {
                    std::io::Error::other(format!("failed to create daily preferences: {error}"))
                })?;
            let restored = store.load().map_err(|error| {
                std::io::Error::other(format!("failed to load persisted state: {error}"))
            })?;
            {
                let state = app.state::<PrototypeAppState>();
                let mut state = state.0.lock().expect("prototype state poisoned");
                if let Some(restored) = restored {
                    *state = PrototypeRoundState::from_persisted(restored);
                    let offline_result = if state.phase != FishingPhase::Stopped {
                        resolve_with_store(
                            &store,
                            &outcome_text_catalog,
                            state.round_number,
                            state.selected_recipe_id,
                            state.round_started_at,
                            state.planned_duration_seconds,
                            &state.waiting_events,
                        )
                        .ok()
                    } else {
                        None
                    };
                    state.settle_after_relaunch(Utc::now(), &event_catalog);
                    if let Some(offline_result) = offline_result {
                        state.last_result = Some(offline_result);
                    }
                }
                let selected_bait = match store.load_bait_profile(state.selected_recipe_id as i64) {
                    Ok(profile) => profile,
                    Err(_) => {
                        state.selected_recipe_id = 1;
                        store.load_bait_profile(1).map_err(|error| {
                            std::io::Error::other(format!("failed to load selected bait: {error}"))
                        })?
                    }
                };
                state.selected_recipe_name = Some(selected_bait.name);
                state.selected_bait_flavor = Some(selected_bait.flavor);
                store
                    .save(
                        &state.persisted(),
                        &Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true),
                    )
                    .map_err(|error| {
                        std::io::Error::other(format!("failed to save initial state: {error}"))
                    })?;
            }
            app.manage(PersistenceState {
                store,
                event_catalog,
                outcome_text_catalog,
            });
            {
                let state = app.state::<SettingsState>();
                *state.0.lock().expect("settings state poisoned") = settings.clone();
            }
            place_bobber_initially(app.handle());
            apply_window_settings(app.handle(), &settings);
            if std::env::args().any(|argument| argument == "--background") {
                if let Some(main) = app.get_webview_window("main") {
                    let _ = main.hide();
                }
            }
            setup_tray(app).map_err(|error| {
                std::io::Error::other(format!("failed to set up tray: {error}"))
            })?;
            spawn_scheduler(app.handle().clone());
            Ok(())
        })
        .on_menu_event(|app, event| handle_menu_action(app, event.id().as_ref()))
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let quitting = window
                    .state::<LifecycleState>()
                    .is_quitting
                    .load(Ordering::SeqCst);
                if !quitting {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_prototype_state,
            start_fishing,
            stop_fishing,
            get_bait_editor_data,
            save_bait_recipe,
            get_fish_records,
            get_player_summary,
            get_skin_store_state,
            purchase_skin,
            claim_weight_skin,
            get_fishing_log,
            get_pending_catches,
            handle_catch,
            get_app_settings,
            update_app_settings,
            show_main_window,
            toggle_compact_panel,
            show_bobber_context_menu,
            request_app_exit,
            send_test_notification,
            get_pending_bobber_toast,
            activate_bobber_toast,
        ])
        .run(tauri::generate_context!())
        .expect("error while running little-fishing");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shop_skin_prices_follow_the_catalog() {
        assert_eq!(shop_skin_price("gray"), Some(5_000.0));
        assert_eq!(shop_skin_price("calico"), Some(10_000.0));
        assert_eq!(shop_skin_price("siamese"), Some(20_000.0));
        assert_eq!(shop_skin_price("silver_tabby"), Some(30_000.0));
        assert_eq!(shop_skin_price("orange"), None);
        assert_eq!(shop_skin_price("bengal"), None);
    }

    #[test]
    fn toast_is_placed_next_to_the_bobber_without_leaving_the_monitor() {
        let monitor_position = tauri::PhysicalPosition::new(0, 0);
        let monitor_size = tauri::PhysicalSize::new(1_920, 1_080);
        let bobber_size = tauri::PhysicalSize::new(108, 108);
        let toast_size = tauri::PhysicalSize::new(330, 118);

        let right_side = toast_position(
            tauri::PhysicalPosition::new(1_760, 300),
            bobber_size,
            toast_size,
            monitor_position,
            monitor_size,
        );
        assert_eq!(right_side, tauri::PhysicalPosition::new(1_418, 295));

        let left_side = toast_position(
            tauri::PhysicalPosition::new(10, 1_040),
            bobber_size,
            toast_size,
            monitor_position,
            monitor_size,
        );
        assert_eq!(left_side, tauri::PhysicalPosition::new(130, 962));
    }

    #[test]
    fn relaunch_settles_exactly_one_round_and_starts_the_next() {
        let now = DateTime::parse_from_rfc3339("2026-08-18T08:00:00Z")
            .unwrap()
            .with_timezone(&Utc);
        let mut state = PrototypeRoundState {
            phase: FishingPhase::Waiting,
            is_fishing: true,
            round_started_at: Some(now - ChronoDuration::hours(12)),
            scheduled_end_time: Some(now - ChronoDuration::hours(12)),
            planned_duration_seconds: 3_600,
            status_text: "正在等鱼。".to_owned(),
            waiting_events: Vec::new(),
            notified_waiting_event_ids: BTreeSet::new(),
            round_number: 9,
            selected_recipe_id: 1,
            selected_recipe_name: None,
            selected_bait_flavor: None,
            last_result: None,
            state_revision: 3,
            stop_after_settlement: false,
        };

        let catalog = EventCatalog::seeded();
        state.settle_after_relaunch(now, &catalog);

        assert_eq!(state.phase, FishingPhase::Waiting);
        assert!(state.is_fishing);
        assert_eq!(state.round_number, 10);
        assert_eq!(state.round_started_at, Some(now));
        assert!((30..=7_200).contains(&state.planned_duration_seconds));
        assert_eq!(state.planned_duration_seconds % 30, 0);
        assert_eq!(
            state.scheduled_end_time,
            Some(now + ChronoDuration::seconds(state.planned_duration_seconds as i64))
        );
        assert_eq!(state.state_revision, 4);
        assert!(state.last_result.is_some());
    }

    #[test]
    fn waiting_event_is_marked_before_notification_and_not_repeated() {
        let now = DateTime::parse_from_rfc3339("2026-08-18T08:00:00Z")
            .unwrap()
            .with_timezone(&Utc);
        let mut state = PrototypeRoundState {
            phase: FishingPhase::Waiting,
            is_fishing: true,
            round_started_at: Some(now - ChronoDuration::minutes(10)),
            scheduled_end_time: Some(now + ChronoDuration::minutes(10)),
            planned_duration_seconds: 1_200,
            status_text: "正在等鱼。".to_owned(),
            waiting_events: vec![WaitingEvent {
                id: 1,
                category: "water".to_owned(),
                scheduled_at: now - ChronoDuration::seconds(30),
                description: "浮标轻轻点了两下水。".to_owned(),
            }],
            notified_waiting_event_ids: BTreeSet::new(),
            round_number: 4,
            selected_recipe_id: 1,
            selected_recipe_name: None,
            selected_bait_flavor: None,
            last_result: None,
            state_revision: 2,
            stop_after_settlement: false,
        };

        let first = state
            .take_next_due_waiting_event(now)
            .expect("first due event");
        assert_eq!(first.id, 1);
        assert!(state.notified_waiting_event_ids.contains(&1));
        assert!(state.take_next_due_waiting_event(now).is_none());

        let restored = PrototypeRoundState::from_persisted(state.persisted());
        assert!(restored.notified_waiting_event_ids.contains(&1));
    }
}
