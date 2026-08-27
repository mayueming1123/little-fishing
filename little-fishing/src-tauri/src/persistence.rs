use crate::fishing_rules::{
    BaitIngredientInfo, BaitProfile, FishProfile, FishRarity, FishRecord, FlavorVector,
    OutcomeTextCatalog, RoundOutcome, TreasureRecord, bait_ingredient_seeds, fish_species_seeds,
    legendary_treasure_seeds, outcome_description_seeds,
};
use crate::round_engine::{EventCatalog, WaitingEvent, event_description_seeds};
use rand::Rng;
use rusqlite::{Connection, OptionalExtension, params};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};

const TREASURE_SKIN_REWARDS: [(i64, &str); 6] = [
    (1, "treasure_pearl"),
    (2, "treasure_crystal_shoe"),
    (3, "treasure_seal"),
    (4, "treasure_wood_sword"),
    (5, "treasure_martial_manual"),
    (6, "treasure_perfume"),
];
const SPECIAL_FISH_SKIN_REWARDS: [(i64, &str); 3] = [
    (41, "special_spaghetti_dog"),
    (42, "special_pizza_rabbit"),
    (43, "special_water_monster"),
];
const DAILY_PREFERENCE_GENERATION_VERSION: i64 = 3;

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
struct PreferenceSourceComponent {
    ingredient_id: i64,
    percentage: f64,
}

#[derive(Clone, Debug, PartialEq)]
struct GeneratedFishPreference {
    flavor: FlavorVector,
    components: Vec<PreferenceSourceComponent>,
}

fn generate_reachable_fish_preference<R: Rng + ?Sized>(
    ingredients: &[(i64, FlavorVector)],
    rng: &mut R,
) -> GeneratedFishPreference {
    if ingredients.is_empty() {
        return GeneratedFishPreference {
            flavor: FlavorVector {
                intensity: 0.5,
                color: 0.5,
                sweet: 0.5,
                sour: 0.5,
                salty: 0.5,
            },
            components: Vec::new(),
        };
    }

    let component_count = rng.random_range(1..=ingredients.len().min(3));
    let mut available_indices: Vec<usize> = (0..ingredients.len()).collect();
    let mut total_weight = 0.0;
    let mut totals = [0.0; 5];
    let mut selected = Vec::with_capacity(component_count);
    for _ in 0..component_count {
        let available_index = rng.random_range(0..available_indices.len());
        let ingredient_index = available_indices.swap_remove(available_index);
        let (ingredient_id, ingredient) = ingredients[ingredient_index];
        let weight = rng.random_range(0.2..=1.0);
        total_weight += weight;
        totals[0] += ingredient.intensity * weight;
        totals[1] += ingredient.color * weight;
        totals[2] += ingredient.sweet * weight;
        totals[3] += ingredient.sour * weight;
        totals[4] += ingredient.salty * weight;
        selected.push((ingredient_id, weight));
    }

    GeneratedFishPreference {
        flavor: FlavorVector {
            intensity: totals[0] / total_weight,
            color: totals[1] / total_weight,
            sweet: totals[2] / total_weight,
            sour: totals[3] / total_weight,
            salty: totals[4] / total_weight,
        },
        components: selected
            .into_iter()
            .map(|(ingredient_id, weight)| PreferenceSourceComponent {
                ingredient_id,
                percentage: weight / total_weight * 100.0,
            })
            .collect(),
    }
}

fn treasure_reward_skin_id(treasure_id: i64) -> Option<&'static str> {
    TREASURE_SKIN_REWARDS
        .iter()
        .find_map(|(id, skin_id)| (*id == treasure_id).then_some(*skin_id))
}

fn special_fish_reward_skin_id(fish_id: i64) -> Option<&'static str> {
    SPECIAL_FISH_SKIN_REWARDS
        .iter()
        .find_map(|(id, skin_id)| (*id == fish_id).then_some(*skin_id))
}

#[derive(Debug)]
pub struct PersistedRoundState {
    pub phase: String,
    pub is_fishing: bool,
    pub round_started_at: Option<String>,
    pub scheduled_end_time: Option<String>,
    pub planned_duration_seconds: u64,
    pub status_text: String,
    pub waiting_events_json: String,
    pub notified_events_json: String,
    pub round_number: u64,
    pub selected_recipe_id: u64,
    pub selected_recipe_name: Option<String>,
    pub last_result: Option<String>,
    pub state_revision: u64,
    pub stop_after_settlement: bool,
}

#[derive(Clone, Debug, PartialEq)]
pub struct StoredAppSettings {
    pub notifications_enabled: bool,
    pub bobber_visible: bool,
    pub bobber_always_on_top: bool,
    pub theme: String,
    pub reduced_motion: bool,
    pub bobber_skin: String,
}

