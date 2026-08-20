use chrono::{DateTime, Duration as ChronoDuration, Utc};
use rand::{Rng, seq::IndexedRandom};
use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;

const PROBABILITY_SCALE: u16 = 10_000;

const STATUS_TEXTS: [&str; 20] = [
    "刚抛好这一竿，浮标正在找一个舒服的位置。",
    "鱼饵已经下水，接下来交给耐心和一点运气。",
    "钓线慢慢沉稳下来，水下的菜单今天刚刚开张。",
    "浮标站稳了，正在替你留意水下的动静。",
    "这一竿已经就位，岸上不用着急。",
    "鱼钩带着今天的配方沉了下去，暂时一切安静。",
    "水面收下了这一竿，答案还藏在下面。",
    "钓组已经落定，浮标开始认真值班。",
    "这一轮等待刚刚开始，风和鱼都还没表态。",
    "鱼线轻轻绷着，水下正在慢慢闻味道。",
    "浮标在波纹里站好，今天的运气开始计时。",
    "饵料已经入水，附近的鱼正在决定要不要开会。",
    "抛竿很顺利，剩下的事情不适合催。",
    "钓点安静下来，这一竿开始过自己的慢日子。",
    "浮标露出半截，像一位刚上岗的值班员。",
    "鱼线落进水色里，今天的第一封邀请已经寄出。",
    "这一竿没有声张，安安静静地开始了。",
    "钓组沉到合适的位置，岸边重新恢复清闲。",
    "浮标轻晃两下站稳，像是在说已经准备好了。",
    "鱼饵开始散味，水下会不会买账只能慢慢看。",
];

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
    "钓组突然挂底，轻弹几次竿稍后总算从石缝里脱了出来。",
    "子线啪地断了，好在备用线组已经重新接好并抛回原处。",
    "鱼钩带上来一大团水草，清理干净后这一竿继续。",
    "鱼线在竿尖绕了一圈，费了点耐心才重新理顺。",
    "饵团被小鱼啄得松散，只好补上一小团重新抛下。",
    "线轮忽然卡了一下，来回轻摇几次后恢复了顺滑。",
    "浮标座有些松，重新推紧后总算不再慢慢下滑。",
    "钩尖蹭过硬物变得不够锋利，已经换上一枚新钩。",
    "鱼线被漂来的树枝压进水里，绕开枝杈后重新归位。",
    "一阵侧风把钓线吹成大弧，压低竿尖才慢慢收回控制。",
    "钓组缠成了一个小结，解开时甚至够喝两口水。",
    "水草牢牢抱住铅坠，左右松线几次才肯放手。",
    "抛竿时饵团飞得比钩还远，只能重新装饵再来一次。",
    "鱼线擦过岸边石角，检查后剪掉了一小段磨毛的线。",
    "浮标吃水比刚才深，原来铅皮松开了一点，已经重新卷紧。",
    "钓线被风送上芦苇梢，慢慢牵回来后没有留下死结。",
    "提竿检查时发现钩门微微变形，换钩以后继续守候。",
    "线组轻轻回弹，像是挂到一只旧塑料袋，清走后水面清爽多了。",
    "八字环拧得有些别扭，顺着反转几圈才让子线重新自然。",
    "一次过猛的假信号差点拉断子线，松力以后线组保住了。",
];

const WILDLIFE_EVENTS: [&str; 20] = [
    "一只白鹭在不远处落脚，和你共同研究了几分钟水面。",
    "蜻蜓停上浮标尖端，把值班工作临时分走了一半。",
    "两只野鸭从钓线外侧游过，留下整齐的两排波纹。",
    "一只青蛙从岸边跳下去，替这一竿制造了很响的开场。",
    "小虾在浅水边倒退几步，很快钻进石缝里不见了。",
    "水鸟忽然扎进远处水面，空手出来后显得若无其事。",
    "一条小鱼跃出水面，落点离鱼钩偏偏差了很远。",
    "蚂蚁沿着竿架排队经过，对鱼饵表现出不合适的兴趣。",
    "一只蝴蝶绕着饵盆飞了两圈，最后选择了岸边野花。",
    "远处的鱼鹰贴水飞过，专业选手没有对这一竿发表评论。",
    "岸边草丛里窸窣一阵，一只小蜥蜴探头看了看浮标。",
    "几只水黾从浮标旁滑过，步子比今天的鱼口轻快得多。",
    "一只麻雀落在竿把附近，停了片刻又赶往别处。",
    "河蚌在浅水里挪出一道细痕，速度很慢但方向坚定。",
    "小螃蟹举着钳子从石头后面出来，又谨慎地退了回去。",
    "一群小鱼在近岸散开，像是临时改变了集合地点。",
    "燕子擦着水面飞过，影子让浮标紧张地晃了一下。",
    "远处传来一声鱼跃，水圈慢慢扩大，却不是你的方向。",
    "一只田螺牢牢贴在石头上，用自己的方式陪你挂机。",
    "水边的青蛙叫了三声，像在为这一竿做不太可靠的预测。",
];

