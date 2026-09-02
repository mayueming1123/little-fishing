use rand::{Rng, seq::IndexedRandom};
use serde::{Deserialize, Serialize};

const MISS_DESCRIPTIONS: [&str; 30] = [
    "鱼饵安静地泡完了这一轮，附近的鱼似乎另有安排。",
    "浮标认真值守到最后，可惜水下没有谁正式接单。",
    "有几次细小动静，但都没发展成真正的咬口。",
    "鱼线平平安安地回来，鱼也平平安安地留在了水里。",
    "水下像是有人看过菜单，最后还是礼貌地走开了。",
    "这一竿没有鱼，只有鱼饵稍微显得成熟了一点。",
    "浮标偶尔晃动，结果证明主要是风比较有参与感。",
    "收线时钩尖很干净，今天的鱼保持了良好警惕。",
    "饵料气味散了很远，但没有换来一位正式食客。",
    "水面一直很配合，鱼群则选择了低调。",
    "似乎有鱼轻轻碰过饵，最终没有留下姓名。",
    "这一轮的最大收获，是确认岸边依旧很安静。",
    "鱼钩顺利返航，没有携带任何乘客。",
    "附近的鱼可能开过一次短会，结论是再观察观察。",
    "收线过程十分顺利，顺利到完全没有鱼需要处理。",
    "浮标没入水色又重新露出，最后仍是一场误会。",
    "钓组在水下待得很有耐心，可惜耐心不能直接称重。",
    "这一竿没有发生奇迹，但也没有发生麻烦。",
    "鱼饵和水流相处得不错，只是没有交到鱼类朋友。",
    "空钩回来时很轻，轻得很符合今天的养生主题。",
    "收线时只带回一小片水草，至少它很配合地上了岸。",
    "鱼饵少了一角，真正负责品尝的客人却没有露面。",
    "浮标忙碌了半天，最后提交了一份没有鱼的工作报告。",
    "钩尖留下几道细小痕迹，嫌疑鱼已经顺利离场。",
    "这一轮水下很有礼貌，没有任何鱼来打扰你的安静。",
    "鱼线回到岸边时一身轻松，仿佛只是下水散了个步。",
    "有鱼在附近制造了足够多的悬念，但没有负责结尾。",
    "饵料已经充分表达诚意，鱼群决定改天再谈。",
    "最后一次浮标晃动仍然是水流，今天的鱼嘴很严。",
    "这一竿把耐心完整带回来了，只有鱼留在原地。",
];

const CATCH_DESCRIPTIONS: [&str; 30] = [
    "浮标干脆地下沉，收线后发现这次确实不是水草。",
    "鱼线忽然走直，一条鱼把安静的水面拉出了动静。",
    "浮标连续点动后没入水中，这一口来得很认真。",
    "先是一记轻碰，随后鱼线稳稳向外移动。",
    "水下的力道由轻变重，最后带回了一条真正的鱼。",
    "浮标侧倒又站起，下一秒终于给出了明确答案。",
    "鱼线短促地抖了几下，这次试探成功变成了咬钩。",
    "一圈急促波纹散开，钓组末端终于有了分量。",
    "收线途中传来稳定挣动，今天的运气有了具体重量。",
    "浮标缓缓横移，提竿时手上传来了可靠的回应。",
    "水面突然破开，这位水下访客被请到了岸边。",
    "鱼线先松后紧，最后证明这次判断完全正确。",
    "浮标只沉了一小截，钩上的分量却一点也不含糊。",
    "钓线向深处划去，片刻后带回一阵漂亮的水花。",
    "原本安静的浮标猛地一顿，这一轮终于开张。",
    "轻微的啄饵持续了一会儿，耐心等来了正式咬口。",
    "鱼线斜着切过水面，一条鱼结束了这段漫长等待。",
    "浮标在原地打了个转，随后干脆利落地消失。",
    "收线时阻力越来越清楚，水草的嫌疑终于被排除。",
    "这一口没有太多预告，却给了这一竿一个完整结尾。",
    "浮标猛地斜走，扬竿后鱼线立刻传回沉甸甸的回应。",
    "水下先是安静，随后一股力道把钓线拉成了直线。",
    "鱼口来得很轻，耐心多等半秒才把它稳稳带住。",
    "浮标忽然顶起一截，这次反常动作果然藏着一条鱼。",
    "收线时水面划出长长一道弧，鱼终于在岸边现身。",
    "竿稍连续点动，提竿那刻传来的重量让等待有了回报。",
    "一阵突然的挣扎打破安静，这位食客已经来不及改口。",
    "浮标贴着水面滑行，鱼线另一端给出了明确的答案。",
    "鱼钩从深处带回一串气泡，也带回了本轮的主角。",
    "最后几米收线格外热闹，一条鱼带着水花抵达岸边。",
];

const FISH_FEATURE_DESCRIPTIONS: [&str; 30] = [
    "鳞片在光下泛着一层很细的亮色。",
    "背部颜色偏深，腹侧则明显浅了一截。",
    "尾鳍边缘完整，摆动起来很有力。",
    "体侧留着几道不太规则的浅色纹路。",
    "鱼身圆润结实，摸起来很有分量。",
    "嘴边还沾着一点没有散开的饵料。",
    "背鳍竖得很精神，上岸后仍不肯放松。",
    "体色比常见的同类略暗，藏在水下应该很不起眼。",
    "腹部饱满，整条鱼的状态看起来很好。",
    "尾柄很粗，难怪收线时挣动得格外明显。",
    "鳞片排列细密，靠近侧线的位置颜色更深。",
    "鱼鳍带着一点半透明的暖色，边缘没有破损。",
    "头部宽厚，眼睛在离水后仍显得十分警觉。",
    "体形修长，游动留下的力道又快又直接。",
    "身上有几处自然的小斑点，像落下的水墨。",
    "腹鳍颜色比身体更鲜明，很容易一眼认出来。",
    "鳃盖边缘泛着淡淡金属光，转动时才会出现。",
    "鱼身摸起来格外光滑，几乎没有粗糙感。",
    "体侧的颜色从背到腹缓慢过渡，没有明显分界。",
    "这条鱼没有特别夸张的外表，但体态十分匀称。",
    "背鳍末端带着一圈浅色，收拢后才不太明显。",
    "眼睛周围的颜色略深，看起来像戴了一副小眼罩。",
    "体侧有一道细长亮纹，从鳃盖一直延伸到尾柄。",
    "尾鳍展开得很宽，边缘像被仔细修整过。",
    "鳞片间夹着几处细小深点，排列得没有固定规律。",
    "嘴部比同类稍宽，咬住鱼钩时显得格外坚决。",
    "腹侧泛着淡淡珠光，离开水面后仍然很清楚。",
    "鱼身略微扁宽，转身时能反出一整片柔和亮色。",
    "背部留着一道旧伤痕，已经长得平整而结实。",
    "各片鱼鳍颜色深浅不同，像临时拼出的一套配色。",
];

const TREASURE_ROLL_SCALE: u16 = 10_000;
const TARGET_TREASURE_PROBABILITY_PER_ROUND: f64 = 0.005;
const SPECIAL_FISH_ROLL_SCALE: u16 = 10_000;
const TARGET_SPECIAL_FISH_PROBABILITY_PER_ROUND: f64 =
    TARGET_TREASURE_PROBABILITY_PER_ROUND;
const MIN_CATCH_PROBABILITY: f64 = 0.10;
const MAX_CATCH_PROBABILITY: f64 = 0.70;
const RARITY_READINESS_FLOOR: f64 = 0.20;
const FISH_FIT_WEIGHT_FLOOR: f64 = 0.20;

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FlavorVector {
    pub intensity: f64,
    pub color: f64,
    pub sweet: f64,
    pub sour: f64,
    pub salty: f64,
}