impl Default for StoredAppSettings {
    fn default() -> Self {
        Self {
            notifications_enabled: true,
            bobber_visible: true,
            bobber_always_on_top: true,
            theme: "system".to_owned(),
            reduced_motion: false,
            bobber_skin: "orange".to_owned(),
        }
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerSummary {
    pub poop_kg: f64,
    pub money: f64,
    pub pending_catches: u64,
    pub eaten_count: u64,
    pub sold_count: u64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminFishRecord {
    pub id: i64,
    pub name: String,
    pub price_per_kg: f64,
    pub rarity: FishRarity,
    pub minimum_similarity: f64,
    pub min_length_cm: f64,
    pub max_length_cm: f64,
    pub min_weight_kg: f64,
    pub max_weight_kg: f64,
    pub preference: FlavorVector,
    pub preference_sources: Vec<AdminPreferenceSource>,
    pub similarity: f64,
    pub catch_probability: f64,
    pub enabled: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminPreferenceSource {
    pub ingredient_id: i64,
    pub ingredient_name: String,
    pub percentage: f64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FishingLogEntry {
    pub round_number: u64,
    pub round_started_at: Option<String>,
    pub settled_at: String,
    pub planned_duration_seconds: u64,
    pub waiting_events: Vec<WaitingEvent>,
    pub bait_name: String,
    pub result_type: String,
    pub fish_id: Option<i64>,
    pub fish_name: Option<String>,
    pub fish_rarity: Option<FishRarity>,
    pub length_cm: Option<f64>,
    pub weight_kg: Option<f64>,
    pub value: Option<f64>,
    pub description: String,
    pub disposition: String,
    pub disposition_at: Option<String>,
    pub gained_poop_kg: Option<f64>,
    pub gained_money: Option<f64>,
}

pub struct SqliteStore {
    connection: Mutex<Connection>,
    path: PathBuf,
}

impl SqliteStore {
    pub fn open(path: &Path) -> rusqlite::Result<Self> {
        let connection = Connection::open(path)?;
        connection.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA foreign_keys = ON;

             CREATE TABLE IF NOT EXISTS game_state (
                 id INTEGER PRIMARY KEY CHECK (id = 1),
                 phase TEXT NOT NULL,
                 is_fishing INTEGER NOT NULL,
                 round_started_at TEXT,
                 scheduled_end_time TEXT,
                 planned_duration_seconds INTEGER NOT NULL DEFAULT 0,
                 status_text TEXT NOT NULL DEFAULT '浮标已经就位，正在慢慢等鱼。',
                 waiting_events_json TEXT NOT NULL DEFAULT '[]',
                 notified_events_json TEXT NOT NULL DEFAULT '[]',
                 round_number INTEGER NOT NULL,
                 selected_recipe_id INTEGER NOT NULL DEFAULT 1,
                 selected_recipe_name TEXT,
                 last_result TEXT,
                 state_revision INTEGER NOT NULL,
                 stop_after_settlement INTEGER NOT NULL,
                 updated_at TEXT NOT NULL
             );

             CREATE TABLE IF NOT EXISTS waiting_event_descriptions (
                 category TEXT NOT NULL,
                 sequence INTEGER NOT NULL,
                 description TEXT NOT NULL,
                 enabled INTEGER NOT NULL DEFAULT 1,
                 PRIMARY KEY (category, sequence)
             );

             CREATE TABLE IF NOT EXISTS outcome_descriptions (
                 category TEXT NOT NULL,
                 sequence INTEGER NOT NULL,
                 description TEXT NOT NULL,
                 enabled INTEGER NOT NULL DEFAULT 1,
                 PRIMARY KEY (category, sequence)
             );

             CREATE TABLE IF NOT EXISTS fish_species (
                 id INTEGER PRIMARY KEY,
                 name TEXT NOT NULL UNIQUE,
                 price_per_kg REAL NOT NULL,
                 rarity TEXT NOT NULL DEFAULT 'common',
                 minimum_similarity REAL NOT NULL DEFAULT 0.40,
                 min_length_cm REAL NOT NULL,
                 max_length_cm REAL NOT NULL,
                 min_weight_kg REAL NOT NULL,
                 max_weight_kg REAL NOT NULL,
                 price_source_url TEXT NOT NULL,
                 price_source_date TEXT NOT NULL,
                 enabled INTEGER NOT NULL DEFAULT 1
             );

             CREATE TABLE IF NOT EXISTS legendary_treasures (
                 id INTEGER PRIMARY KEY,
                 name TEXT NOT NULL UNIQUE,
                 description TEXT NOT NULL,
                 enabled INTEGER NOT NULL DEFAULT 1
             );

             CREATE TABLE IF NOT EXISTS treasure_discoveries (
                 treasure_id INTEGER PRIMARY KEY REFERENCES legendary_treasures(id),
                 discovered_at TEXT NOT NULL,
                 found_count INTEGER NOT NULL DEFAULT 1
             );

             CREATE TABLE IF NOT EXISTS bait_ingredients (
                 id INTEGER PRIMARY KEY,
                 name TEXT NOT NULL UNIQUE,
                 intensity REAL NOT NULL CHECK (intensity BETWEEN 0 AND 1),
                 color REAL NOT NULL CHECK (color BETWEEN 0 AND 1),
                 sweet REAL NOT NULL CHECK (sweet BETWEEN 0 AND 1),
                 sour REAL NOT NULL CHECK (sour BETWEEN 0 AND 1),
                 salty REAL NOT NULL CHECK (salty BETWEEN 0 AND 1),
                 enabled INTEGER NOT NULL DEFAULT 1
             );

             CREATE TABLE IF NOT EXISTS bait_recipes (
                 id INTEGER PRIMARY KEY,
                 name TEXT NOT NULL UNIQUE
             );

             CREATE TABLE IF NOT EXISTS bait_recipe_components (
                 recipe_id INTEGER NOT NULL REFERENCES bait_recipes(id),
                 ingredient_id INTEGER NOT NULL REFERENCES bait_ingredients(id),
                 percentage REAL NOT NULL CHECK (percentage > 0),
                 PRIMARY KEY (recipe_id, ingredient_id)
             );

             CREATE TABLE IF NOT EXISTS daily_fish_preferences (
                 local_date TEXT NOT NULL,
                 fish_species_id INTEGER NOT NULL REFERENCES fish_species(id),
                 intensity REAL NOT NULL CHECK (intensity BETWEEN 0 AND 1),
                 color REAL NOT NULL CHECK (color BETWEEN 0 AND 1),
                 sweet REAL NOT NULL CHECK (sweet BETWEEN 0 AND 1),
                 sour REAL NOT NULL CHECK (sour BETWEEN 0 AND 1),
                 salty REAL NOT NULL CHECK (salty BETWEEN 0 AND 1),
                 generation_version INTEGER NOT NULL DEFAULT 3,
                 source_components_json TEXT NOT NULL DEFAULT '[]',
                 PRIMARY KEY (local_date, fish_species_id)
             );

             CREATE TABLE IF NOT EXISTS round_results (
                 round_number INTEGER PRIMARY KEY,
                 round_started_at TEXT,
                 settled_at TEXT NOT NULL,
                 planned_duration_seconds INTEGER NOT NULL DEFAULT 0,
                 waiting_events_json TEXT NOT NULL DEFAULT '[]',
                 preference_date TEXT NOT NULL,
                 bait_name TEXT NOT NULL,
                 result_type TEXT NOT NULL,
                 fish_species_id INTEGER REFERENCES fish_species(id),
                 length_cm REAL,
                 weight_kg REAL,
                 value REAL,
                 similarity REAL NOT NULL,
                 description TEXT NOT NULL,
                 outcome_json TEXT NOT NULL,
                 disposition TEXT NOT NULL DEFAULT 'pending',
                 disposition_at TEXT,
                 gained_weight_kg REAL,
                 gained_money REAL
             );

             CREATE TABLE IF NOT EXISTS player_state (
                 id INTEGER PRIMARY KEY CHECK (id = 1),
                 body_weight_kg REAL NOT NULL DEFAULT 60,
                 poop_kg REAL NOT NULL DEFAULT 0,
                 poop_migrated INTEGER NOT NULL DEFAULT 1,
                 money REAL NOT NULL DEFAULT 0,
                 eaten_count INTEGER NOT NULL DEFAULT 0,
                 sold_count INTEGER NOT NULL DEFAULT 0,
                 updated_at TEXT NOT NULL
             );

             CREATE TABLE IF NOT EXISTS skin_unlocks (
                 skin_id TEXT PRIMARY KEY,
                 unlock_source TEXT NOT NULL,
                 unlocked_at TEXT NOT NULL
             );

             CREATE TABLE IF NOT EXISTS store_upgrades (
                 upgrade_id TEXT PRIMARY KEY,
                 purchased_at TEXT NOT NULL
             );

             CREATE TABLE IF NOT EXISTS app_settings (
                 id INTEGER PRIMARY KEY CHECK (id = 1),
                 notifications_enabled INTEGER NOT NULL DEFAULT 1,
                 bobber_visible INTEGER NOT NULL DEFAULT 1,
                 bobber_always_on_top INTEGER NOT NULL DEFAULT 1,
                 theme TEXT NOT NULL DEFAULT 'system',
                 reduced_motion INTEGER NOT NULL DEFAULT 0,
                 bobber_skin TEXT NOT NULL DEFAULT 'orange',
                 updated_at TEXT NOT NULL
             );",
        )?;
        Self::ensure_column(
            &connection,
            "fish_species",
            "rarity",
            "TEXT NOT NULL DEFAULT 'common'",
        )?;
        Self::ensure_column(
            &connection,
            "daily_fish_preferences",
            "source_components_json",
            "TEXT NOT NULL DEFAULT '[]'",
        )?;
        Self::ensure_column(
            &connection,
            "fish_species",
            "minimum_similarity",
            "REAL NOT NULL DEFAULT 0.40",
        )?;
        Self::ensure_column(
            &connection,
            "daily_fish_preferences",
            "generation_version",
            "INTEGER NOT NULL DEFAULT 1",
        )?;
        Self::ensure_column(
            &connection,
            "player_state",
            "poop_kg",
            "REAL NOT NULL DEFAULT 0",
        )?;
        Self::ensure_column(
            &connection,
            "player_state",
            "poop_migrated",
            "INTEGER NOT NULL DEFAULT 0",
        )?;
        connection.execute(
            "UPDATE player_state
             SET poop_kg = MAX(body_weight_kg - 60, 0), poop_migrated = 1
             WHERE poop_migrated = 0",
            [],
        )?;
        for (category, sequence, description) in event_description_seeds() {
            connection.execute(
                "INSERT INTO waiting_event_descriptions
                     (category, sequence, description, enabled)
                 VALUES (?1, ?2, ?3, 1)
                 ON CONFLICT(category, sequence) DO UPDATE SET
                     description = excluded.description",
                params![category, sequence, description],
            )?;
        }
        for (category, sequence, description) in outcome_description_seeds() {
            connection.execute(
                "INSERT OR IGNORE INTO outcome_descriptions
                     (category, sequence, description, enabled)
                 VALUES (?1, ?2, ?3, 1)",
                params![category, sequence, description],
            )?;
        }
        for treasure in legendary_treasure_seeds() {
            connection.execute(
                "INSERT INTO legendary_treasures (id, name, description, enabled)
                 VALUES (?1, ?2, ?3, 1)
                 ON CONFLICT(id) DO UPDATE SET
                     name = excluded.name,
                     description = excluded.description",
                params![treasure.id, treasure.name, treasure.description],
            )?;
        }
        for fish in fish_species_seeds() {
            let rarity = FishRarity::for_species(fish.id, fish.price_per_kg);
            connection.execute(
                "INSERT INTO fish_species (
                     id, name, price_per_kg, rarity, minimum_similarity,
                     min_length_cm, max_length_cm,
                     min_weight_kg, max_weight_kg, price_source_url,
                     price_source_date, enabled
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 1)
                 ON CONFLICT(id) DO UPDATE SET
                     name = excluded.name,
                     price_source_url = excluded.price_source_url,
                     price_source_date = excluded.price_source_date",
                params![
                    fish.id,
                    fish.name,
                    fish.price_per_kg,
                    rarity.storage_name(),
                    rarity.minimum_similarity(),
                    fish.min_length_cm,
                    fish.max_length_cm,
                    fish.min_weight_kg,
                    fish.max_weight_kg,
                    fish.price_source_url,
                    fish.price_source_date,
                ],
            )?;
        }
        connection.execute(
            "UPDATE fish_species
             SET price_per_kg = 1000
             WHERE id BETWEEN 41 AND 43 AND price_per_kg = 200",
            [],
        )?;
        for ingredient in bait_ingredient_seeds() {
            connection.execute(
                "INSERT INTO bait_ingredients (
                     id, name, intensity, color, sweet, sour, salty, enabled
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1)
                 ON CONFLICT(id) DO UPDATE SET
                     name = excluded.name,
                     intensity = excluded.intensity,
                     color = excluded.color,
                     sweet = excluded.sweet,
                     sour = excluded.sour,
                     salty = excluded.salty",
                params![
                    ingredient.id,
                    ingredient.name,
                    ingredient.flavor.intensity,
                    ingredient.flavor.color,
                    ingredient.flavor.sweet,
                    ingredient.flavor.sour,
                    ingredient.flavor.salty,
                ],
            )?;
        }
        connection.execute(
            "INSERT OR IGNORE INTO bait_recipes (id, name) VALUES (1, '综合试钓饵')",
            [],
        )?;
        for (ingredient_id, percentage) in [(1_i64, 40.0_f64), (2, 30.0), (3, 30.0)] {
            connection.execute(
                "INSERT INTO bait_recipe_components (recipe_id, ingredient_id, percentage)
                 VALUES (1, ?1, ?2)
                 ON CONFLICT(recipe_id, ingredient_id) DO UPDATE SET
                     percentage = excluded.percentage",
                params![ingredient_id, percentage],
            )?;
        }
        Self::ensure_column(&connection, "game_state", "round_started_at", "TEXT")?;
        Self::ensure_column(
            &connection,
            "game_state",
            "planned_duration_seconds",
            "INTEGER NOT NULL DEFAULT 0",
        )?;
        Self::ensure_column(
            &connection,
            "game_state",
            "status_text",
            "TEXT NOT NULL DEFAULT '浮标已经就位，正在慢慢等鱼。'",
        )?;
        Self::ensure_column(
            &connection,
            "game_state",
            "waiting_events_json",
            "TEXT NOT NULL DEFAULT '[]'",
        )?;
        Self::ensure_column(
            &connection,
            "game_state",
            "notified_events_json",
            "TEXT NOT NULL DEFAULT '[]'",
        )?;
        Self::ensure_column(
            &connection,
            "game_state",
            "selected_recipe_id",
            "INTEGER NOT NULL DEFAULT 1",
        )?;
        Self::ensure_column(&connection, "round_results", "round_started_at", "TEXT")?;
        Self::ensure_column(
            &connection,
            "round_results",
            "planned_duration_seconds",
            "INTEGER NOT NULL DEFAULT 0",
        )?;
        Self::ensure_column(
            &connection,
            "round_results",
            "waiting_events_json",
            "TEXT NOT NULL DEFAULT '[]'",
        )?;
        Self::ensure_column(
            &connection,
            "round_results",
            "disposition",
            "TEXT NOT NULL DEFAULT 'pending'",
        )?;
        Self::ensure_column(&connection, "round_results", "disposition_at", "TEXT")?;
        Self::ensure_column(&connection, "round_results", "gained_weight_kg", "REAL")?;
        Self::ensure_column(&connection, "round_results", "gained_money", "REAL")?;
        Self::ensure_column(
            &connection,
            "app_settings",
            "bobber_skin",
            "TEXT NOT NULL DEFAULT 'orange'",
        )?;
        connection.execute(
            "UPDATE round_results SET disposition = 'not_applicable'
             WHERE result_type != 'caught' AND disposition = 'pending'",
            [],
        )?;
        connection.execute(
            "INSERT OR IGNORE INTO player_state
                 (id, body_weight_kg, poop_kg, poop_migrated, money, eaten_count, sold_count, updated_at)
             VALUES (1, 60, 0, 1, 0, 0, 0, '1970-01-01T00:00:00Z')",
            [],
        )?;
        connection.execute(
            "INSERT OR IGNORE INTO skin_unlocks (skin_id, unlock_source, unlocked_at)
             VALUES ('orange', 'default', '1970-01-01T00:00:00Z')",
            [],
        )?;
        for (treasure_id, skin_id) in TREASURE_SKIN_REWARDS {
            connection.execute(
                "INSERT OR IGNORE INTO skin_unlocks (skin_id, unlock_source, unlocked_at)
                 SELECT ?2, 'mystery_achievement', discovered_at
                 FROM treasure_discoveries
                 WHERE treasure_id = ?1",
                params![treasure_id, skin_id],
            )?;
        }
        for (fish_id, skin_id) in SPECIAL_FISH_SKIN_REWARDS {
            connection.execute(
                "INSERT OR IGNORE INTO skin_unlocks (skin_id, unlock_source, unlocked_at)
                 SELECT ?2, 'special_fish_achievement', MIN(settled_at)
                 FROM round_results
                 WHERE result_type = 'caught' AND fish_species_id = ?1
                 HAVING COUNT(*) > 0",
                params![fish_id, skin_id],
            )?;
        }
        connection.execute(
            "INSERT OR IGNORE INTO app_settings (
                 id, notifications_enabled, bobber_visible,
                 bobber_always_on_top, theme, reduced_motion, bobber_skin, updated_at
             ) VALUES (1, 1, 1, 1, 'system', 0, 'orange', '1970-01-01T00:00:00Z')",
            [],
        )?;
        Ok(Self {
            connection: Mutex::new(connection),
            path: path.to_path_buf(),
        })
    }

    fn ensure_column(
        connection: &Connection,
        table_name: &str,
        column_name: &str,
        declaration: &str,
    ) -> rusqlite::Result<()> {
        let mut statement = connection.prepare(&format!("PRAGMA table_info({table_name})"))?;
        let names = statement.query_map([], |row| row.get::<_, String>(1))?;
        for name in names {
            if name? == column_name {
                return Ok(());
            }
        }
        connection.execute(
            &format!("ALTER TABLE {table_name} ADD COLUMN {column_name} {declaration}"),
            [],
        )?;
        Ok(())
    }

    pub fn load(&self) -> rusqlite::Result<Option<PersistedRoundState>> {
        let connection = self.connection.lock().expect("sqlite connection poisoned");
        connection
            .query_row(
                "SELECT phase, is_fishing, round_started_at, scheduled_end_time,
                        planned_duration_seconds, status_text, waiting_events_json,
                        notified_events_json, round_number,
                        selected_recipe_id, selected_recipe_name, last_result,
                        state_revision, stop_after_settlement
                 FROM game_state
                 WHERE id = 1",
                [],
                |row| {
                    Ok(PersistedRoundState {
                        phase: row.get(0)?,
                        is_fishing: row.get(1)?,
                        round_started_at: row.get(2)?,
                        scheduled_end_time: row.get(3)?,
                        planned_duration_seconds: row.get::<_, i64>(4)?.max(0) as u64,
                        status_text: row.get(5)?,
                        waiting_events_json: row.get(6)?,
                        notified_events_json: row.get(7)?,
                        round_number: row.get::<_, i64>(8)?.max(0) as u64,
                        selected_recipe_id: row.get::<_, i64>(9)?.max(1) as u64,
                        selected_recipe_name: row.get(10)?,
                        last_result: row.get(11)?,
                        state_revision: row.get::<_, i64>(12)?.max(0) as u64,
                        stop_after_settlement: row.get(13)?,
                    })
                },
            )
            .optional()
    }

    pub fn load_app_settings(&self) -> rusqlite::Result<StoredAppSettings> {
        let connection = self.connection.lock().expect("sqlite connection poisoned");
        connection.query_row(
            "SELECT notifications_enabled, bobber_visible,
                    bobber_always_on_top, theme, reduced_motion, bobber_skin
             FROM app_settings WHERE id = 1",
            [],
            |row| {
                Ok(StoredAppSettings {
                    notifications_enabled: row.get(0)?,
                    bobber_visible: row.get(1)?,
                    bobber_always_on_top: row.get(2)?,
                    theme: row.get(3)?,
                    reduced_motion: row.get(4)?,
                    bobber_skin: row.get(5)?,
                })
            },
        )
    }

    pub fn save_app_settings(
        &self,
        settings: &StoredAppSettings,
        updated_at: &str,
    ) -> rusqlite::Result<()> {
        let connection = self.connection.lock().expect("sqlite connection poisoned");
        connection.execute(
            "UPDATE app_settings
             SET notifications_enabled = ?1, bobber_visible = ?2,
                 bobber_always_on_top = ?3, theme = ?4,
                 reduced_motion = ?5, bobber_skin = ?6, updated_at = ?7
             WHERE id = 1",
            params![
                settings.notifications_enabled,
                settings.bobber_visible,
                settings.bobber_always_on_top,
                settings.theme,
                settings.reduced_motion,
                settings.bobber_skin,
                updated_at,
            ],
        )?;
        Ok(())
    }

    pub fn load_event_catalog(&self) -> rusqlite::Result<EventCatalog> {
        let connection = self.connection.lock().expect("sqlite connection poisoned");
        let mut statement = connection.prepare(
            "SELECT category, description
             FROM waiting_event_descriptions
             WHERE enabled = 1
             ORDER BY category, sequence",
        )?;
        let rows = statement.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?;
        let mut status = Vec::new();
        let mut ambient = Vec::new();
        let mut water = Vec::new();
        let mut tackle = Vec::new();
        let mut wildlife = Vec::new();
        let mut story = Vec::new();
        for row in rows {
            let (category, description) = row?;
            match category.as_str() {
                "status" => status.push(description),
                "environment" => ambient.push(description),
                "water" => water.push(description),
                "tackle" => tackle.push(description),
                "wildlife" => wildlife.push(description),
                "story" => story.push(description),
                _ => {}
            }
        }
        if status.is_empty()
            || ambient.is_empty()
            || water.is_empty()
            || tackle.is_empty()
            || wildlife.is_empty()
            || story.is_empty()
        {
            return Err(rusqlite::Error::InvalidQuery);
        }
        Ok(EventCatalog::new(
            status, ambient, water, tackle, wildlife, story,
        ))
    }

    pub fn load_outcome_text_catalog(&self) -> rusqlite::Result<OutcomeTextCatalog> {
        let connection = self.connection.lock().expect("sqlite connection poisoned");
        let mut statement = connection.prepare(
            "SELECT category, description
             FROM outcome_descriptions
             WHERE enabled = 1
             ORDER BY category, sequence",
        )?;
        let rows = statement.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?;
        let mut catches = Vec::new();
        let mut misses = Vec::new();
        let mut features = Vec::new();
        for row in rows {
            let (category, description) = row?;
            match category.as_str() {
                "caught" => catches.push(description),
                "missed" => misses.push(description),
                "feature" => features.push(description),
                _ => {}
            }
        }
        if catches.is_empty() || misses.is_empty() || features.is_empty() {
            return Err(rusqlite::Error::InvalidQuery);
        }
        Ok(OutcomeTextCatalog {
            catches,
            misses,
            features,
        })
    }

    pub fn load_bait_profile(&self, recipe_id: i64) -> rusqlite::Result<BaitProfile> {
        let connection = self.connection.lock().expect("sqlite connection poisoned");
        connection.query_row(
            "SELECT r.name,
                    SUM(i.intensity * c.percentage) / SUM(c.percentage),
                    SUM(i.color * c.percentage) / SUM(c.percentage),
                    SUM(i.sweet * c.percentage) / SUM(c.percentage),
                    SUM(i.sour * c.percentage) / SUM(c.percentage),
                    SUM(i.salty * c.percentage) / SUM(c.percentage)
             FROM bait_recipes r
             JOIN bait_recipe_components c ON c.recipe_id = r.id
             JOIN bait_ingredients i ON i.id = c.ingredient_id
             WHERE r.id = ?1 AND i.enabled = 1
             GROUP BY r.id, r.name",
            [recipe_id],
            |row| {
                Ok(BaitProfile {
                    name: row.get(0)?,
                    flavor: FlavorVector {
                        intensity: row.get(1)?,
                        color: row.get(2)?,
                        sweet: row.get(3)?,
                        sour: row.get(4)?,
                        salty: row.get(5)?,
                    },
                })
            },
        )
    }

    pub fn load_bait_ingredients(&self) -> rusqlite::Result<Vec<BaitIngredientInfo>> {
        let connection = self.connection.lock().expect("sqlite connection poisoned");
        let mut statement = connection.prepare(
            "SELECT id, name, intensity, color, sweet, sour, salty
             FROM bait_ingredients
             WHERE enabled = 1
             ORDER BY id",
        )?;
        statement
            .query_map([], |row| {
                Ok(BaitIngredientInfo {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    flavor: FlavorVector {
                        intensity: row.get(2)?,
                        color: row.get(3)?,
                        sweet: row.get(4)?,
                        sour: row.get(5)?,
                        salty: row.get(6)?,
                    },
                })
            })?
            .collect()
    }

    pub fn load_recipe_components(&self, recipe_id: i64) -> rusqlite::Result<Vec<(i64, f64)>> {
        let connection = self.connection.lock().expect("sqlite connection poisoned");
        let mut statement = connection.prepare(
            "SELECT ingredient_id, percentage
             FROM bait_recipe_components
             WHERE recipe_id = ?1
             ORDER BY ingredient_id",
        )?;
        statement
            .query_map([recipe_id], |row| Ok((row.get(0)?, row.get(1)?)))?
            .collect()
    }

    pub fn load_bait_recipes(&self) -> rusqlite::Result<Vec<(i64, String)>> {
        let connection = self.connection.lock().expect("sqlite connection poisoned");
        let mut statement = connection.prepare("SELECT id, name FROM bait_recipes ORDER BY id")?;
        statement
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
            .collect()
    }

    pub fn save_bait_recipe(
        &self,
        recipe_id: Option<i64>,
        name: &str,
        components: &[(i64, f64)],
    ) -> rusqlite::Result<(i64, BaitProfile)> {
        let target_id = {
            let mut connection = self.connection.lock().expect("sqlite connection poisoned");
            let transaction = connection.transaction()?;
            let target_id = match recipe_id.filter(|id| *id > 1) {
                Some(id) => {
                    if transaction.execute(
                        "UPDATE bait_recipes SET name = ?1 WHERE id = ?2",
                        params![name, id],
                    )? != 1
                    {
                        return Err(rusqlite::Error::QueryReturnedNoRows);
                    }
                    id
                }
                None => {
                    transaction.execute("INSERT INTO bait_recipes (name) VALUES (?1)", [name])?;
                    transaction.last_insert_rowid()
                }
            };
            transaction.execute(
                "DELETE FROM bait_recipe_components WHERE recipe_id = ?1",
                [target_id],
            )?;
            for (ingredient_id, percentage) in components {
                let inserted = transaction.execute(
                    "INSERT INTO bait_recipe_components
                         (recipe_id, ingredient_id, percentage)
                     SELECT ?1, id, ?3 FROM bait_ingredients
                     WHERE id = ?2 AND enabled = 1",
                    params![target_id, ingredient_id, percentage],
                )?;
                if inserted != 1 {
                    return Err(rusqlite::Error::QueryReturnedNoRows);
                }
            }
            transaction.commit()?;
            target_id
        };
        self.load_bait_profile(target_id)
            .map(|profile| (target_id, profile))
    }

    pub fn load_fish_records(&self) -> rusqlite::Result<Vec<FishRecord>> {
        let connection = self.connection.lock().expect("sqlite connection poisoned");
        let mut statement = connection.prepare(
            "SELECT f.id, f.name, f.price_per_kg, f.rarity,
                    COUNT(r.round_number), MAX(r.length_cm), MAX(r.weight_kg),
                    (
                        SELECT recent.description
                        FROM round_results recent
                        WHERE recent.fish_species_id = f.id
                          AND recent.result_type = 'caught'
                        ORDER BY recent.settled_at DESC
                        LIMIT 1
                    )
             FROM fish_species f
             LEFT JOIN round_results r
               ON r.fish_species_id = f.id AND r.result_type = 'caught'
             WHERE f.enabled = 1
             GROUP BY f.id, f.name, f.price_per_kg, f.rarity
             ORDER BY f.id",
        )?;
        statement
            .query_map([], |row| {
                Ok(FishRecord {
                    fish_id: row.get(0)?,
                    name: row.get(1)?,
                    price_per_kg: row.get(2)?,
                    rarity: FishRarity::from_storage(&row.get::<_, String>(3)?),
                    caught_count: row.get::<_, i64>(4)?.max(0) as u64,
                    max_length_cm: row.get(5)?,
                    max_weight_kg: row.get(6)?,
                    latest_description: row.get(7)?,
                })
            })?
            .collect()
    }

    pub fn load_treasure_records(&self) -> rusqlite::Result<Vec<TreasureRecord>> {
        let connection = self.connection.lock().expect("sqlite connection poisoned");
        let mut statement = connection.prepare(
            "SELECT t.id, t.name, t.description,
                    d.treasure_id IS NOT NULL, COALESCE(d.found_count, 0)
             FROM legendary_treasures t
             LEFT JOIN treasure_discoveries d ON d.treasure_id = t.id
             WHERE t.enabled = 1
             ORDER BY t.id",
        )?;
        statement
            .query_map([], |row| {
                let discovered: bool = row.get(3)?;
                Ok(TreasureRecord {
                    treasure_id: row.get(0)?,
                    discovered,
                    name: if discovered {
                        row.get(1)?
                    } else {
                        "？？？".to_owned()
                    },
                    description: if discovered {
                        row.get(2)?
                    } else {
                        "尚未发现".to_owned()
                    },
                    found_count: if discovered {
                        row.get::<_, i64>(4)?.max(0) as u64
                    } else {
                        0
                    },
                })
            })?
            .collect()
    }

    pub fn ensure_daily_preferences<R: Rng + ?Sized>(
        &self,
        local_date: &str,
        rng: &mut R,
    ) -> rusqlite::Result<()> {
        let mut connection = self.connection.lock().expect("sqlite connection poisoned");
        let fish_ids = {
            let mut statement =
                connection.prepare("SELECT id FROM fish_species WHERE enabled = 1 ORDER BY id")?;
            statement
                .query_map([], |row| row.get::<_, i64>(0))?
                .collect::<rusqlite::Result<Vec<_>>>()?
        };
        let ingredient_flavors = {
            let mut statement = connection.prepare(
                "SELECT id, intensity, color, sweet, sour, salty
                 FROM bait_ingredients
                 WHERE enabled = 1
                 ORDER BY id",
            )?;
            statement
                .query_map([], |row| {
                    Ok((
                        row.get(0)?,
                        FlavorVector {
                            intensity: row.get(1)?,
                            color: row.get(2)?,
                            sweet: row.get(3)?,
                            sour: row.get(4)?,
                            salty: row.get(5)?,
                        },
                    ))
                })?
                .collect::<rusqlite::Result<Vec<_>>>()?
        };
        let transaction = connection.transaction()?;
        transaction.execute(
            "DELETE FROM daily_fish_preferences
             WHERE local_date = ?1 AND generation_version < ?2",
            params![local_date, DAILY_PREFERENCE_GENERATION_VERSION],
        )?;
        for fish_id in fish_ids {
            let preference = generate_reachable_fish_preference(&ingredient_flavors, rng);
            let source_components_json = serde_json::to_string(&preference.components)
                .map_err(|error| rusqlite::Error::ToSqlConversionFailure(Box::new(error)))?;
            transaction.execute(
                "INSERT OR IGNORE INTO daily_fish_preferences (
                     local_date, fish_species_id, intensity, color, sweet, sour, salty,
                     generation_version, source_components_json
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![
                    local_date,
                    fish_id,
                    preference.flavor.intensity,
                    preference.flavor.color,
                    preference.flavor.sweet,
                    preference.flavor.sour,
                    preference.flavor.salty,
                    DAILY_PREFERENCE_GENERATION_VERSION,
                    source_components_json,
                ],
            )?;
        }
        transaction.commit()
    }

    pub fn load_fish_profiles(&self, local_date: &str) -> rusqlite::Result<Vec<FishProfile>> {
        let connection = self.connection.lock().expect("sqlite connection poisoned");
        let mut statement = connection.prepare(
            "SELECT f.id, f.name, f.price_per_kg, f.rarity, f.minimum_similarity,
                    f.min_length_cm, f.max_length_cm,
                    f.min_weight_kg, f.max_weight_kg,
                    p.intensity, p.color, p.sweet, p.sour, p.salty
             FROM fish_species f
             JOIN daily_fish_preferences p ON p.fish_species_id = f.id
             WHERE f.enabled = 1 AND p.local_date = ?1
             ORDER BY f.id",
        )?;
        statement
            .query_map([local_date], |row| {
                Ok(FishProfile {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    price_per_kg: row.get(2)?,
                    rarity: FishRarity::from_storage(&row.get::<_, String>(3)?),
                    minimum_similarity: row.get(4)?,
                    min_length_cm: row.get(5)?,
                    max_length_cm: row.get(6)?,
                    min_weight_kg: row.get(7)?,
                    max_weight_kg: row.get(8)?,
                    preference: FlavorVector {
                        intensity: row.get(9)?,
                        color: row.get(10)?,
                        sweet: row.get(11)?,
                        sour: row.get(12)?,
                        salty: row.get(13)?,
                    },
                })
            })?
            .collect()
    }

    pub fn save_round_outcome(
        &self,
        round_number: u64,
        round_started_at: Option<&str>,
        settled_at: &str,
        planned_duration_seconds: u64,
        waiting_events: &[WaitingEvent],
        preference_date: &str,
        bait_name: &str,
        outcome: &RoundOutcome,
    ) -> rusqlite::Result<()> {
        let (result_type, fish_id, length_cm, weight_kg, value, similarity, description) =
            match outcome {
                RoundOutcome::Caught {
                    fish_id,
                    length_cm,
                    weight_kg,
                    value,
                    similarity,
                    ..
                } => (
                    "caught",
                    Some(*fish_id),
                    Some(*length_cm),
                    Some(*weight_kg),
                    Some(*value),
                    *similarity,
                    outcome.summary(),
                ),
                RoundOutcome::Missed {
                    reason,
                    best_similarity,
                    ..
                } => (
                    "missed",
                    None,
                    None,
                    None,
                    None,
                    *best_similarity,
                    reason.clone(),
                ),
                RoundOutcome::TreasureFound {
                    best_similarity, ..
                } => (
                    "treasure",
                    None,
                    None,
                    None,
                    None,
                    *best_similarity,
                    outcome.summary(),
                ),
            };
        let outcome_json = serde_json::to_string(outcome)
            .map_err(|error| rusqlite::Error::ToSqlConversionFailure(Box::new(error)))?;
        let waiting_events_json = serde_json::to_string(waiting_events)
            .map_err(|error| rusqlite::Error::ToSqlConversionFailure(Box::new(error)))?;
        let disposition = if matches!(outcome, RoundOutcome::Caught { .. }) {
            "pending"
        } else {
            "not_applicable"
        };
        let mut connection = self.connection.lock().expect("sqlite connection poisoned");
        let transaction = connection.transaction()?;
        transaction.execute(
            "INSERT OR REPLACE INTO round_results (
                 round_number, round_started_at, settled_at, planned_duration_seconds,
                 waiting_events_json, preference_date, bait_name, result_type,
                 fish_species_id, length_cm, weight_kg, value, similarity,
                 description, outcome_json, disposition
             ) VALUES (
                 ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9,
                 ?10, ?11, ?12, ?13, ?14, ?15, ?16
             )",
            params![
                round_number.min(i64::MAX as u64) as i64,
                round_started_at,
                settled_at,
                planned_duration_seconds.min(i64::MAX as u64) as i64,
                waiting_events_json,
                preference_date,
                bait_name,
                result_type,
                fish_id,
                length_cm,
                weight_kg,
                value,
                similarity,
                description,
                outcome_json,
                disposition,
            ],
        )?;
        if let RoundOutcome::Caught { fish_id, .. } = outcome
            && let Some(skin_id) = special_fish_reward_skin_id(*fish_id)
        {
            transaction.execute(
                "INSERT OR IGNORE INTO skin_unlocks (skin_id, unlock_source, unlocked_at)
                 VALUES (?1, 'special_fish_achievement', ?2)",
                params![skin_id, settled_at],
            )?;
        }
        if let RoundOutcome::TreasureFound { treasure_id, .. } = outcome {
            transaction.execute(
                "INSERT INTO treasure_discoveries (treasure_id, discovered_at, found_count)
                 VALUES (?1, ?2, 1)
                 ON CONFLICT(treasure_id) DO UPDATE SET
                     found_count = treasure_discoveries.found_count + 1",
                params![treasure_id, settled_at],
            )?;
            if let Some(skin_id) = treasure_reward_skin_id(*treasure_id) {
                transaction.execute(
                    "INSERT OR IGNORE INTO skin_unlocks (skin_id, unlock_source, unlocked_at)
                     VALUES (?1, 'mystery_achievement', ?2)",
                    params![skin_id, settled_at],
                )?;
            }
        }
        transaction.commit()
    }

