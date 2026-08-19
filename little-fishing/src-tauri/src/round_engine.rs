use chrono::{DateTime, Duration as ChronoDuration, Utc};
use rand::{Rng, seq::IndexedRandom};
use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;

const PROBABILITY_SCALE: u16 = 10_000;

const AMBIENT_EVENTS: [&str; 20] = [
    "风从芦苇那边绕过来，水面多了几道细纹。",
    "一片叶子慢慢漂过浮标，又若无其事地走远了。",
    "云影压低了水色，岸边忽然安静了一会儿。",
    "远处传来两声鸟叫，像是在替你报时。",
    "阳光从云缝里落下来，浮标亮了一小截。",
    "岸边的草被风压弯，又慢吞吞地站了回去。",
    "一只蜻蜓把浮标当成了临时路标，盘旋两圈才离开。",
    "水面飘来一点草屑，差点显得比鱼还积极。",
    "远处有人收了一次线，很快又恢复了安静。",
    "风向轻轻变了，鱼线在水面画出一道缓弧。",
    "一阵细碎的波纹从岸边推过去，没有说明来意。",
    "树影晃了晃，像有谁偷偷挪动了半步。",
    "水边传来扑通一声，听起来更像青蛙在加班。",
    "一小团浮萍靠近钓线，停了一会儿又散开。",
    "空气里有一点潮湿的土味，今天很适合慢慢等。",
    "远处的水鸟划过水面，留下了一条很长的尾纹。",
    "风停了几秒，整片水面像屏住了呼吸。",
    "岸边落下一粒小石子，惊动的只有一圈涟漪。",
    "云层慢慢移开，水色从灰绿变得明亮了一点。",
    "芦苇沙沙响了一阵，像在讨论这一竿要等多久。",
];

const WATER_EVENTS: [&str; 20] = [
    "浮标轻轻颤了一下，随后继续装作什么都没发生。",
    "鱼线忽然绷直半秒，又慢慢松了回来。",
    "浮标旁冒出两颗小气泡，线却没有继续动作。",
    "水下像有什么擦过钓线，只留下很轻的一记抖动。",
    "浮标向左挪了半寸，看起来更像是水流的主意。",
    "一圈细小波纹从浮标底下散开，很快消失。",
    "浮标稍稍侧身，又重新站稳，态度十分谨慎。",
    "鱼线在水面切出一道短线，随后恢复松弛。",
    "水下传来一次轻碰，像有鱼只是路过看了看菜单。",
    "浮标慢慢下沉一点，又浮了回来，没有正式表态。",
    "水面突然亮起一小片碎光，浮标跟着摇了两下。",
    "钓线轻轻向外滑动，几秒后又停在原处。",
    "浮标转了小半圈，像在认真考虑方向问题。",
    "一条小鱼在附近翻了个身，但没有碰你的饵。",
    "水下有一串气泡斜着过去，目标似乎不是这里。",
    "浮标尖端点了两次水，动作轻得像是试探。",
    "钓线传来细微震动，随后只剩风在继续。",
    "浮标突然站得更直了，过一会儿才放松下来。",
    "附近水面闪过一道暗影，很快钻进更深的地方。",
    "浮标被缓流带开一点，仍然安稳地守着这一竿。",
];

const TACKLE_EVENTS: [&str; 20] = [
    "风把鱼线吹出一个小弯，好在很快自己理顺了。",
    "一根细草搭上钓线，顺水滑了一段才松开。",
    "鱼线轻轻蹭过水草，传来一次很像咬钩的假消息。",
    "浮标被漂来的小树枝碰了一下，虚惊一场。",
    "钓线短暂贴住水面，风一变又重新悬了起来。",
    "一片浮叶挂在线上几秒，最后决定自行离场。",
    "水草拉了拉鱼线，手法熟练得很像惯犯。",
    "浮标周围绕来一圈细线纹，暂时没有打结。",
    "钓组在水下轻轻转动，似乎正在调整坐姿。",
    "一阵侧风把浮标推偏，钓线仍旧保持着体面。",
    "小水草擦过鱼钩，留下了一次无效警报。",
    "鱼线松了一点，又被水流慢慢带直。",
    "漂来的草茎碰上浮标，双方很快和平分开。",
    "钓线似乎在水下绕过了什么，但没有真正挂住。",
    "浮标被风吹得斜了一会儿，仍坚持没有倒下。",
    "一小截枯枝从线边经过，差一点就想参与这一竿。",
    "线轮里传来极轻的一声响，检查后仍然一切正常。",
    "钓线沾上一点浮沫，很快又被水流洗掉。",
    "水草在钓组附近晃动，制造了几秒钟的悬念。",
    "鱼线和风较了一会儿劲，最后勉强算是平手。",
];

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WaitingEvent {
    pub id: u32,
    pub category: String,
    pub scheduled_at: DateTime<Utc>,
    pub description: String,
}

pub struct RoundPlan {
    pub duration_seconds: i64,
    pub waiting_events: Vec<WaitingEvent>,
}

#[derive(Clone, Debug)]
pub struct EventCatalog {
    ambient: Vec<String>,
    water: Vec<String>,
    tackle: Vec<String>,
}

impl EventCatalog {
    pub fn new(ambient: Vec<String>, water: Vec<String>, tackle: Vec<String>) -> Self {
        Self {
            ambient,
            water,
            tackle,
        }
    }

    #[cfg(test)]
    pub fn counts(&self) -> (usize, usize, usize) {
        (self.ambient.len(), self.water.len(), self.tackle.len())
    }