impl FlavorVector {
    fn values(self) -> [f64; 5] {
        [
            self.intensity,
            self.color,
            self.sweet,
            self.sour,
            self.salty,
        ]
    }
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum FishRarity {
    Common,
    Uncommon,
    Rare,
    Epic,
    Legendary,
    Special,
}

impl FishRarity {
    pub fn from_price(price_per_kg: f64) -> Self {
        if price_per_kg <= 20.0 {
            Self::Common
        } else if price_per_kg <= 40.0 {
            Self::Uncommon
        } else if price_per_kg <= 55.0 {
            Self::Rare
        } else if price_per_kg < 150.0 {
            Self::Epic
        } else {
            Self::Legendary
        }
    }

    pub fn for_species(fish_id: i64, price_per_kg: f64) -> Self {
        if matches!(fish_id, 41..=43 | 54..=56) {
            Self::Special
        } else {
            Self::from_price(price_per_kg)
        }
    }

    pub const fn minimum_similarity(self) -> f64 {
        match self {
            Self::Common => 0.40,
            Self::Uncommon => 0.52,
            Self::Rare => 0.65,
            Self::Epic => 0.78,
            Self::Legendary => 0.90,
            Self::Special => 0.0,
        }
    }

    pub const fn storage_name(self) -> &'static str {
        match self {
            Self::Common => "common",
            Self::Uncommon => "uncommon",
            Self::Rare => "rare",
            Self::Epic => "epic",
            Self::Legendary => "legendary",
            Self::Special => "special",
        }
    }

    pub fn from_storage(value: &str) -> Self {
        match value {
            "uncommon" => Self::Uncommon,
            "rare" => Self::Rare,
            "epic" => Self::Epic,
            "legendary" => Self::Legendary,
            "special" => Self::Special,
            _ => Self::Common,
        }
    }

    pub const fn label(self) -> &'static str {
        match self {
            Self::Common => "普通",
            Self::Uncommon => "少见",
            Self::Rare => "稀有",
            Self::Epic => "史诗",
            Self::Legendary => "传说",
            Self::Special => "特殊",
        }
    }
}