    pub fn load_player_summary(&self) -> rusqlite::Result<PlayerSummary> {
        let connection = self.connection.lock().expect("sqlite connection poisoned");
        connection.query_row(
            "SELECT p.poop_kg, p.money,
                    (SELECT COUNT(*) FROM round_results WHERE disposition = 'pending'),
                    p.eaten_count, p.sold_count
             FROM player_state p
             WHERE p.id = 1",
            [],
            |row| {
                Ok(PlayerSummary {
                    poop_kg: row.get(0)?,
                    money: row.get(1)?,
                    pending_catches: row.get::<_, i64>(2)?.max(0) as u64,
                    eaten_count: row.get::<_, i64>(3)?.max(0) as u64,
                    sold_count: row.get::<_, i64>(4)?.max(0) as u64,
                })
            },
        )
    }

    pub fn load_admin_fish_records(
        &self,
        local_date: &str,
    ) -> rusqlite::Result<Vec<AdminFishRecord>> {
        let connection = self.connection.lock().expect("sqlite connection poisoned");
        let ingredient_names: HashMap<i64, String> = {
            let mut ingredient_statement =
                connection.prepare("SELECT id, name FROM bait_ingredients ORDER BY id")?;
            ingredient_statement
                .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
                .collect::<rusqlite::Result<HashMap<_, _>>>()?
        };
        let mut statement = connection.prepare(
            "SELECT f.id, f.name, f.price_per_kg, f.rarity, f.minimum_similarity,
                    f.min_length_cm, f.max_length_cm, f.min_weight_kg, f.max_weight_kg,
                    COALESCE(p.intensity, 0), COALESCE(p.color, 0), COALESCE(p.sweet, 0),
                    COALESCE(p.sour, 0), COALESCE(p.salty, 0),
                    COALESCE(p.source_components_json, '[]'), f.enabled
             FROM fish_species f
             LEFT JOIN daily_fish_preferences p
               ON p.fish_species_id = f.id AND p.local_date = ?1
             ORDER BY f.id",
        )?;
        statement
            .query_map([local_date], |row| {
                let source_json: String = row.get(14)?;
                let preference_sources =
                    serde_json::from_str::<Vec<PreferenceSourceComponent>>(&source_json)
                        .unwrap_or_default()
                        .into_iter()
                        .map(|source| AdminPreferenceSource {
                            ingredient_id: source.ingredient_id,
                            ingredient_name: ingredient_names
                                .get(&source.ingredient_id)
                                .cloned()
                                .unwrap_or_else(|| format!("未知鱼饵 #{}", source.ingredient_id)),
                            percentage: source.percentage,
                        })
                        .collect();
                Ok(AdminFishRecord {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    price_per_kg: row.get(2)?,
                    rarity: FishRarity::from_storage(&row.get::<_, String>(3)?),
                    minimum_similarity: row.get(4)?,
                    min_length_cm: row.get(5)?,
                    max_length_cm: row.get(6)?,
                    min_weight_kg: row.get(7)?,
                    max_weight_kg: row.get(8)?,
                    preference: FlavorVector {
                        intensity: row.get(9)?,
                        color: row.get(10)?,
                        sweet: row.get(11)?,
                        sour: row.get(12)?,
                        salty: row.get(13)?,
                    },
                    preference_sources,
                    similarity: 0.0,
                    catch_probability: 0.0,
                    enabled: row.get::<_, i64>(15)? != 0,
                })
            })?
            .collect()
    }