    #[cfg(test)]
    pub(crate) fn seeded() -> Self {
        Self::new(
            AMBIENT_EVENTS
                .iter()
                .map(|value| (*value).to_owned())
                .collect(),
            WATER_EVENTS
                .iter()
                .map(|value| (*value).to_owned())
                .collect(),
            TACKLE_EVENTS
                .iter()
                .map(|value| (*value).to_owned())
                .collect(),
        )
    }
}

pub fn event_description_seeds() -> Vec<(&'static str, u32, &'static str)> {
    [
        ("environment", AMBIENT_EVENTS.as_slice()),
        ("water", WATER_EVENTS.as_slice()),
        ("tackle", TACKLE_EVENTS.as_slice()),
    ]
    .into_iter()
    .flat_map(|(category, descriptions)| {
        descriptions
            .iter()
            .enumerate()
            .map(move |(index, description)| (category, index as u32 + 1, *description))
    })
    .collect()
}

fn tick_range_for_roll(roll: u16) -> (i64, i64) {
    match roll {
        0..=149 => (1, 9),          // 30 秒～4 分 30 秒：1.5%
        150..=3_549 => (10, 29),    // 5～15 分钟：34%
        3_550..=6_949 => (30, 59),  // 15～30 分钟：34%
        6_950..=8_949 => (60, 89),  // 30～45 分钟：20%
        8_950..=9_849 => (90, 120), // 45～60 分钟：9%
        _ => (121, 240),            // 60 分 30 秒～2 小时：1.5%
    }
}

pub fn sample_duration_seconds<R: Rng + ?Sized>(rng: &mut R) -> i64 {
    let roll = rng.random_range(0..PROBABILITY_SCALE);
    let (first_tick, last_tick) = tick_range_for_roll(roll);
    rng.random_range(first_tick..=last_tick) * 30
}

fn event_count(duration_seconds: i64) -> usize {
    match duration_seconds {
        0..=149 => 0,
        150..=899 => 1,
        900..=1_799 => 2,
        1_800..=2_699 => 3,
        2_700..=3_600 => 4,
        _ => 5,
    }
}

fn choose_event<'a, R: Rng + ?Sized>(
    rng: &mut R,
    allow_tackle: bool,
    catalog: &'a EventCatalog,
) -> (&'static str, &'a str) {
    let pool_index = rng.random_range(0..if allow_tackle { 3 } else { 2 });
    match pool_index {
        0 => (
            "environment",
            catalog
                .ambient
                .choose(rng)
                .expect("ambient event pool is not empty")
                .as_str(),
        ),
        1 => (
            "water",
            catalog
                .water
                .choose(rng)
                .expect("water event pool is not empty")
                .as_str(),
        ),
        _ => (
            "tackle",
            catalog
                .tackle
                .choose(rng)
                .expect("tackle event pool is not empty")
                .as_str(),
        ),
    }
}

pub fn generate_round_plan<R: Rng + ?Sized>(
    started_at: DateTime<Utc>,
    rng: &mut R,
    catalog: &EventCatalog,
) -> RoundPlan {
    let duration_seconds = sample_duration_seconds(rng);
    let total_ticks = duration_seconds / 30;
    let count = event_count(duration_seconds).min(total_ticks.saturating_sub(1) as usize);
    let mut event_ticks = BTreeSet::new();
    while event_ticks.len() < count {
        event_ticks.insert(rng.random_range(1..total_ticks));
    }
    let allow_tackle = duration_seconds >= 15 * 60;
    let waiting_events = event_ticks
        .into_iter()
        .enumerate()
        .map(|(index, tick)| {
            let (category, description) = choose_event(rng, allow_tackle, catalog);
            WaitingEvent {
                id: index as u32 + 1,
                category: category.to_owned(),
                scheduled_at: started_at + ChronoDuration::seconds(tick * 30),
                description: description.to_owned(),
            }
        })
        .collect();

    RoundPlan {
        duration_seconds,
        waiting_events,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rand::{SeedableRng, rngs::StdRng};

    #[test]
    fn probability_bands_match_the_frozen_distribution() {
        let mut counts = [0_usize; 6];
        for roll in 0..PROBABILITY_SCALE {
            let (first_tick, _) = tick_range_for_roll(roll);
            let bucket = match first_tick {
                1 => 0,
                10 => 1,
                30 => 2,
                60 => 3,
                90 => 4,
                _ => 5,
            };
            counts[bucket] += 1;
        }
        assert_eq!(counts, [150, 3_400, 3_400, 2_000, 900, 150]);
    }

    #[test]
    fn generated_rounds_use_thirty_second_precision() {
        let started_at = DateTime::parse_from_rfc3339("2026-08-18T08:00:00Z")
            .unwrap()
            .with_timezone(&Utc);
        let mut rng = StdRng::seed_from_u64(20260818);
        let catalog = EventCatalog::seeded();

        for _ in 0..2_000 {
            let plan = generate_round_plan(started_at, &mut rng, &catalog);
            assert!((30..=7_200).contains(&plan.duration_seconds));
            assert_eq!(plan.duration_seconds % 30, 0);
            for event in plan.waiting_events {
                assert!(event.scheduled_at > started_at);
                assert!(
                    event.scheduled_at
                        < started_at + ChronoDuration::seconds(plan.duration_seconds)
                );
                assert_eq!((event.scheduled_at - started_at).num_seconds() % 30, 0);
            }
        }
    }

    #[test]
    fn every_event_category_has_twenty_descriptions() {
        assert_eq!(AMBIENT_EVENTS.len(), 20);
        assert_eq!(WATER_EVENTS.len(), 20);
        assert_eq!(TACKLE_EVENTS.len(), 20);
        assert_eq!(event_description_seeds().len(), 60);
    }
}