#[derive(Clone, Debug)]
pub struct BaitProfile {
    pub name: String,
    pub flavor: FlavorVector,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BaitIngredientInfo {
    pub id: i64,
    pub name: String,
    pub flavor: FlavorVector,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FishRecord {
    pub fish_id: i64,
    pub name: String,
    pub price_per_kg: f64,
    pub rarity: FishRarity,
    pub caught_count: u64,
    pub max_length_cm: Option<f64>,
    pub max_weight_kg: Option<f64>,
    pub latest_description: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TreasureRecord {
    pub treasure_id: i64,
    pub discovered: bool,
    pub name: String,
    pub description: String,
    pub found_count: u64,
}

#[derive(Clone, Debug)]
pub struct FishProfile {
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
}

#[derive(Clone, Copy, Debug)]
pub struct FishCatchChance {
    pub fish_id: i64,
    pub similarity: f64,
    pub probability: f64,
}

#[derive(Clone, Debug)]
pub struct OutcomeTextCatalog {
    pub catches: Vec<String>,
    pub misses: Vec<String>,
    pub features: Vec<String>,
}

pub struct FishSpeciesSeed {
    pub id: i64,
    pub name: &'static str,
    pub price_per_kg: f64,
    pub min_length_cm: f64,
    pub max_length_cm: f64,
    pub min_weight_kg: f64,
    pub max_weight_kg: f64,
    pub price_source_url: &'static str,
    pub price_source_date: &'static str,
}

pub struct LegendaryTreasureSeed {
    pub id: i64,
    pub name: &'static str,
    pub description: &'static str,
}

pub struct BaitIngredientSeed {
    pub id: i64,
    pub name: &'static str,
    pub flavor: FlavorVector,
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum RoundOutcome {
    Caught {
        fish_id: i64,
        fish_name: String,
        rarity: FishRarity,
        length_cm: f64,
        weight_kg: f64,
        value: f64,
        similarity: f64,
        description: String,
    },
    Missed {
        reason: String,
        best_similarity: f64,
        below_similarity_threshold: bool,
    },
    TreasureFound {
        treasure_id: i64,
        treasure_name: String,
        description: String,
        best_similarity: f64,
    },
}

impl RoundOutcome {
    pub fn summary(&self) -> String {
        match self {
            Self::Caught {
                fish_name,
                rarity,
                length_cm,
                weight_kg,
                description,
                ..
            } => format!(
                "{description} 钓到{}级{fish_name}，长 {:.1} 厘米，重 {:.2} 公斤。",
                rarity.label(),
                length_cm,
                weight_kg
            ),
            Self::Missed { reason, .. } => reason.clone(),
            Self::TreasureFound {
                treasure_name,
                description,
                ..
            } => format!("没有钓到鱼，却遇到了神秘奇遇「{treasure_name}」。{description}"),
        }
    }
}

pub fn outcome_description_seeds() -> Vec<(&'static str, u32, &'static str)> {
    [
        ("caught", CATCH_DESCRIPTIONS.as_slice()),
        ("missed", MISS_DESCRIPTIONS.as_slice()),
        ("feature", FISH_FEATURE_DESCRIPTIONS.as_slice()),
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

pub fn legendary_treasure_seeds() -> Vec<LegendaryTreasureSeed> {
    vec![
        LegendaryTreasureSeed {
            id: 1,
            name: "巨大的黑色珍珠",
            description: "它几乎有拳头那么大，黑色表面映着一圈幽蓝光泽。没人知道是哪只河蚌把梦想做得如此夸张。",
        },
        LegendaryTreasureSeed {
            id: 2,
            name: "白雪公主穿过的水晶鞋",
            description: "鞋面晶莹得不像在水底待过，只是尺码小得惊人。至于那位公主是否真的穿过，岸边暂时无人能够作证。",
        },
        LegendaryTreasureSeed {
            id: 3,
            name: "一套看不出是什么公司的公章",
            description: "盒里整整齐齐摆着几枚公章，字迹却被水泡得完全认不出来。它们最好继续保持退休状态。",
        },
        LegendaryTreasureSeed {
            id: 4,
            name: "长得很像宝剑的树枝",
            description: "笔直枝干带着天然护手，挥起来还真有几分气势。认真看三秒以后，它依然只是一根非常努力的树枝。",
        },
        LegendaryTreasureSeed {
            id: 5,
            name: "武功秘籍",
            description: "封面只剩下“神功”两个字，内页大半已经粘在一起。勉强翻开的那页认真讲解了如何保持呼吸平稳。",
        },
        LegendaryTreasureSeed {
            id: 6,
            name: "包装精致的香水",
            description: "精致的瓶身和丝带竟然都完好无损，轻轻一晃还能闻见淡淡花香。它出现在水底的原因，大概和香调一样难以解释。",
        },
    ]
}

pub fn fish_species_seeds() -> Vec<FishSpeciesSeed> {
    let guizhou = "https://nynct.guizhou.gov.cn/wsfw/scfx/202601/t20260113_89294766.html";
    let hubei = "https://hbnysy.hubei.gov.cn/bsfw/scfxbg/202601/t20260119_5858324.shtml";
    let wuhan =
        "https://nyncj.wuhan.gov.cn/zwgk_25/fdzdgknr/snsj/scppfjg/202506/t20250603_2590185.html";
    let wuhan_june_9 =
        "https://nyncj.wuhan.gov.cn/zwgk_25/fdzdgknr/snsj/scppfjg/202506/t20250609_2593098.html";
    let xiamen = "https://hyj.xm.gov.cn/bmfw/scjg/202506/t20250603_2936791.htm";
    let xiamen_aug = "https://hyj.xm.gov.cn/bmfw/scjg/202508/t20250820_2951405.htm";
    let quanzhou_2023 = "https://nyncj.quanzhou.gov.cn/xxgk/scjc/202307/t20230721_2906556.htm";
    let quanzhou_2020 = "https://nyncj.quanzhou.gov.cn/xxgk/scjc/202007/t20200703_2379453.htm";
    let quanzhou_2025_q3 = "https://nyncj.quanzhou.gov.cn/xxgk/scjc/202511/t20251104_3227407.htm";
    let moa_2019 = "https://yyj.moa.gov.cn/gzdt/201904/t20190418_6193955.htm";
    vec![
        FishSpeciesSeed {
            id: 1,
            name: "鲤鱼",
            price_per_kg: 15.78,
            min_length_cm: 20.0,
            max_length_cm: 90.0,
            min_weight_kg: 0.2,
            max_weight_kg: 12.0,
            price_source_url: guizhou,
            price_source_date: "2025-12",
        },
        FishSpeciesSeed {
            id: 2,
            name: "鲫鱼",
            price_per_kg: 23.60,
            min_length_cm: 10.0,
            max_length_cm: 45.0,
            min_weight_kg: 0.05,
            max_weight_kg: 2.5,
            price_source_url: wuhan_june_9,
            price_source_date: "2025-06-09",
        },
        FishSpeciesSeed {
            id: 3,
            name: "草鱼",
            price_per_kg: 19.00,
            min_length_cm: 25.0,
            max_length_cm: 120.0,
            min_weight_kg: 0.3,
            max_weight_kg: 20.0,
            price_source_url: xiamen,
            price_source_date: "2025-06-03",
        },
        FishSpeciesSeed {
            id: 4,
            name: "白鲢",
            price_per_kg: 18.68,
            min_length_cm: 25.0,
            max_length_cm: 110.0,
            min_weight_kg: 0.3,
            max_weight_kg: 18.0,
            price_source_url: guizhou,
            price_source_date: "2025-12",
        },
        FishSpeciesSeed {
            id: 5,
            name: "鳙鱼",
            price_per_kg: 19.00,
            min_length_cm: 30.0,
            max_length_cm: 120.0,
            min_weight_kg: 0.5,
            max_weight_kg: 25.0,
            price_source_url: xiamen,
            price_source_date: "2025-06-03",
        },
        FishSpeciesSeed {
            id: 6,
            name: "鳊鱼",
            price_per_kg: 13.43,
            min_length_cm: 15.0,
            max_length_cm: 60.0,
            min_weight_kg: 0.1,
            max_weight_kg: 3.5,
            price_source_url: hubei,
            price_source_date: "2025",
        },
        FishSpeciesSeed {
            id: 7,
            name: "黄颡鱼",
            price_per_kg: 22.99,
            min_length_cm: 10.0,
            max_length_cm: 50.0,
            min_weight_kg: 0.05,
            max_weight_kg: 2.0,
            price_source_url: hubei,
            price_source_date: "2025",
        },
        FishSpeciesSeed {
            id: 8,
            name: "鳜鱼",
            price_per_kg: 60.07,
            min_length_cm: 15.0,
            max_length_cm: 80.0,
            min_weight_kg: 0.15,
            max_weight_kg: 8.0,
            price_source_url: hubei,
            price_source_date: "2025",
        },
        FishSpeciesSeed {
            id: 9,
            name: "鲈鱼",
            price_per_kg: 44.00,
            min_length_cm: 15.0,
            max_length_cm: 90.0,
            min_weight_kg: 0.15,
            max_weight_kg: 10.0,
            price_source_url: wuhan,
            price_source_date: "2025-06-02",
        },
        FishSpeciesSeed {
            id: 10,
            name: "江团",
            price_per_kg: 20.22,
            min_length_cm: 20.0,
            max_length_cm: 100.0,
            min_weight_kg: 0.3,
            max_weight_kg: 15.0,
            price_source_url: guizhou,
            price_source_date: "2025-12",
        },
        FishSpeciesSeed {
            id: 11,
            name: "青鱼",
            price_per_kg: 14.70,
            min_length_cm: 30.0,
            max_length_cm: 150.0,
            min_weight_kg: 0.5,
            max_weight_kg: 50.0,
            price_source_url: wuhan,
            price_source_date: "2025-06-02",
        },
        FishSpeciesSeed {
            id: 12,
            name: "乌鳢",
            price_per_kg: 18.50,
            min_length_cm: 15.0,
            max_length_cm: 100.0,
            min_weight_kg: 0.1,
            max_weight_kg: 8.0,
            price_source_url: wuhan,
            price_source_date: "2025-06-02",
        },
        FishSpeciesSeed {
            id: 13,
            name: "鲶鱼",
            price_per_kg: 12.50,
            min_length_cm: 15.0,
            max_length_cm: 150.0,
            min_weight_kg: 0.1,
            max_weight_kg: 30.0,
            price_source_url: wuhan,
            price_source_date: "2025-06-02",
        },
        FishSpeciesSeed {
            id: 14,
            name: "黄鳝",
            price_per_kg: 68.00,
            min_length_cm: 15.0,
            max_length_cm: 100.0,
            min_weight_kg: 0.05,
            max_weight_kg: 3.0,
            price_source_url: hubei,
            price_source_date: "2025",
        },
        FishSpeciesSeed {
            id: 15,
            name: "泥鳅",
            price_per_kg: 21.00,
            min_length_cm: 5.0,
            max_length_cm: 30.0,
            min_weight_kg: 0.01,
            max_weight_kg: 0.3,
            price_source_url: wuhan,
            price_source_date: "2025-06-02",
        },
        FishSpeciesSeed {
            id: 16,
            name: "白鱼",
            price_per_kg: 15.50,
            min_length_cm: 15.0,
            max_length_cm: 100.0,
            min_weight_kg: 0.1,
            max_weight_kg: 8.0,
            price_source_url: wuhan,
            price_source_date: "2025-06-02",
        },
        FishSpeciesSeed {
            id: 17,
            name: "大黄鱼",
            price_per_kg: 48.00,
            min_length_cm: 20.0,
            max_length_cm: 80.0,
            min_weight_kg: 0.2,
            max_weight_kg: 6.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 18,
            name: "蓝园鲹",
            price_per_kg: 12.00,
            min_length_cm: 10.0,
            max_length_cm: 40.0,
            min_weight_kg: 0.05,
            max_weight_kg: 1.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 19,
            name: "黄鳍鲷",
            price_per_kg: 52.00,
            min_length_cm: 15.0,
            max_length_cm: 60.0,
            min_weight_kg: 0.1,
            max_weight_kg: 4.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 20,
            name: "马鲛鱼",
            price_per_kg: 38.00,
            min_length_cm: 30.0,
            max_length_cm: 200.0,
            min_weight_kg: 0.5,
            max_weight_kg: 40.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 21,
            name: "带鱼",
            price_per_kg: 46.00,
            min_length_cm: 30.0,
            max_length_cm: 180.0,
            min_weight_kg: 0.1,
            max_weight_kg: 5.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 22,
            name: "海鳗",
            price_per_kg: 66.00,
            min_length_cm: 30.0,
            max_length_cm: 250.0,
            min_weight_kg: 0.5,
            max_weight_kg: 25.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 23,
            name: "大菱鲆",
            price_per_kg: 52.00,
            min_length_cm: 20.0,
            max_length_cm: 100.0,
            min_weight_kg: 0.2,
            max_weight_kg: 15.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 24,
            name: "驼背鲈",
            price_per_kg: 480.00,
            min_length_cm: 30.0,
            max_length_cm: 120.0,
            min_weight_kg: 0.5,
            max_weight_kg: 25.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 25,
            name: "东星斑",
            price_per_kg: 280.00,
            min_length_cm: 25.0,
            max_length_cm: 100.0,
            min_weight_kg: 0.3,
            max_weight_kg: 12.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 26,
            name: "赤点石斑鱼",
            price_per_kg: 170.00,
            min_length_cm: 20.0,
            max_length_cm: 100.0,
            min_weight_kg: 0.3,
            max_weight_kg: 15.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 27,
            name: "青石斑鱼",
            price_per_kg: 72.00,
            min_length_cm: 20.0,
            max_length_cm: 100.0,
            min_weight_kg: 0.3,
            max_weight_kg: 15.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 28,
            name: "刺鲳",
            price_per_kg: 24.00,
            min_length_cm: 10.0,
            max_length_cm: 40.0,
            min_weight_kg: 0.05,
            max_weight_kg: 1.5,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 29,
            name: "银鲳",
            price_per_kg: 36.00,
            min_length_cm: 10.0,
            max_length_cm: 60.0,
            min_weight_kg: 0.05,
            max_weight_kg: 3.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 30,
            name: "金鲳",
            price_per_kg: 45.00,
            min_length_cm: 15.0,
            max_length_cm: 70.0,
            min_weight_kg: 0.1,
            max_weight_kg: 8.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 31,
            name: "罗非鱼",
            price_per_kg: 15.00,
            min_length_cm: 12.0,
            max_length_cm: 60.0,
            min_weight_kg: 0.08,
            max_weight_kg: 5.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 32,
            name: "蓝子鱼",
            price_per_kg: 20.00,
            min_length_cm: 10.0,
            max_length_cm: 45.0,
            min_weight_kg: 0.05,
            max_weight_kg: 1.8,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 33,
            name: "龙头鱼",
            price_per_kg: 18.00,
            min_length_cm: 10.0,
            max_length_cm: 45.0,
            min_weight_kg: 0.03,
            max_weight_kg: 1.2,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 34,
            name: "太阳鱼",
            price_per_kg: 30.00,
            min_length_cm: 8.0,
            max_length_cm: 35.0,
            min_weight_kg: 0.03,
            max_weight_kg: 1.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 35,
            name: "黑鲷",
            price_per_kg: 38.00,
            min_length_cm: 15.0,
            max_length_cm: 75.0,
            min_weight_kg: 0.12,
            max_weight_kg: 6.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 36,
            name: "斜带髭鲷",
            price_per_kg: 46.00,
            min_length_cm: 20.0,
            max_length_cm: 85.0,
            min_weight_kg: 0.2,
            max_weight_kg: 8.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 37,
            name: "日本金线鱼",
            price_per_kg: 46.00,
            min_length_cm: 12.0,
            max_length_cm: 50.0,
            min_weight_kg: 0.06,
            max_weight_kg: 2.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 38,
            name: "马鲅",
            price_per_kg: 58.00,
            min_length_cm: 30.0,
            max_length_cm: 180.0,
            min_weight_kg: 0.5,
            max_weight_kg: 35.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 39,
            name: "弹涂鱼",
            price_per_kg: 90.00,
            min_length_cm: 5.0,
            max_length_cm: 30.0,
            min_weight_kg: 0.01,
            max_weight_kg: 0.35,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 40,
            name: "条纹斑竹鲨",
            price_per_kg: 260.00,
            min_length_cm: 35.0,
            max_length_cm: 120.0,
            min_weight_kg: 0.6,
            max_weight_kg: 12.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 41,
            name: "番茄肉丸意大利面鱼",
            price_per_kg: 1_000.0,
            min_length_cm: 28.0,
            max_length_cm: 70.0,
            min_weight_kg: 0.8,
            max_weight_kg: 4.5,
            price_source_url: "game://special-fish",
            price_source_date: "奇想定价",
        },
        FishSpeciesSeed {
            id: 42,
            name: "披萨鱼",
            price_per_kg: 1_000.0,
            min_length_cm: 22.0,
            max_length_cm: 55.0,
            min_weight_kg: 0.4,
            max_weight_kg: 2.8,
            price_source_url: "game://special-fish",
            price_source_date: "奇想定价",
        },
        FishSpeciesSeed {
            id: 43,
            name: "小水怪",
            price_per_kg: 1_000.0,
            min_length_cm: 55.0,
            max_length_cm: 140.0,
            min_weight_kg: 3.0,
            max_weight_kg: 18.0,
            price_source_url: "game://special-fish",
            price_source_date: "奇想定价",
        },
        FishSpeciesSeed {
            id: 44,
            name: "小黄鱼",
            price_per_kg: 17.0,
            min_length_cm: 15.0,
            max_length_cm: 45.0,
            min_weight_kg: 0.05,
            max_weight_kg: 1.2,
            price_source_url: quanzhou_2023,
            price_source_date: "2023-06",
        },
        FishSpeciesSeed {
            id: 45,
            name: "鲐鱼",
            price_per_kg: 4.6,
            min_length_cm: 15.0,
            max_length_cm: 60.0,
            min_weight_kg: 0.08,
            max_weight_kg: 3.0,
            price_source_url: moa_2019,
            price_source_date: "2019-04",
        },
        FishSpeciesSeed {
            id: 46,
            name: "梅童鱼",
            price_per_kg: 14.0,
            min_length_cm: 8.0,
            max_length_cm: 35.0,
            min_weight_kg: 0.03,
            max_weight_kg: 0.8,
            price_source_url: quanzhou_2020,
            price_source_date: "2020-06",
        },
        FishSpeciesSeed {
            id: 47,
            name: "鲟鱼",
            price_per_kg: 29.35,
            min_length_cm: 50.0,
            max_length_cm: 250.0,
            min_weight_kg: 2.0,
            max_weight_kg: 120.0,
            price_source_url: guizhou,
            price_source_date: "2025-12",
        },
        FishSpeciesSeed {
            id: 48,
            name: "牙鲆",
            price_per_kg: 32.0,
            min_length_cm: 20.0,
            max_length_cm: 100.0,
            min_weight_kg: 0.2,
            max_weight_kg: 12.0,
            price_source_url: quanzhou_2025_q3,
            price_source_date: "2025-Q3",
        },
        FishSpeciesSeed {
            id: 49,
            name: "真鲷",
            price_per_kg: 42.0,
            min_length_cm: 20.0,
            max_length_cm: 100.0,
            min_weight_kg: 0.2,
            max_weight_kg: 10.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 50,
            name: "花鲈",
            price_per_kg: 52.0,
            min_length_cm: 20.0,
            max_length_cm: 120.0,
            min_weight_kg: 0.3,
            max_weight_kg: 15.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 51,
            name: "宽额鲈",
            price_per_kg: 72.0,
            min_length_cm: 25.0,
            max_length_cm: 150.0,
            min_weight_kg: 0.4,
            max_weight_kg: 30.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 52,
            name: "舌鳎",
            price_per_kg: 86.0,
            min_length_cm: 15.0,
            max_length_cm: 70.0,
            min_weight_kg: 0.1,
            max_weight_kg: 5.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 53,
            name: "波路豆齿蛇鳗",
            price_per_kg: 280.0,
            min_length_cm: 50.0,
            max_length_cm: 250.0,
            min_weight_kg: 0.8,
            max_weight_kg: 30.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 54,
            name: "太空科技鱿鱼",
            price_per_kg: 1_000.0,
            min_length_cm: 18.0,
            max_length_cm: 48.0,
            min_weight_kg: 0.4,
            max_weight_kg: 3.2,
            price_source_url: "game://special-fish",
            price_source_date: "奇想定价",
        },
        FishSpeciesSeed {
            id: 55,
            name: "布丁鱼",
            price_per_kg: 1_000.0,
            min_length_cm: 12.0,
            max_length_cm: 30.0,
            min_weight_kg: 0.3,
            max_weight_kg: 2.5,
            price_source_url: "game://special-fish",
            price_source_date: "奇想定价",
        },
        FishSpeciesSeed {
            id: 56,
            name: "公主鱼",
            price_per_kg: 1_000.0,
            min_length_cm: 25.0,
            max_length_cm: 65.0,
            min_weight_kg: 0.5,
            max_weight_kg: 4.0,
            price_source_url: "game://special-fish",
            price_source_date: "奇想定价",
        },
        FishSpeciesSeed {
            id: 57,
            name: "土鲮鱼",
            price_per_kg: 19.0,
            min_length_cm: 12.0,
            max_length_cm: 45.0,
            min_weight_kg: 0.08,
            max_weight_kg: 2.5,
            price_source_url: "https://nync.zs.gov.cn/zwgk/tjxx/content/post_2506955.html",
            price_source_date: "2025-04-17",
        },
        FishSpeciesSeed {
            id: 58,
            name: "沙丁鱼",
            price_per_kg: 18.0,
            min_length_cm: 10.0,
            max_length_cm: 30.0,
            min_weight_kg: 0.03,
            max_weight_kg: 0.35,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 59,
            name: "凤尾鱼",
            price_per_kg: 20.0,
            min_length_cm: 6.0,
            max_length_cm: 22.0,
            min_weight_kg: 0.01,
            max_weight_kg: 0.18,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 60,
            name: "秋刀鱼",
            price_per_kg: 30.0,
            min_length_cm: 20.0,
            max_length_cm: 45.0,
            min_weight_kg: 0.08,
            max_weight_kg: 0.8,
            price_source_url: "https://fg.sanya.gov.cn/fgwsite/jgjc/202606/2758627b52e94b50bdff68423992c3ef.shtml",
            price_source_date: "2026-06-29",
        },
        FishSpeciesSeed {
            id: 61,
            name: "鲻鱼",
            price_per_kg: 38.0,
            min_length_cm: 18.0,
            max_length_cm: 90.0,
            min_weight_kg: 0.15,
            max_weight_kg: 8.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 62,
            name: "红娘鱼",
            price_per_kg: 46.0,
            min_length_cm: 15.0,
            max_length_cm: 55.0,
            min_weight_kg: 0.08,
            max_weight_kg: 2.5,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 63,
            name: "鲬鱼",
            price_per_kg: 52.0,
            min_length_cm: 20.0,
            max_length_cm: 100.0,
            min_weight_kg: 0.2,
            max_weight_kg: 8.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 64,
            name: "泰国笋壳鱼",
            price_per_kg: 88.0,
            min_length_cm: 20.0,
            max_length_cm: 70.0,
            min_weight_kg: 0.3,
            max_weight_kg: 6.0,
            price_source_url: "https://nync.zs.gov.cn/zwgk/tjxx/content/post_2506955.html",
            price_source_date: "2025-04-17",
        },
        FishSpeciesSeed {
            id: 65,
            name: "鳐鱼",
            price_per_kg: 96.0,
            min_length_cm: 30.0,
            max_length_cm: 180.0,
            min_weight_kg: 0.8,
            max_weight_kg: 45.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
        FishSpeciesSeed {
            id: 66,
            name: "蓝鳍金枪鱼",
            price_per_kg: 320.0,
            min_length_cm: 60.0,
            max_length_cm: 300.0,
            min_weight_kg: 8.0,
            max_weight_kg: 450.0,
            price_source_url: xiamen_aug,
            price_source_date: "2025-08-20",
        },
    ]
}

pub fn bait_ingredient_seeds() -> Vec<BaitIngredientSeed> {
    vec![
        BaitIngredientSeed {
            id: 1,
            name: "玉米粉",
            flavor: FlavorVector {
                intensity: 0.35,
                color: 0.62,
                sweet: 0.68,
                sour: 0.05,
                salty: 0.04,
            },
        },
        BaitIngredientSeed {
            id: 2,
            name: "酒米",
            flavor: FlavorVector {
                intensity: 0.76,
                color: 0.55,
                sweet: 0.36,
                sour: 0.22,
                salty: 0.08,
            },
        },
        BaitIngredientSeed {
            id: 3,
            name: "蚯蚓碎",
            flavor: FlavorVector {
                intensity: 0.82,
                color: 0.38,
                sweet: 0.08,
                sour: 0.18,
                salty: 0.32,
            },
        },
        BaitIngredientSeed {
            id: 4,
            name: "红虫粉",
            flavor: FlavorVector {
                intensity: 0.92,
                color: 0.74,
                sweet: 0.05,
                sour: 0.12,
                salty: 0.46,
            },
        },
        BaitIngredientSeed {
            id: 5,
            name: "面包屑",
            flavor: FlavorVector {
                intensity: 0.24,
                color: 0.43,
                sweet: 0.56,
                sour: 0.04,
                salty: 0.09,
            },
        },
        BaitIngredientSeed {
            id: 6,
            name: "蒜味颗粒",
            flavor: FlavorVector {
                intensity: 0.96,
                color: 0.31,
                sweet: 0.04,
                sour: 0.11,
                salty: 0.29,
            },
        },
        BaitIngredientSeed {
            id: 7,
            name: "草莓香粉",
            flavor: FlavorVector {
                intensity: 0.71,
                color: 0.91,
                sweet: 0.88,
                sour: 0.36,
                salty: 0.02,
            },
        },
        BaitIngredientSeed {
            id: 8,
            name: "酸酵麦粒",
            flavor: FlavorVector {
                intensity: 0.64,
                color: 0.48,
                sweet: 0.28,
                sour: 0.86,
                salty: 0.07,
            },
        },
        BaitIngredientSeed {
            id: 9,
            name: "虾粉",
            flavor: FlavorVector {
                intensity: 0.88,
                color: 0.58,
                sweet: 0.06,
                sour: 0.10,
                salty: 0.72,
            },
        },
        BaitIngredientSeed {
            id: 10,
            name: "蚕蛹粉",
            flavor: FlavorVector {
                intensity: 0.84,
                color: 0.36,
                sweet: 0.12,
                sour: 0.16,
                salty: 0.38,
            },
        },
        BaitIngredientSeed {
            id: 11,
            name: "麦麸",
            flavor: FlavorVector {
                intensity: 0.28,
                color: 0.42,
                sweet: 0.32,
                sour: 0.08,
                salty: 0.05,
            },
        },
        BaitIngredientSeed {
            id: 12,
            name: "豆粕",
            flavor: FlavorVector {
                intensity: 0.46,
                color: 0.39,
                sweet: 0.25,
                sour: 0.12,
                salty: 0.09,
            },
        },
        BaitIngredientSeed {
            id: 13,
            name: "菜籽饼",
            flavor: FlavorVector {
                intensity: 0.72,
                color: 0.34,
                sweet: 0.18,
                sour: 0.11,
                salty: 0.12,
            },
        },
        BaitIngredientSeed {
            id: 14,
            name: "鱼粉",
            flavor: FlavorVector {
                intensity: 0.94,
                color: 0.33,
                sweet: 0.03,
                sour: 0.09,
                salty: 0.81,
            },
        },
        BaitIngredientSeed {
            id: 15,
            name: "奶香粉",
            flavor: FlavorVector {
                intensity: 0.66,
                color: 0.68,
                sweet: 0.82,
                sour: 0.05,
                salty: 0.06,
            },
        },
        BaitIngredientSeed {
            id: 16,
            name: "红薯泥",
            flavor: FlavorVector {
                intensity: 0.38,
                color: 0.79,
                sweet: 0.76,
                sour: 0.06,
                salty: 0.03,
            },
        },
        BaitIngredientSeed {
            id: 17,
            name: "南瓜泥",
            flavor: FlavorVector {
                intensity: 0.31,
                color: 0.92,
                sweet: 0.64,
                sour: 0.04,
                salty: 0.04,
            },
        },
        BaitIngredientSeed {
            id: 18,
            name: "蜂蜜",
            flavor: FlavorVector {
                intensity: 0.58,
                color: 0.73,
                sweet: 0.98,
                sour: 0.08,
                salty: 0.01,
            },
        },
        BaitIngredientSeed {
            id: 19,
            name: "果酸粉",
            flavor: FlavorVector {
                intensity: 0.74,
                color: 0.64,
                sweet: 0.21,
                sour: 0.97,
                salty: 0.03,
            },
        },
        BaitIngredientSeed {
            id: 20,
            name: "海藻粉",
            flavor: FlavorVector {
                intensity: 0.67,
                color: 0.57,
                sweet: 0.08,
                sour: 0.15,
                salty: 0.76,
            },
        },
        BaitIngredientSeed {
            id: 21,
            name: "鸡肝碎",
            flavor: FlavorVector {
                intensity: 0.91,
                color: 0.61,
                sweet: 0.04,
                sour: 0.17,
                salty: 0.54,
            },
        },
        BaitIngredientSeed {
            id: 22,
            name: "螺肉碎",
            flavor: FlavorVector {
                intensity: 0.86,
                color: 0.40,
                sweet: 0.05,
                sour: 0.13,
                salty: 0.68,
            },
        },
        BaitIngredientSeed {
            id: 23,
            name: "藻腥颗粒",
            flavor: FlavorVector {
                intensity: 0.79,
                color: 0.52,
                sweet: 0.10,
                sour: 0.24,
                salty: 0.63,
            },
        },
        BaitIngredientSeed {
            id: 24,
            name: "黑糖蜜",
            flavor: FlavorVector {
                intensity: 0.69,
                color: 0.29,
                sweet: 0.94,
                sour: 0.14,
                salty: 0.05,
            },
        },
        BaitIngredientSeed {
            id: 25,
            name: "平衡底粉",
            flavor: FlavorVector {
                intensity: 0.08,
                color: 0.08,
                sweet: 0.0,
                sour: 0.0,
                salty: 0.0,
            },
        },
        BaitIngredientSeed {
            id: 26,
            name: "素色面筋",
            flavor: FlavorVector {
                intensity: 0.20,
                color: 0.0,
                sweet: 0.16,
                sour: 0.0,
                salty: 0.0,
            },
        },
        BaitIngredientSeed {
            id: 27,
            name: "无色甜粉",
            flavor: FlavorVector {
                intensity: 0.22,
                color: 0.0,
                sweet: 0.90,
                sour: 0.0,
                salty: 0.0,
            },
        },
        BaitIngredientSeed {
            id: 28,
            name: "无色果酸",
            flavor: FlavorVector {
                intensity: 0.30,
                color: 0.0,
                sweet: 0.0,
                sour: 0.90,
                salty: 0.0,
            },
        },
        BaitIngredientSeed {
            id: 29,
            name: "纯盐晶",
            flavor: FlavorVector {
                intensity: 0.35,
                color: 0.0,
                sweet: 0.0,
                sour: 0.0,
                salty: 0.90,
            },
        },
        BaitIngredientSeed {
            id: 30,
            name: "亮色米粉",
            flavor: FlavorVector {
                intensity: 0.0,
                color: 0.90,
                sweet: 0.10,
                sour: 0.0,
                salty: 0.0,
            },
        },
    ]
}

pub fn bait_similarity(bait: FlavorVector, preference: FlavorVector) -> f64 {
    let squared_distance: f64 = bait
        .values()
        .into_iter()
        .zip(preference.values())
        .map(|(left, right)| (left - right).powi(2))
        .sum();
    (1.0 - (squared_distance / 5.0).sqrt()).clamp(0.0, 1.0)
}

fn treasure_winning_rolls(miss_probability: f64) -> u16 {
    ((TARGET_TREASURE_PROBABILITY_PER_ROUND / miss_probability.max(f64::EPSILON))
        * f64::from(TREASURE_ROLL_SCALE))
    .round()
    .clamp(0.0, f64::from(TREASURE_ROLL_SCALE)) as u16
}

fn treasure_roll_succeeds(roll: u16, miss_probability: f64) -> bool {
    roll < treasure_winning_rolls(miss_probability)
}

fn special_fish_winning_rolls(catch_probability: f64) -> u16 {
    ((TARGET_SPECIAL_FISH_PROBABILITY_PER_ROUND
        / catch_probability.max(f64::EPSILON))
        * f64::from(SPECIAL_FISH_ROLL_SCALE))
    .round()
    .clamp(0.0, f64::from(SPECIAL_FISH_ROLL_SCALE)) as u16
}

fn special_fish_roll_succeeds(roll: u16, catch_probability: f64) -> bool {
    roll < special_fish_winning_rolls(catch_probability)
}

fn special_fish_feature(fish_id: i64) -> Option<&'static str> {
    match fish_id {
        41 => Some("鱼身缠满番茄酱色的面条纹路，三颗圆滚滚的肉丸斑点随着摆尾轻轻晃动。"),
        42 => Some("金黄鱼身像刚烤好的薄饼，奶酪色鳞片间整齐散着几枚红色圆斑。"),
        43 => Some("它有三道软乎乎的背峰和一双水蓝色小鳍，离水后还在好奇地眨眼。"),
        54 => Some("透明头罩里闪着青蓝指示灯，短触腕上的电路纹会随着呼吸一格格亮起。"),
        55 => Some("焦糖顶层轻轻晃动，布丁本体两侧长着小鱼鳍，尾巴摆起来像一把软勺子。"),
        56 => Some("珍珠粉色的长鳍像层层裙摆，头顶小皇冠歪了一点，却完全不影响它的从容。"),
        _ => None,
    }
}

fn catch_candidates<'a>(
    bait: &BaitProfile,
    fish: &'a [FishProfile],
) -> Vec<(&'a FishProfile, f64, f64, f64)> {
    let mut candidates: Vec<(&FishProfile, f64, f64, f64)> = fish
        .iter()
        .filter(|profile| profile.rarity != FishRarity::Special)
        .map(|profile| {
            let similarity = bait_similarity(bait.flavor, profile.preference);
            let threshold = profile.minimum_similarity;
            let fit_progress =
                ((similarity - threshold) / (1.0 - threshold).max(f64::EPSILON)).clamp(0.0, 1.0);
            let weight =
                FISH_FIT_WEIGHT_FLOOR + (1.0 - FISH_FIT_WEIGHT_FLOOR) * fit_progress.powi(2);
            (profile, similarity, weight, fit_progress)
        })
        .filter(|(profile, similarity, _, _)| *similarity >= profile.minimum_similarity)
        .collect();
    candidates.sort_by(|left, right| right.1.total_cmp(&left.1));
    candidates
}

fn rarity_draw_weight(rarity: FishRarity) -> f64 {
    match rarity {
        FishRarity::Common => 38.0,
        FishRarity::Uncommon => 25.0,
        FishRarity::Rare => 17.0,
        FishRarity::Epic => 12.0,
        FishRarity::Legendary => 8.0,
        FishRarity::Special => 0.0,
    }
}

fn candidate_draw_weights(candidates: &[(&FishProfile, f64, f64, f64)]) -> Vec<f64> {
    candidates
        .iter()
        .map(|candidate| {
            let rarity = candidate.0.rarity;
            let best_tier_fit = candidates
                .iter()
                .filter(|other| other.0.rarity == rarity)
                .map(|other| other.3)
                .max_by(f64::total_cmp)
                .unwrap_or(0.0);
            let tier_score = rarity_draw_weight(rarity)
                * (RARITY_READINESS_FLOOR + (1.0 - RARITY_READINESS_FLOOR) * best_tier_fit);
            let tier_fish_weight: f64 = candidates
                .iter()
                .filter(|other| other.0.rarity == rarity)
                .map(|other| other.2)
                .sum();

            tier_score * candidate.2 / tier_fish_weight.max(f64::EPSILON)
        })
        .collect()
}

fn current_catch_probability(candidates: &[(&FishProfile, f64, f64, f64)]) -> f64 {
    let best_fit_progress = candidates
        .iter()
        .map(|candidate| candidate.3)
        .max_by(f64::total_cmp)
        .unwrap_or(0.0);
    (MIN_CATCH_PROBABILITY + best_fit_progress * (MAX_CATCH_PROBABILITY - MIN_CATCH_PROBABILITY))
        .clamp(MIN_CATCH_PROBABILITY, MAX_CATCH_PROBABILITY)
}

pub fn bait_has_eligible_fish(bait: &BaitProfile, fish: &[FishProfile]) -> bool {
    !catch_candidates(bait, fish).is_empty()
}

pub fn fish_catch_chances(bait: &BaitProfile, fish: &[FishProfile]) -> Vec<FishCatchChance> {
    let candidates = catch_candidates(bait, fish);
    let mut chances: Vec<FishCatchChance> = fish
        .iter()
        .map(|profile| FishCatchChance {
            fish_id: profile.id,
            similarity: bait_similarity(bait.flavor, profile.preference),
            probability: 0.0,
        })
        .collect();
    if candidates.is_empty() {
        return chances;
    }

    let catch_probability = current_catch_probability(&candidates);
    let special_count = fish
        .iter()
        .filter(|profile| profile.rarity == FishRarity::Special)
        .count();
    let special_probability = if special_count > 0 {
        TARGET_SPECIAL_FISH_PROBABILITY_PER_ROUND.min(catch_probability)
    } else {
        0.0
    };
    let normal_probability = catch_probability - special_probability;
    let draw_weights = candidate_draw_weights(&candidates);
    let total_weight: f64 = draw_weights.iter().sum();

    for chance in &mut chances {
        if let Some((index, _candidate)) = candidates
            .iter()
            .enumerate()
            .find(|(_, candidate)| candidate.0.id == chance.fish_id)
        {
            chance.probability =
                normal_probability * draw_weights[index] / total_weight.max(f64::EPSILON);
        } else if special_count > 0
            && fish.iter().any(|profile| {
                profile.id == chance.fish_id && profile.rarity == FishRarity::Special
            })
        {
            chance.probability = special_probability / special_count as f64;
        }
    }
    chances
}

fn roll_legendary_treasure<R: Rng + ?Sized>(
    best_similarity: f64,
    miss_probability: f64,
    rng: &mut R,
) -> Option<RoundOutcome> {
    let roll = rng.random_range(0..TREASURE_ROLL_SCALE);
    if !treasure_roll_succeeds(roll, miss_probability) {
        return None;
    }
    let treasures = legendary_treasure_seeds();
    let treasure = treasures
        .choose(rng)
        .expect("legendary treasure pool is not empty");
    Some(RoundOutcome::TreasureFound {
        treasure_id: treasure.id,
        treasure_name: treasure.name.to_owned(),
        description: treasure.description.to_owned(),
        best_similarity,
    })
}

fn resolve_round_internal<R: Rng + ?Sized>(
    bait: &BaitProfile,
    fish: &[FishProfile],
    texts: &OutcomeTextCatalog,
    force_catch: bool,
    rng: &mut R,
) -> RoundOutcome {
    let best_similarity = fish
        .iter()
        .filter(|profile| profile.rarity != FishRarity::Special)
        .map(|profile| bait_similarity(bait.flavor, profile.preference))
        .max_by(f64::total_cmp)
        .unwrap_or(0.0);
    let candidates = catch_candidates(bait, fish);

    if candidates.is_empty() {
        if let Some(treasure) = roll_legendary_treasure(best_similarity, 1.0, rng) {
            return treasure;
        }
        return RoundOutcome::Missed {
            reason: "这份鱼饵与今天所有鱼的隐藏偏好都相差太远，因此完全没有中鱼可能。".to_owned(),
            best_similarity,
            below_similarity_threshold: true,
        };
    }

    let catch_probability = current_catch_probability(&candidates);
    if !force_catch && !rng.random_bool(catch_probability) {
        if let Some(treasure) =
            roll_legendary_treasure(best_similarity, 1.0 - catch_probability, rng)
        {
            return treasure;
        }
        return RoundOutcome::Missed {
            reason: texts
                .misses
                .choose(rng)
                .cloned()
                .unwrap_or_else(|| "这一竿没有鱼。".to_owned()),
            best_similarity,
            below_similarity_threshold: false,
        };
    }

    let special_profiles: Vec<&FishProfile> = fish
        .iter()
        .filter(|profile| profile.rarity == FishRarity::Special)
        .collect();
    let special_catch = !force_catch
        && !special_profiles.is_empty()
        && special_fish_roll_succeeds(
            rng.random_range(0..SPECIAL_FISH_ROLL_SCALE),
            catch_probability,
        );
    let (profile, similarity) = if special_catch {
        let profile = special_profiles
            .choose(rng)
            .expect("special fish pool is not empty");
        (*profile, bait_similarity(bait.flavor, profile.preference))
    } else {
        let draw_weights = candidate_draw_weights(&candidates);
        let total_weight: f64 = draw_weights.iter().sum();
        let mut target = rng.random_range(0.0..total_weight.max(f64::EPSILON));
        let mut selected = candidates[0];
        for (candidate, draw_weight) in candidates.iter().zip(draw_weights) {
            selected = *candidate;
            if target <= draw_weight {
                break;
            }
            target -= draw_weight;
        }
        (selected.0, selected.1)
    };
    let weight_kg = rng.random_range(profile.min_weight_kg..=profile.max_weight_kg);
    let weight_progress = ((weight_kg - profile.min_weight_kg)
        / (profile.max_weight_kg - profile.min_weight_kg).max(f64::EPSILON))
    .cbrt();
    let length_cm =
        profile.min_length_cm + (profile.max_length_cm - profile.min_length_cm) * weight_progress;
    let process_description = texts
        .catches
        .choose(rng)
        .cloned()
        .unwrap_or_else(|| "浮标下沉，这一竿钓到了鱼。".to_owned());
    let feature_description = special_fish_feature(profile.id)
        .map(str::to_owned)
        .unwrap_or_else(|| {
            texts
                .features
                .choose(rng)
                .cloned()
                .unwrap_or_else(|| "这条鱼的体态很匀称。".to_owned())
        });
    let description = format!("{process_description} {feature_description}");

    RoundOutcome::Caught {
        fish_id: profile.id,
        fish_name: profile.name.clone(),
        rarity: profile.rarity,
        length_cm,
        weight_kg,
        value: weight_kg * profile.price_per_kg,
        similarity,
        description,
    }
}

pub fn resolve_round<R: Rng + ?Sized>(
    bait: &BaitProfile,
    fish: &[FishProfile],
    texts: &OutcomeTextCatalog,
    rng: &mut R,
) -> RoundOutcome {
    resolve_round_internal(bait, fish, texts, false, rng)
}

pub fn resolve_instant_hook_round<R: Rng + ?Sized>(
    bait: &BaitProfile,
    fish: &[FishProfile],
    texts: &OutcomeTextCatalog,
    rng: &mut R,
) -> RoundOutcome {
    resolve_round_internal(bait, fish, texts, true, rng)
}

#[cfg(test)]
mod tests {
    use super::*;
    use rand::{SeedableRng, rngs::StdRng};

    fn vector(value: f64) -> FlavorVector {
        FlavorVector {
            intensity: value,
            color: value,
            sweet: value,
            sour: value,
            salty: value,
        }
    }

    #[test]
    fn identical_vectors_have_full_similarity() {
        assert_eq!(bait_similarity(vector(0.4), vector(0.4)), 1.0);
    }

    #[test]
    fn very_different_bait_is_completely_excluded() {
        let fish = [FishProfile {
            id: 1,
            name: "测试鱼".to_owned(),
            price_per_kg: 10.0,
            rarity: FishRarity::Common,
            minimum_similarity: FishRarity::Common.minimum_similarity(),
            min_length_cm: 10.0,
            max_length_cm: 20.0,
            min_weight_kg: 0.1,
            max_weight_kg: 0.5,
            preference: vector(1.0),
        }];
        let texts = OutcomeTextCatalog {
            catches: vec!["中鱼".to_owned()],
            misses: vec!["空军".to_owned()],
            features: vec!["特征".to_owned()],
        };
        let mut rng = StdRng::seed_from_u64(1);
        let outcome = resolve_round(
            &BaitProfile {
                name: "测试饵".to_owned(),
                flavor: vector(0.0),
            },
            &fish,
            &texts,
            &mut rng,
        );
        assert!(matches!(
            outcome,
            RoundOutcome::Missed {
                below_similarity_threshold: true,
                ..
            }
        ));
    }

    #[test]
    fn price_bands_define_rarity_and_similarity_thresholds() {
        assert_eq!(FishRarity::from_price(20.0), FishRarity::Common);
        assert_eq!(FishRarity::from_price(20.01), FishRarity::Uncommon);
        assert_eq!(FishRarity::from_price(40.01), FishRarity::Rare);
        assert_eq!(FishRarity::from_price(55.01), FishRarity::Epic);
        assert_eq!(FishRarity::from_price(150.0), FishRarity::Legendary);
        assert_eq!(FishRarity::Common.minimum_similarity(), 0.40);
        assert_eq!(FishRarity::Legendary.minimum_similarity(), 0.90);
        assert_eq!(FishRarity::for_species(41, 1_000.0), FishRarity::Special);
        assert_eq!(FishRarity::for_species(54, 1_000.0), FishRarity::Special);
    }

    #[test]
    fn admin_catch_chances_match_the_live_selection_rules() {
        let regular = FishProfile {
            id: 1,
            name: "普通测试鱼".to_owned(),
            price_per_kg: 10.0,
            rarity: FishRarity::Common,
            minimum_similarity: 0.4,
            min_length_cm: 10.0,
            max_length_cm: 20.0,
            min_weight_kg: 0.1,
            max_weight_kg: 0.5,
            preference: vector(0.4),
        };
        let special = FishProfile {
            id: 41,
            name: "特殊测试鱼".to_owned(),
            rarity: FishRarity::Special,
            ..regular.clone()
        };
        let bait = BaitProfile {
            name: "测试饵".to_owned(),
            flavor: vector(0.4),
        };

        let chances = fish_catch_chances(&bait, &[regular, special]);
        let regular_probability = chances
            .iter()
            .find(|chance| chance.fish_id == 1)
            .expect("regular chance")
            .probability;
        let special_probability = chances
            .iter()
            .find(|chance| chance.fish_id == 41)
            .expect("special chance")
            .probability;

        assert!((regular_probability - 0.695).abs() < 0.000_001);
        assert!((special_probability - 0.005).abs() < 0.000_001);
        assert!((regular_probability + special_probability - 0.70).abs() < 0.000_001);
    }

    #[test]
    fn rarity_is_selected_before_species_count_can_crowd_out_legendary_fish() {
        let make_fish = |id, rarity: FishRarity| FishProfile {
            id,
            name: format!("{rarity:?}测试鱼"),
            price_per_kg: 10.0,
            rarity,
            minimum_similarity: rarity.minimum_similarity(),
            min_length_cm: 10.0,
            max_length_cm: 20.0,
            min_weight_kg: 0.1,
            max_weight_kg: 0.5,
            preference: vector(0.10),
        };
        let fish = vec![
            make_fish(1, FishRarity::Common),
            make_fish(2, FishRarity::Uncommon),
            make_fish(3, FishRarity::Rare),
            make_fish(4, FishRarity::Epic),
            make_fish(5, FishRarity::Legendary),
            make_fish(41, FishRarity::Special),
        ];
        let bait = BaitProfile {
            name: "九成匹配测试饵".to_owned(),
            flavor: vector(0.0),
        };

        let chances = fish_catch_chances(&bait, &fish);
        let legendary_probability = chances
            .iter()
            .find(|chance| chance.fish_id == 5)
            .expect("legendary chance")
            .probability;
        let total_probability: f64 = chances.iter().map(|chance| chance.probability).sum();

        assert!(legendary_probability > 0.01);
        assert!((total_probability - 0.60).abs() < 0.000_001);
    }

    #[test]
    fn legendary_fish_require_ninety_percent_similarity_to_enter_the_draw() {
        let make_fish = |preference| FishProfile {
            id: 1,
            name: "传说测试鱼".to_owned(),
            price_per_kg: 1_000.0,
            rarity: FishRarity::Legendary,
            minimum_similarity: FishRarity::Legendary.minimum_similarity(),
            min_length_cm: 10.0,
            max_length_cm: 20.0,
            min_weight_kg: 0.1,
            max_weight_kg: 0.5,
            preference,
        };
        let texts = OutcomeTextCatalog {
            catches: vec!["中鱼".to_owned()],
            misses: vec!["空军".to_owned()],
            features: vec!["特征".to_owned()],
        };
        let bait = BaitProfile {
            name: "测试饵".to_owned(),
            flavor: vector(0.0),
        };

        let mut rng = StdRng::seed_from_u64(2);
        let below_threshold = resolve_round(&bait, &[make_fish(vector(0.11))], &texts, &mut rng);
        assert!(matches!(
            below_threshold,
            RoundOutcome::Missed {
                below_similarity_threshold: true,
                ..
            }
        ));

        let at_threshold = resolve_round(&bait, &[make_fish(vector(0.10))], &texts, &mut rng);
        assert!(!matches!(
            at_threshold,
            RoundOutcome::Missed {
                below_similarity_threshold: true,
                ..
            }
        ));
    }

    #[test]
    fn seeded_fish_are_distributed_across_all_rarity_bands() {
        let counts = fish_species_seeds()
            .into_iter()
            .fold([0_u32; 6], |mut counts, fish| {
                let index = match FishRarity::for_species(fish.id, fish.price_per_kg) {
                    FishRarity::Common => 0,
                    FishRarity::Uncommon => 1,
                    FishRarity::Rare => 2,
                    FishRarity::Epic => 3,
                    FishRarity::Legendary => 4,
                    FishRarity::Special => 5,
                };
                counts[index] += 1;
                counts
            });
        assert_eq!(counts, [19, 13, 12, 10, 6, 6]);
    }

    #[test]
    fn each_outcome_category_has_thirty_descriptions() {
        assert_eq!(CATCH_DESCRIPTIONS.len(), 30);
        assert_eq!(MISS_DESCRIPTIONS.len(), 30);
        assert_eq!(FISH_FEATURE_DESCRIPTIONS.len(), 30);
        assert_eq!(outcome_description_seeds().len(), 90);
    }

    #[test]
    fn legendary_treasure_roll_keeps_the_final_round_rate_near_half_a_percent() {
        for miss_probability in [1.0, 0.9, 0.3] {
            let winning_rolls = (0..TREASURE_ROLL_SCALE)
                .filter(|roll| treasure_roll_succeeds(*roll, miss_probability))
                .count();
            let conditional_probability = winning_rolls as f64 / f64::from(TREASURE_ROLL_SCALE);
            let final_probability = miss_probability * conditional_probability;
            assert!((final_probability - 0.005).abs() <= 0.000_05);
        }
        assert_eq!(treasure_winning_rolls(1.0), 50);
        assert_eq!(treasure_winning_rolls(0.3), 167);
        assert_eq!(legendary_treasure_seeds().len(), 6);
    }

    #[test]
    fn special_fish_final_rate_matches_the_half_percent_mystery_rate() {
        for catch_probability in [0.1, 0.4, 0.7, 1.0] {
            let winning_rolls = (0..SPECIAL_FISH_ROLL_SCALE)
                .filter(|roll| special_fish_roll_succeeds(*roll, catch_probability))
                .count();
            let conditional_probability =
                winning_rolls as f64 / f64::from(SPECIAL_FISH_ROLL_SCALE);
            let final_probability = catch_probability * conditional_probability;
            assert!((final_probability - 0.005).abs() <= 0.000_05);
        }
        let special_fish: Vec<FishSpeciesSeed> = fish_species_seeds()
            .into_iter()
            .filter(|fish| {
                FishRarity::for_species(fish.id, fish.price_per_kg) == FishRarity::Special
            })
            .collect();
        assert_eq!(special_fish.len(), 6);
        assert!(special_fish.iter().all(|fish| fish.price_per_kg == 1_000.0));
    }

    #[test]
    fn instant_hook_forces_a_catch_when_the_bait_has_an_eligible_fish() {
        let regular = FishProfile {
            id: 1,
            name: "测试鱼".to_owned(),
            price_per_kg: 10.0,
            rarity: FishRarity::Common,
            minimum_similarity: FishRarity::Common.minimum_similarity(),
            min_length_cm: 10.0,
            max_length_cm: 20.0,
            min_weight_kg: 0.1,
            max_weight_kg: 0.5,
            preference: vector(0.4),
        };
        let special = FishProfile {
            id: 54,
            name: "太空科技测试鱼".to_owned(),
            rarity: FishRarity::Special,
            ..regular.clone()
        };
        let fish = [regular, special];
        let bait = BaitProfile {
            name: "测试饵".to_owned(),
            flavor: vector(0.4),
        };
        let texts = OutcomeTextCatalog {
            catches: vec!["中鱼".to_owned()],
            misses: vec!["空军".to_owned()],
            features: vec!["特征".to_owned()],
        };

        for seed in 0..100 {
            let mut rng = StdRng::seed_from_u64(seed);
            let outcome = resolve_instant_hook_round(&bait, &fish, &texts, &mut rng);
            assert!(matches!(
                outcome,
                RoundOutcome::Caught {
                    rarity: FishRarity::Common,
                    ..
                }
            ));
        }
    }
}