    pub fn update_admin_money(&self, money: f64, updated_at: &str) -> rusqlite::Result<()> {
        let connection = self.connection.lock().expect("sqlite connection poisoned");
        connection.execute(
            "UPDATE player_state SET money = ?1, updated_at = ?2 WHERE id = 1",
            params![money, updated_at],
        )?;
        Ok(())
    }

    pub fn create_admin_backup(&self, file_stem: &str) -> Result<PathBuf, String> {
        if self.path == Path::new(":memory:") {
            return Err("内存数据库不能创建持久备份".to_owned());
        }
        let backup_dir = self
            .path
            .parent()
            .ok_or("数据库目录不可用")?
            .join("admin-backups");
        fs::create_dir_all(&backup_dir).map_err(|error| error.to_string())?;
        let backup_path = backup_dir.join(format!("{file_stem}.sqlite3"));
        let backup_value = backup_path.to_string_lossy().into_owned();
        let connection = self.connection.lock().expect("sqlite connection poisoned");
        connection
            .execute("VACUUM INTO ?1", [backup_value])
            .map_err(|error| error.to_string())?;
        Ok(backup_path)
    }

    pub fn load_owned_skin_ids(&self) -> rusqlite::Result<Vec<String>> {
        let connection = self.connection.lock().expect("sqlite connection poisoned");
        let mut statement =
            connection.prepare("SELECT skin_id FROM skin_unlocks ORDER BY unlocked_at, skin_id")?;
        statement
            .query_map([], |row| row.get(0))?
            .collect::<rusqlite::Result<Vec<_>>>()
    }