const STORY_EVENTS: [&str; 20] = [
    "浮标连续点了三下，像有人在水下敲门，随后又礼貌地离开。",
    "一片圆叶正好停在浮标旁，看起来像给它摆了一张小桌子。",
    "水下冒出一串整齐气泡，像是哪条鱼叹完气后转身走了。",
    "风把芦苇吹得一起低头，仿佛岸边正在举行安静的投票。",
    "浮标忽然转向岸边，像是想提前下班，很快又被水流劝了回去。",
    "一根羽毛漂过钓点，短暂担任了这一片水面的巡逻船。",
    "远处的波纹排成一行赶来，到浮标前却突然忘了来意。",
    "鱼线轻响一声，像水下有人翻过菜单但嫌今天选择太多。",
    "浮标在阳光里亮了一下，获得了本轮唯一一枚临时勋章。",
    "一团云影罩住钓点，几秒后又把舞台灯光还给了你。",
    "岸边落叶追着彼此打了个圈，这一竿暂时只有观众没有主角。",
    "水面推来一圈很圆的波纹，像给浮标盖了一枚透明印章。",
    "钓线轻轻振动两次，水下似乎发来了一条没有署名的消息。",
    "风和水流各拉鱼线一边，短暂开完会后决定维持现状。",
    "浮标歪着想了一会儿，又站直继续扮演一名可靠员工。",
    "一颗气泡在浮标旁破开，像一句只说到一半的悄悄话。",
    "芦苇影子慢慢越过钓点，替这段等待翻了一页。",
    "水面忽然静得像暂停了一秒，随后所有小波纹继续上班。",
    "一小片浮萍围住浮标，很快又像散会一样各自漂走。",
    "鱼钩在水下毫无动静，但想象力已经偷偷收了一次线。",
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
    pub status_text: String,
    pub waiting_events: Vec<WaitingEvent>,
}

#[derive(Clone, Debug)]
pub struct EventCatalog {
    status: Vec<String>,
    ambient: Vec<String>,
    water: Vec<String>,
    tackle: Vec<String>,
    wildlife: Vec<String>,
    story: Vec<String>,
}

impl EventCatalog {
    pub fn new(
        status: Vec<String>,
        ambient: Vec<String>,
        water: Vec<String>,
        tackle: Vec<String>,
        wildlife: Vec<String>,
        story: Vec<String>,
    ) -> Self {
        Self {
            status,
            ambient,
            water,
            tackle,
            wildlife,
            story,
        }
    }

    #[cfg(test)]
    pub fn counts(&self) -> (usize, usize, usize, usize, usize, usize) {
        (
            self.status.len(),
            self.ambient.len(),
            self.water.len(),
            self.tackle.len(),
            self.wildlife.len(),
            self.story.len(),
        )
    }

    #[cfg(test)]
    pub(crate) fn seeded() -> Self {
        Self::new(
            STATUS_TEXTS
                .iter()
                .map(|value| (*value).to_owned())
                .collect(),
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
            WILDLIFE_EVENTS
                .iter()
                .map(|value| (*value).to_owned())
                .collect(),
            STORY_EVENTS
                .iter()
                .map(|value| (*value).to_owned())
                .collect(),
        )
    }
}

pub fn event_description_seeds() -> Vec<(&'static str, u32, &'static str)> {
    [
        ("status", STATUS_TEXTS.as_slice()),
        ("environment", AMBIENT_EVENTS.as_slice()),
        ("water", WATER_EVENTS.as_slice()),
        ("tackle", TACKLE_EVENTS.as_slice()),
        ("wildlife", WILDLIFE_EVENTS.as_slice()),
        ("story", STORY_EVENTS.as_slice()),
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
        0..=59 => 0,
        60..=299 => 1,
        300..=899 => 2,
        900..=1_799 => 3,
        1_800..=2_699 => 4,
        2_700..=3_600 => 5,
        3_601..=5_400 => 6,
        _ => 7,
    }
}

fn choose_event<'a, R: Rng + ?Sized>(
    rng: &mut R,
    allow_tackle: bool,
    catalog: &'a EventCatalog,
) -> (&'static str, &'a str) {
    if rng.random_range(0..5) == 4 {
        return (
            "story",
            catalog
                .story
                .choose(rng)
                .expect("story event pool is not empty")
                .as_str(),
        );
    }
    let pool_index = rng.random_range(0..if allow_tackle { 4 } else { 3 });
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
        2 => (
            "wildlife",
            catalog
                .wildlife
                .choose(rng)
                .expect("wildlife event pool is not empty")
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
    let status_text = catalog
        .status
        .choose(rng)
        .expect("status text pool is not empty")
        .clone();
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
        status_text,
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
        assert_eq!(STATUS_TEXTS.len(), 20);
        assert_eq!(AMBIENT_EVENTS.len(), 20);
        assert_eq!(WATER_EVENTS.len(), 20);
        assert_eq!(TACKLE_EVENTS.len(), 20);
        assert_eq!(WILDLIFE_EVENTS.len(), 20);
        assert_eq!(STORY_EVENTS.len(), 20);
        assert_eq!(event_description_seeds().len(), 120);
    }

    #[test]
    fn ordinary_rounds_always_have_visible_activity() {
        assert_eq!(event_count(30), 0);
        assert_eq!(event_count(300), 2);
        assert_eq!(event_count(900), 3);
        assert_eq!(event_count(3_601), 6);
    }
}