    pub fn is_skin_owned(&self, skin_id: &str) -> rusqlite::Result<bool> {
        let connection = self.connection.lock().expect("sqlite connection poisoned");
        connection
            .query_row(
                "SELECT 1 FROM skin_unlocks WHERE skin_id = ?1",
                [skin_id],
                |_| Ok(()),
            )
            .optional()
            .map(|value| value.is_some())
    }

    pub fn load_owned_upgrade_ids(&self) -> rusqlite::Result<Vec<String>> {
        let connection = self.connection.lock().expect("sqlite connection poisoned");
        let mut statement = connection
            .prepare("SELECT upgrade_id FROM store_upgrades ORDER BY purchased_at, upgrade_id")?;
        statement
            .query_map([], |row| row.get(0))?
            .collect::<rusqlite::Result<Vec<_>>>()
    }

    pub fn is_upgrade_owned(&self, upgrade_id: &str) -> rusqlite::Result<bool> {
        let connection = self.connection.lock().expect("sqlite connection poisoned");
        connection
            .query_row(
                "SELECT 1 FROM store_upgrades WHERE upgrade_id = ?1",
                [upgrade_id],
                |_| Ok(()),
            )
            .optional()
            .map(|value| value.is_some())
    }

    pub fn purchase_skin(
        &self,
        skin_id: &str,
        price: f64,
        unlocked_at: &str,
    ) -> rusqlite::Result<()> {
        let mut connection = self.connection.lock().expect("sqlite connection poisoned");
        let transaction = connection.transaction()?;
        let already_owned = transaction
            .query_row(
                "SELECT 1 FROM skin_unlocks WHERE skin_id = ?1",
                [skin_id],
                |_| Ok(()),
            )
            .optional()?
            .is_some();
        if already_owned {
            return Err(rusqlite::Error::InvalidQuery);
        }
        let changed = transaction.execute(
            "UPDATE player_state
             SET money = money - ?1, updated_at = ?2
             WHERE id = 1 AND money >= ?1",
            params![price.max(0.0), unlocked_at],
        )?;
        if changed != 1 {
            return Err(rusqlite::Error::QueryReturnedNoRows);
        }
        transaction.execute(
            "INSERT INTO skin_unlocks (skin_id, unlock_source, unlocked_at)
             VALUES (?1, 'shop', ?2)",
            params![skin_id, unlocked_at],
        )?;
        transaction.commit()
    }

    pub fn purchase_upgrade(
        &self,
        upgrade_id: &str,
        price: f64,
        purchased_at: &str,
    ) -> rusqlite::Result<()> {
        let mut connection = self.connection.lock().expect("sqlite connection poisoned");
        let transaction = connection.transaction()?;
        let already_owned = transaction
            .query_row(
                "SELECT 1 FROM store_upgrades WHERE upgrade_id = ?1",
                [upgrade_id],
                |_| Ok(()),
            )
            .optional()?
            .is_some();
        if already_owned {
            return Err(rusqlite::Error::InvalidQuery);
        }
        let changed = transaction.execute(
            "UPDATE player_state
             SET money = money - ?1, updated_at = ?2
             WHERE id = 1 AND money >= ?1",
            params![price.max(0.0), purchased_at],
        )?;
        if changed != 1 {
            return Err(rusqlite::Error::QueryReturnedNoRows);
        }
        transaction.execute(
            "INSERT INTO store_upgrades (upgrade_id, purchased_at) VALUES (?1, ?2)",
            params![upgrade_id, purchased_at],
        )?;
        transaction.commit()
    }

    pub fn claim_poop_skin(
        &self,
        skin_id: &str,
        required_poop_kg: f64,
        unlocked_at: &str,
    ) -> rusqlite::Result<()> {
        let mut connection = self.connection.lock().expect("sqlite connection poisoned");
        let transaction = connection.transaction()?;
        let already_owned = transaction
            .query_row(
                "SELECT 1 FROM skin_unlocks WHERE skin_id = ?1",
                [skin_id],
                |_| Ok(()),
            )
            .optional()?
            .is_some();
        if already_owned {
            return Err(rusqlite::Error::InvalidQuery);
        }
        let eligible = transaction.query_row(
            "SELECT poop_kg >= ?1 FROM player_state WHERE id = 1",
            [required_poop_kg.max(0.0)],
            |row| row.get::<_, bool>(0),
        )?;
        if !eligible {
            return Err(rusqlite::Error::QueryReturnedNoRows);
        }
        transaction.execute(
            "INSERT INTO skin_unlocks (skin_id, unlock_source, unlocked_at)
             VALUES (?1, 'achievement', ?2)",
            params![skin_id, unlocked_at],
        )?;
        transaction.commit()
    }

    pub fn load_fishing_log(&self, limit: u32) -> rusqlite::Result<Vec<FishingLogEntry>> {
        let connection = self.connection.lock().expect("sqlite connection poisoned");
        let mut statement = connection.prepare(
            "SELECT r.round_number, r.round_started_at, r.settled_at,
                    r.planned_duration_seconds, r.waiting_events_json, r.bait_name,
                    r.result_type, r.fish_species_id, f.name, r.length_cm,
                    r.weight_kg, r.value, r.description, r.disposition,
                    r.disposition_at, r.gained_weight_kg, r.gained_money,
                    f.rarity
             FROM round_results r
             LEFT JOIN fish_species f ON f.id = r.fish_species_id
             ORDER BY r.round_number DESC
             LIMIT ?1",
        )?;
        statement
            .query_map([limit.clamp(1, 200)], |row| {
                let waiting_events_json: String = row.get(4)?;
                Ok(FishingLogEntry {
                    round_number: row.get::<_, i64>(0)?.max(0) as u64,
                    round_started_at: row.get(1)?,
                    settled_at: row.get(2)?,
                    planned_duration_seconds: row.get::<_, i64>(3)?.max(0) as u64,
                    waiting_events: serde_json::from_str(&waiting_events_json).unwrap_or_default(),
                    bait_name: row.get(5)?,
                    result_type: row.get(6)?,
                    fish_id: row.get(7)?,
                    fish_name: row.get(8)?,
                    fish_rarity: row
                        .get::<_, Option<String>>(17)?
                        .map(|value| FishRarity::from_storage(&value)),
                    length_cm: row.get(9)?,
                    weight_kg: row.get(10)?,
                    value: row.get(11)?,
                    description: row.get(12)?,
                    disposition: row.get(13)?,
                    disposition_at: row.get(14)?,
                    gained_poop_kg: row.get(15)?,
                    gained_money: row.get(16)?,
                })
            })?
            .collect()
    }

    pub fn load_pending_catches(&self) -> rusqlite::Result<Vec<FishingLogEntry>> {
        let connection = self.connection.lock().expect("sqlite connection poisoned");
        let mut statement = connection.prepare(
            "SELECT r.round_number, r.round_started_at, r.settled_at,
                    r.planned_duration_seconds, r.waiting_events_json, r.bait_name,
                    r.result_type, r.fish_species_id, f.name, r.length_cm,
                    r.weight_kg, r.value, r.description, r.disposition,
                    r.disposition_at, r.gained_weight_kg, r.gained_money,
                    f.rarity
             FROM round_results r
             LEFT JOIN fish_species f ON f.id = r.fish_species_id
             WHERE r.result_type = 'caught' AND r.disposition = 'pending'
             ORDER BY r.round_number DESC",
        )?;
        statement
            .query_map([], |row| {
                let waiting_events_json: String = row.get(4)?;
                Ok(FishingLogEntry {
                    round_number: row.get::<_, i64>(0)?.max(0) as u64,
                    round_started_at: row.get(1)?,
                    settled_at: row.get(2)?,
                    planned_duration_seconds: row.get::<_, i64>(3)?.max(0) as u64,
                    waiting_events: serde_json::from_str(&waiting_events_json).unwrap_or_default(),
                    bait_name: row.get(5)?,
                    result_type: row.get(6)?,
                    fish_id: row.get(7)?,
                    fish_name: row.get(8)?,
                    fish_rarity: row
                        .get::<_, Option<String>>(17)?
                        .map(|value| FishRarity::from_storage(&value)),
                    length_cm: row.get(9)?,
                    weight_kg: row.get(10)?,
                    value: row.get(11)?,
                    description: row.get(12)?,
                    disposition: row.get(13)?,
                    disposition_at: row.get(14)?,
                    gained_poop_kg: row.get(15)?,
                    gained_money: row.get(16)?,
                })
            })?
            .collect()
    }

    pub fn handle_catch(
        &self,
        round_number: u64,
        action: &str,
        eaten_ratio: f64,
        handled_at: &str,
    ) -> rusqlite::Result<PlayerSummary> {
        let mut connection = self.connection.lock().expect("sqlite connection poisoned");
        let transaction = connection.transaction()?;
        let (weight_kg, value): (f64, f64) = transaction.query_row(
            "SELECT weight_kg, value
             FROM round_results
             WHERE round_number = ?1 AND result_type = 'caught' AND disposition = 'pending'",
            [round_number.min(i64::MAX as u64) as i64],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )?;
        let (gained_poop, gained_money, eaten_delta, sold_delta) = match action {
            "eat" => (weight_kg * eaten_ratio.clamp(0.0, 0.8), 0.0, 1, 0),
            "sell" => (0.0, value.max(0.0), 0, 1),
            _ => return Err(rusqlite::Error::InvalidQuery),
        };
        let disposition = if action == "eat" { "eaten" } else { "sold" };
        let changed = transaction.execute(
            "UPDATE round_results
             SET disposition = ?1, disposition_at = ?2,
                 gained_weight_kg = ?3, gained_money = ?4
             WHERE round_number = ?5 AND disposition = 'pending'",
            params![
                disposition,
                handled_at,
                gained_poop,
                gained_money,
                round_number.min(i64::MAX as u64) as i64,
            ],
        )?;
        if changed != 1 {
            return Err(rusqlite::Error::QueryReturnedNoRows);
        }
        transaction.execute(
            "UPDATE player_state
             SET poop_kg = poop_kg + ?1,
                 money = money + ?2,
                 eaten_count = eaten_count + ?3,
                 sold_count = sold_count + ?4,
                 updated_at = ?5
             WHERE id = 1",
            params![
                gained_poop,
                gained_money,
                eaten_delta,
                sold_delta,
                handled_at
            ],
        )?;
        transaction.commit()?;
        drop(connection);
        self.load_player_summary()
    }

    pub fn save(&self, state: &PersistedRoundState, updated_at: &str) -> rusqlite::Result<()> {
        let connection = self.connection.lock().expect("sqlite connection poisoned");
        connection.execute(
            "INSERT INTO game_state (
                 id, phase, is_fishing, round_started_at, scheduled_end_time,
                 planned_duration_seconds, status_text, waiting_events_json, notified_events_json, round_number,
                 selected_recipe_id, selected_recipe_name, last_result,
                 state_revision, stop_after_settlement, updated_at
             ) VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
             ON CONFLICT(id) DO UPDATE SET
                 phase = excluded.phase,
                 is_fishing = excluded.is_fishing,
                 round_started_at = excluded.round_started_at,
                 scheduled_end_time = excluded.scheduled_end_time,
                 planned_duration_seconds = excluded.planned_duration_seconds,
                 status_text = excluded.status_text,
                 waiting_events_json = excluded.waiting_events_json,
                 notified_events_json = excluded.notified_events_json,
                 round_number = excluded.round_number,
                 selected_recipe_id = excluded.selected_recipe_id,
                 selected_recipe_name = excluded.selected_recipe_name,
                 last_result = excluded.last_result,
                 state_revision = excluded.state_revision,
                 stop_after_settlement = excluded.stop_after_settlement,
                 updated_at = excluded.updated_at",
            params![
                state.phase,
                state.is_fishing,
                state.round_started_at,
                state.scheduled_end_time,
                state.planned_duration_seconds.min(i64::MAX as u64) as i64,
                state.status_text,
                state.waiting_events_json,
                state.notified_events_json,
                state.round_number.min(i64::MAX as u64) as i64,
                state.selected_recipe_id.min(i64::MAX as u64) as i64,
                state.selected_recipe_name,
                state.last_result,
                state.state_revision.min(i64::MAX as u64) as i64,
                state.stop_after_settlement,
                updated_at,
            ],
        )?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rand::{SeedableRng, rngs::StdRng};

    #[test]
    fn generated_fish_preferences_stay_within_bait_reachable_ranges() {
        let ingredients: Vec<(i64, FlavorVector)> = bait_ingredient_seeds()
            .into_iter()
            .map(|ingredient| (ingredient.id, ingredient.flavor))
            .collect();
        let maxima = ingredients
            .iter()
            .fold([0.0_f64; 5], |mut values, (_, flavor)| {
                values[0] = values[0].max(flavor.intensity);
                values[1] = values[1].max(flavor.color);
                values[2] = values[2].max(flavor.sweet);
                values[3] = values[3].max(flavor.sour);
                values[4] = values[4].max(flavor.salty);
                values
            });
        let mut rng = StdRng::seed_from_u64(2026);

        for _ in 0..2_000 {
            let preference = generate_reachable_fish_preference(&ingredients, &mut rng);
            for (value, maximum) in [
                preference.flavor.intensity,
                preference.flavor.color,
                preference.flavor.sweet,
                preference.flavor.sour,
                preference.flavor.salty,
            ]
            .into_iter()
            .zip(maxima)
            {
                assert!(value >= -f64::EPSILON && value <= maximum + f64::EPSILON * 8.0);
                assert!(value < 1.0);
            }
            assert!((1..=3).contains(&preference.components.len()));
            assert!(
                (preference
                    .components
                    .iter()
                    .map(|item| item.percentage)
                    .sum::<f64>()
                    - 100.0)
                    .abs()
                    < 0.000_001
            );
            let unique_ids: std::collections::HashSet<_> = preference
                .components
                .iter()
                .map(|item| item.ingredient_id)
                .collect();
            assert_eq!(unique_ids.len(), preference.components.len());
        }
    }

    #[test]
    fn legacy_preferences_are_regenerated_once_with_the_reachable_model() {
        let database_path = std::env::temp_dir().join(format!(
            "little-fishing-preference-migration-{}-{}.sqlite3",
            std::process::id(),
            rand::random::<u64>()
        ));
        {
            let store =
                SqliteStore::open(&database_path).expect("open preference migration database");
            store
                .connection
                .lock()
                .expect("sqlite connection")
                .execute(
                    "INSERT OR REPLACE INTO daily_fish_preferences (
                         local_date, fish_species_id, intensity, color, sweet, sour, salty,
                         generation_version
                     ) VALUES ('2026-08-26', 1, 1, 1, 1, 1, 1, 1)",
                    [],
                )
                .expect("insert legacy preference");

            let mut rng = StdRng::seed_from_u64(77);
            store
                .ensure_daily_preferences("2026-08-26", &mut rng)
                .expect("regenerate legacy preferences");
            let (version, intensity, color, sweet, sour, salty, source_json): (
                i64,
                f64,
                f64,
                f64,
                f64,
                f64,
                String,
            ) = store
                .connection
                .lock()
                .expect("sqlite connection")
                .query_row(
                    "SELECT generation_version, intensity, color, sweet, sour, salty,
                                source_components_json
                         FROM daily_fish_preferences
                         WHERE local_date = '2026-08-26' AND fish_species_id = 1",
                    [],
                    |row| {
                        Ok((
                            row.get(0)?,
                            row.get(1)?,
                            row.get(2)?,
                            row.get(3)?,
                            row.get(4)?,
                            row.get(5)?,
                            row.get(6)?,
                        ))
                    },
                )
                .expect("load regenerated preference");

            assert_eq!(version, DAILY_PREFERENCE_GENERATION_VERSION);
            assert!(
                [intensity, color, sweet, sour, salty]
                    .into_iter()
                    .all(|value| value < 1.0)
            );
            let sources: Vec<PreferenceSourceComponent> =
                serde_json::from_str(&source_json).expect("parse preference sources");
            assert!(!sources.is_empty());
        }
        std::fs::remove_file(database_path).expect("remove preference migration database");
    }

    #[test]
    fn legacy_special_fish_prices_are_migrated_to_one_thousand() {
        let database_path = std::env::temp_dir().join(format!(
            "little-fishing-special-price-migration-{}-{}.sqlite3",
            std::process::id(),
            rand::random::<u64>()
        ));
        {
            let store = SqliteStore::open(&database_path).expect("open special price database");
            store
                .connection
                .lock()
                .expect("sqlite connection")
                .execute(
                    "UPDATE fish_species SET price_per_kg = 200 WHERE id BETWEEN 41 AND 43",
                    [],
                )
                .expect("restore legacy special prices");
        }
        {
            let store = SqliteStore::open(&database_path).expect("reopen special price database");
            let special_fish: Vec<FishRecord> = store
                .load_fish_records()
                .expect("load migrated fish records")
                .into_iter()
                .filter(|fish| fish.rarity == FishRarity::Special)
                .collect();
            assert_eq!(special_fish.len(), 3);
            assert!(special_fish.iter().all(|fish| fish.price_per_kg == 1_000.0));
        }
        std::fs::remove_file(database_path).expect("remove special price migration database");
    }

    #[test]
    fn legacy_body_weight_growth_migrates_to_poop_output_once() {
        let database_path = std::env::temp_dir().join(format!(
            "little-fishing-poop-migration-{}-{}.sqlite3",
            std::process::id(),
            rand::random::<u64>()
        ));
        {
            let connection =
                Connection::open(&database_path).expect("create legacy player database");
            connection
                .execute_batch(
                    "CREATE TABLE player_state (
                         id INTEGER PRIMARY KEY CHECK (id = 1),
                         body_weight_kg REAL NOT NULL DEFAULT 60,
                         money REAL NOT NULL DEFAULT 0,
                         eaten_count INTEGER NOT NULL DEFAULT 0,
                         sold_count INTEGER NOT NULL DEFAULT 0,
                         updated_at TEXT NOT NULL
                     );
                     INSERT INTO player_state
                         (id, body_weight_kg, money, eaten_count, sold_count, updated_at)
                     VALUES (1, 73.5, 1234, 7, 2, '2026-08-26T08:00:00Z');",
                )
                .expect("seed legacy player state");
        }
        {
            let store = SqliteStore::open(&database_path).expect("migrate legacy body weight");
            let player = store.load_player_summary().expect("load migrated player");
            assert!((player.poop_kg - 13.5).abs() < 0.000_001);
            assert_eq!(player.money, 1_234.0);
            assert_eq!(player.eaten_count, 7);
            assert_eq!(player.sold_count, 2);
        }
        {
            let reopened =
                SqliteStore::open(&database_path).expect("reopen migrated player database");
            let player = reopened
                .load_player_summary()
                .expect("reload migrated player");
            assert!((player.poop_kg - 13.5).abs() < 0.000_001);
        }
        std::fs::remove_file(database_path).expect("remove poop migration database");
    }

    #[test]
    fn previous_database_gains_status_and_expanded_event_catalog() {
        let database_path = std::env::temp_dir().join(format!(
            "little-fishing-migration-{}-{}.sqlite3",
            std::process::id(),
            rand::random::<u64>()
        ));
        {
            let connection = Connection::open(&database_path).expect("create previous database");
            connection
                .execute_batch(
                    "CREATE TABLE game_state (
                         id INTEGER PRIMARY KEY CHECK (id = 1), phase TEXT NOT NULL,
                         is_fishing INTEGER NOT NULL, round_started_at TEXT,
                         scheduled_end_time TEXT, planned_duration_seconds INTEGER NOT NULL DEFAULT 0,
                         waiting_events_json TEXT NOT NULL DEFAULT '[]',
                         notified_events_json TEXT NOT NULL DEFAULT '[]', round_number INTEGER NOT NULL,
                         selected_recipe_id INTEGER NOT NULL DEFAULT 1, selected_recipe_name TEXT,
                         last_result TEXT, state_revision INTEGER NOT NULL,
                         stop_after_settlement INTEGER NOT NULL, updated_at TEXT NOT NULL
                     );
                     INSERT INTO game_state VALUES (
                         1, 'waiting', 1, '2026-08-18T08:00:00Z', '2026-08-18T08:15:00Z',
                         900, '[]', '[]', 3, 1, '综合试钓饵', NULL, 1, 0, '2026-08-18T08:00:00Z'
                     );
                     CREATE TABLE waiting_event_descriptions (
                         category TEXT NOT NULL, sequence INTEGER NOT NULL,
                         description TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1,
                         PRIMARY KEY (category, sequence)
                     );
                     INSERT INTO waiting_event_descriptions VALUES ('tackle', 1, '旧版钓组文案', 1);
                     CREATE TABLE app_settings (
                         id INTEGER PRIMARY KEY CHECK (id = 1),
                         notifications_enabled INTEGER NOT NULL DEFAULT 1,
                         bobber_visible INTEGER NOT NULL DEFAULT 1,
                         bobber_always_on_top INTEGER NOT NULL DEFAULT 1,
                         theme TEXT NOT NULL DEFAULT 'system',
                         reduced_motion INTEGER NOT NULL DEFAULT 0,
                         updated_at TEXT NOT NULL
                     );
                     INSERT INTO app_settings VALUES (
                         1, 1, 1, 1, 'system', 0, '2026-08-18T08:00:00Z'
                     );",
                )
                .expect("seed previous schema");
        }

        let store = SqliteStore::open(&database_path).expect("migrate previous database");
        let state = store
            .load()
            .expect("load migrated state")
            .expect("state row");
        let catalog = store.load_event_catalog().expect("load expanded events");
        let settings = store.load_app_settings().expect("load migrated settings");
        assert_eq!(state.status_text, "浮标已经就位，正在慢慢等鱼。");
        assert_eq!(catalog.counts(), (30, 30, 30, 30, 30, 30));
        assert_eq!(settings.bobber_skin, "orange");
        drop(store);
        std::fs::remove_file(database_path).expect("remove migration test database");
    }

    #[test]
    fn round_state_survives_a_sqlite_round_trip() {
        let store = SqliteStore::open(Path::new(":memory:")).expect("open in-memory database");
        let expected = PersistedRoundState {
            phase: "waiting".to_owned(),
            is_fishing: true,
            round_started_at: Some("2026-08-18T07:52:30Z".to_owned()),
            scheduled_end_time: Some("2026-08-18T08:00:00Z".to_owned()),
            planned_duration_seconds: 450,
            status_text: "浮标已经站稳。".to_owned(),
            waiting_events_json: "[]".to_owned(),
            notified_events_json: "[1,2]".to_owned(),
            round_number: 42,
            selected_recipe_id: 1,
            selected_recipe_name: Some("随手拌的甜饵".to_owned()),
            last_result: Some("水面很安静。".to_owned()),
            state_revision: 7,
            stop_after_settlement: false,
        };

        store
            .save(&expected, "2026-08-18T07:52:30Z")
            .expect("save state");
        let actual = store.load().expect("load state").expect("saved row");
        let catalog = store.load_event_catalog().expect("load event catalog");
        let outcome_catalog = store
            .load_outcome_text_catalog()
            .expect("load outcome catalog");
        let bait = store.load_bait_profile(1).expect("load default bait");
        let mut first_rng = StdRng::seed_from_u64(10);
        store
            .ensure_daily_preferences("2026-08-18", &mut first_rng)
            .expect("create daily preferences");
        let first_preferences = store
            .load_fish_profiles("2026-08-18")
            .expect("load first preferences");
        let mut second_rng = StdRng::seed_from_u64(99);
        store
            .ensure_daily_preferences("2026-08-18", &mut second_rng)
            .expect("keep existing daily preferences");
        let second_preferences = store
            .load_fish_profiles("2026-08-18")
            .expect("load stable preferences");
        let admin_records = store
            .load_admin_fish_records("2026-08-18")
            .expect("load preference sources for admin");
        let test_outcome = RoundOutcome::Missed {
            reason: "测试空军".to_owned(),
            best_similarity: 0.7,
            below_similarity_threshold: false,
        };
        store
            .save_round_outcome(
                42,
                Some("2026-08-18T07:52:30Z"),
                "2026-08-18T08:00:00Z",
                450,
                &[],
                "2026-08-18",
                &bait.name,
                &test_outcome,
            )
            .expect("save round outcome");
        let result_count: i64 = store
            .connection
            .lock()
            .expect("sqlite connection")
            .query_row("SELECT COUNT(*) FROM round_results", [], |row| row.get(0))
            .expect("count round results");

        assert_eq!(actual.phase, expected.phase);
        assert_eq!(actual.is_fishing, expected.is_fishing);
        assert_eq!(actual.round_started_at, expected.round_started_at);
        assert_eq!(actual.scheduled_end_time, expected.scheduled_end_time);
        assert_eq!(
            actual.planned_duration_seconds,
            expected.planned_duration_seconds
        );
        assert_eq!(actual.status_text, expected.status_text);
        assert_eq!(actual.waiting_events_json, expected.waiting_events_json);
        assert_eq!(actual.notified_events_json, expected.notified_events_json);
        assert_eq!(actual.round_number, expected.round_number);
        assert_eq!(actual.selected_recipe_id, expected.selected_recipe_id);
        assert_eq!(actual.selected_recipe_name, expected.selected_recipe_name);
        assert_eq!(actual.last_result, expected.last_result);
        assert_eq!(actual.state_revision, expected.state_revision);
        assert_eq!(actual.stop_after_settlement, expected.stop_after_settlement);
        assert_eq!(catalog.counts(), (30, 30, 30, 30, 30, 30));
        assert_eq!(outcome_catalog.catches.len(), 30);
        assert_eq!(outcome_catalog.misses.len(), 30);
        assert_eq!(outcome_catalog.features.len(), 30);
        assert_eq!(bait.name, "综合试钓饵");
        assert_eq!(first_preferences.len(), 53);
        assert_eq!(second_preferences.len(), 53);
        assert_eq!(admin_records.len(), 53);
        assert!(!admin_records[0].preference_sources.is_empty());
        assert!(
            (admin_records[0]
                .preference_sources
                .iter()
                .map(|source| source.percentage)
                .sum::<f64>()
                - 100.0)
                .abs()
                < 0.000_001
        );
        assert_eq!(
            first_preferences[0].preference,
            second_preferences[0].preference
        );
        assert_eq!(result_count, 1);
    }

    #[test]
    fn custom_bait_and_fish_records_round_trip() {
        let store = SqliteStore::open(Path::new(":memory:")).expect("open in-memory database");
        let ingredients = store
            .load_bait_ingredients()
            .expect("load bait ingredients");
        assert_eq!(ingredients.len(), 30);
        assert!((0.0..=1.0).contains(&ingredients[0].flavor.intensity));
        assert_eq!(
            ingredients
                .iter()
                .find(|ingredient| ingredient.id == 25)
                .expect("balanced base bait")
                .flavor
                .sweet,
            0.0
        );

        let (first_recipe_id, profile) = store
            .save_bait_recipe(None, "两甜一酸", &[(1, 20.0), (4, 10.0)])
            .expect("save custom bait");
        let components = store
            .load_recipe_components(first_recipe_id)
            .expect("load recipe components");
        assert_eq!(profile.name, "两甜一酸");
        assert_eq!(components, vec![(1, 20.0), (4, 10.0)]);
        assert!((0.0..=1.0).contains(&profile.flavor.sweet));
        let (second_recipe_id, _) = store
            .save_bait_recipe(None, "浓香试验", &[(2, 3.0), (5, 7.0)])
            .expect("save second custom bait");
        assert_ne!(first_recipe_id, second_recipe_id);
        assert_eq!(
            store
                .load_recipe_components(first_recipe_id)
                .expect("keep first recipe"),
            vec![(1, 20.0), (4, 10.0)]
        );
        assert_eq!(
            store.load_bait_recipes().expect("load saved recipes").len(),
            3
        );
        assert!(
            store
                .save_bait_recipe(None, "无效配方", &[(999, 1.0)])
                .is_err()
        );

        let caught = RoundOutcome::Caught {
            fish_id: 1,
            fish_name: "鲤鱼".to_owned(),
            rarity: FishRarity::Common,
            length_cm: 28.4,
            weight_kg: 0.62,
            value: 7.44,
            similarity: 0.86,
            description: "浮标一沉，鱼线轻轻绷直。".to_owned(),
        };
        store
            .save_round_outcome(
                1,
                Some("2026-08-18T07:45:00Z"),
                "2026-08-18T08:00:00Z",
                900,
                &[],
                "2026-08-18",
                &profile.name,
                &caught,
            )
            .expect("save caught outcome");
        let records = store.load_fish_records().expect("load fish records");
        assert_eq!(records.len(), 53);
        assert_eq!(records[0].rarity, FishRarity::Common);
        assert_eq!(records[23].rarity, FishRarity::Legendary);
        assert_eq!(records[0].caught_count, 1);
        assert_eq!(records[0].max_length_cm, Some(28.4));
        assert_eq!(records[0].max_weight_kg, Some(0.62));
        assert!(
            records[0]
                .latest_description
                .as_deref()
                .is_some_and(|text| text.contains("鲤鱼"))
        );
        assert_eq!(records[1].caught_count, 0);

        let pending = store.load_player_summary().expect("load player summary");
        assert_eq!(pending.poop_kg, 0.0);
        assert_eq!(pending.pending_catches, 1);
        let pending_catches = store.load_pending_catches().expect("load pending catches");
        assert_eq!(pending_catches.len(), 1);
        assert_eq!(pending_catches[0].round_number, 1);
        assert_eq!(pending_catches[0].fish_name.as_deref(), Some("鲤鱼"));
        let after_eating = store
            .handle_catch(1, "eat", 0.5, "2026-08-18T08:01:00Z")
            .expect("eat caught fish");
        assert_eq!(after_eating.pending_catches, 0);
        assert_eq!(after_eating.eaten_count, 1);
        assert!(
            store
                .load_pending_catches()
                .expect("reload pending catches")
                .is_empty()
        );
        assert!((after_eating.poop_kg - 0.31).abs() < 0.000_001);
        assert!(
            store
                .handle_catch(1, "sell", 0.0, "2026-08-18T08:02:00Z")
                .is_err()
        );

        store
            .save_round_outcome(
                2,
                Some("2026-08-18T08:05:00Z"),
                "2026-08-18T08:20:00Z",
                900,
                &[],
                "2026-08-18",
                &profile.name,
                &caught,
            )
            .expect("save second catch");
        assert_eq!(
            store
                .load_pending_catches()
                .expect("load second pending catch")[0]
                .round_number,
            2
        );
        let after_selling = store
            .handle_catch(2, "sell", 0.0, "2026-08-18T08:21:00Z")
            .expect("sell caught fish");
        assert_eq!(after_selling.sold_count, 1);
        assert!((after_selling.money - 7.44).abs() < 0.000_001);
        let log = store.load_fishing_log(100).expect("load fishing log");
        assert_eq!(log.len(), 2);
        assert_eq!(log[0].round_number, 2);
        assert_eq!(log[0].disposition, "sold");
        assert_eq!(log[1].disposition, "eaten");
    }

    #[test]
    fn legendary_treasure_stays_hidden_until_discovered() {
        assert_eq!(treasure_reward_skin_id(6), Some("treasure_perfume"));
        let store = SqliteStore::open(Path::new(":memory:")).expect("open in-memory database");
        let hidden = store
            .load_treasure_records()
            .expect("load hidden treasures");
        assert_eq!(hidden.len(), 6);
        assert!(hidden.iter().all(|treasure| !treasure.discovered));
        assert!(hidden.iter().all(|treasure| treasure.name == "？？？"));

        let treasure = RoundOutcome::TreasureFound {
            treasure_id: 1,
            treasure_name: "巨大的黑色珍珠".to_owned(),
            description: "测试宝物描述。".to_owned(),
            best_similarity: 0.72,
        };
        for round_number in [1, 2] {
            store
                .save_round_outcome(
                    round_number,
                    None,
                    "2026-08-18T08:00:00Z",
                    900,
                    &[],
                    "2026-08-18",
                    "综合试钓饵",
                    &treasure,
                )
                .expect("save treasure outcome");
        }

        let discovered = store
            .load_treasure_records()
            .expect("load discovered treasures");
        assert!(discovered[0].discovered);
        assert_eq!(discovered[0].name, "巨大的黑色珍珠");
        assert_eq!(discovered[0].found_count, 2);
        assert_eq!(discovered[1].name, "？？？");
        let log = store.load_fishing_log(10).expect("load treasure log");
        assert_eq!(log[0].result_type, "treasure");
        assert_eq!(log[0].disposition, "not_applicable");
        assert_eq!(store.load_player_summary().unwrap().pending_catches, 0);
        let owned_skins = store
            .load_owned_skin_ids()
            .expect("load treasure reward skin");
        assert!(owned_skins.iter().any(|skin| skin == "treasure_pearl"));
        assert!(
            !owned_skins
                .iter()
                .any(|skin| skin == "treasure_crystal_shoe")
        );
    }

    #[test]
    fn special_fish_catches_unlock_their_matching_achievement_skins() {
        let database_path = std::env::temp_dir().join(format!(
            "little-fishing-special-skin-rewards-{}-{}.sqlite3",
            std::process::id(),
            rand::random::<u64>()
        ));
        {
            let store = SqliteStore::open(&database_path).expect("open special reward database");
            for (round_number, fish_id, fish_name) in [
                (1, 41, "番茄肉丸意大利面鱼"),
                (2, 42, "披萨鱼"),
                (3, 43, "小水怪"),
            ] {
                let caught = RoundOutcome::Caught {
                    fish_id,
                    fish_name: fish_name.to_owned(),
                    rarity: FishRarity::Special,
                    length_cm: 30.0,
                    weight_kg: 2.0,
                    value: 2_000.0,
                    similarity: 0.0,
                    description: "特殊鱼成就测试。".to_owned(),
                };
                store
                    .save_round_outcome(
                        round_number,
                        None,
                        "2026-08-26T09:00:00Z",
                        900,
                        &[],
                        "2026-08-26",
                        "综合试钓饵",
                        &caught,
                    )
                    .expect("save special fish catch");
            }
            let owned = store.load_owned_skin_ids().expect("load special rewards");
            assert!(owned.iter().any(|skin| skin == "special_spaghetti_dog"));
            assert!(owned.iter().any(|skin| skin == "special_pizza_rabbit"));
            assert!(owned.iter().any(|skin| skin == "special_water_monster"));

            store
                .connection
                .lock()
                .expect("sqlite connection")
                .execute(
                    "DELETE FROM skin_unlocks WHERE skin_id = 'special_spaghetti_dog'",
                    [],
                )
                .expect("simulate a catch from before reward skins existed");
        }
        {
            let reopened = SqliteStore::open(&database_path).expect("backfill old special catches");
            assert!(
                reopened
                    .is_skin_owned("special_spaghetti_dog")
                    .expect("check backfilled special reward")
            );
        }
        std::fs::remove_file(database_path).expect("remove special reward database");
    }

    #[test]
    fn app_settings_survive_a_sqlite_round_trip() {
        let store = SqliteStore::open(Path::new(":memory:")).expect("open in-memory database");
        assert_eq!(
            store.load_app_settings().expect("load default settings"),
            StoredAppSettings::default()
        );
        let expected = StoredAppSettings {
            notifications_enabled: false,
            bobber_visible: false,
            bobber_always_on_top: false,
            theme: "dark".to_owned(),
            reduced_motion: true,
            bobber_skin: "calico".to_owned(),
        };
        store
            .save_app_settings(&expected, "2026-08-18T09:00:00Z")
            .expect("save settings");
        assert_eq!(
            store.load_app_settings().expect("reload settings"),
            expected
        );
    }

    #[test]
    fn store_purchases_charge_coins_and_keep_achievement_poop_progress() {
        let store = SqliteStore::open(Path::new(":memory:")).expect("open in-memory database");
        let defaults = store.load_owned_skin_ids().expect("load default skins");
        assert_eq!(defaults, vec!["orange"]);
        assert!(defaults.iter().any(|skin| skin == "orange"));

        store
            .connection
            .lock()
            .expect("sqlite connection")
            .execute(
                "UPDATE player_state SET money = 90000, poop_kg = 999 WHERE id = 1",
                [],
            )
            .expect("seed player balance");
        store
            .purchase_skin("silver_tabby", 30_000.0, "2026-08-24T08:00:00Z")
            .expect("purchase paid skin");
        assert_eq!(
            store.load_player_summary().expect("load player").money,
            60_000.0
        );
        assert!(
            store
                .is_skin_owned("silver_tabby")
                .expect("check purchased skin")
        );
        assert!(
            store
                .purchase_skin("silver_tabby", 30_000.0, "2026-08-24T08:01:00Z")
                .is_err()
        );
        store
            .purchase_upgrade("shorter_rounds_30", 30_000.0, "2026-08-24T08:01:30Z")
            .expect("purchase duration buff");
        assert!(
            store
                .is_upgrade_owned("shorter_rounds_30")
                .expect("check purchased duration buff")
        );
        assert!(
            store
                .purchase_upgrade("shorter_rounds_30", 30_000.0, "2026-08-24T08:01:45Z")
                .is_err()
        );
        assert!(
            store
                .claim_poop_skin("bengal", 1_000.0, "2026-08-24T08:02:00Z")
                .is_err()
        );

        store
            .connection
            .lock()
            .expect("sqlite connection")
            .execute("UPDATE player_state SET poop_kg = 1000 WHERE id = 1", [])
            .expect("reach achievement poop output");
        store
            .claim_poop_skin("bengal", 1_000.0, "2026-08-24T08:03:00Z")
            .expect("claim achievement skin");
        let player = store
            .load_player_summary()
            .expect("load player after claim");
        assert_eq!(player.poop_kg, 1_000.0);
        assert_eq!(player.money, 30_000.0);
        assert!(store.is_skin_owned("bengal").expect("check reward skin"));
    }

    #[test]
    fn simplified_admin_money_change_is_backed_up_and_survives_reopening() {
        let test_dir = std::env::temp_dir().join(format!(
            "little-fishing-admin-{}-{}",
            std::process::id(),
            rand::random::<u64>()
        ));
        std::fs::create_dir(&test_dir).expect("create isolated admin test directory");
        let database_path = test_dir.join("game.sqlite3");
        let backup_path;
        {
            let store = SqliteStore::open(&database_path).expect("open admin test database");
            backup_path = store
                .create_admin_backup("before-edit")
                .expect("create admin backup");
            assert!(backup_path.exists());
            store
                .update_admin_money(67_890.0, "2026-08-24T12:00:00Z")
                .expect("update money from admin");
        }

        {
            let reopened = SqliteStore::open(&database_path).expect("reopen admin test database");
            let player = reopened.load_player_summary().expect("reload admin player");
            assert_eq!(player.poop_kg, 0.0);
            assert_eq!(player.money, 67_890.0);
            reopened
                .ensure_daily_preferences("2026-08-24", &mut rand::rng())
                .expect("create admin preference view");
            let fish = reopened
                .load_admin_fish_records("2026-08-24")
                .expect("reload admin fish");
            assert_eq!(fish.len(), 53);
            assert!((0.0..=1.0).contains(&fish[0].preference.intensity));
        }

        std::fs::remove_file(&database_path).expect("remove admin test database");
        std::fs::remove_file(&backup_path).expect("remove admin test backup");
        std::fs::remove_dir(backup_path.parent().expect("backup parent"))
            .expect("remove admin backup directory");
        std::fs::remove_dir(test_dir).expect("remove isolated admin test directory");
    }
}
