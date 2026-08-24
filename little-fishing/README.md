# 小小钓鱼

一个桌面端纯挂机钓鱼陪伴游戏。开始钓鱼后会自动进行一轮又一轮的等待，不设成长目标、装备压力或保底机制，主打写实、轻松和偶尔有点幽默的随机事件。

## 当前功能

- 桌面透明“猫咪钓鱼”悬浮图标、8 款可保存皮肤、系统托盘和紧凑状态面板
- 每竿 30 秒至 2 小时，只显示已经垂钓的时长
- 岸边、水面、钓组、动物与趣味插曲五类过程事件及中鱼/空军结果
- 每竿随机开场状态文案，主界面持续展示最近事件轨迹
- 空军后有 0.3% 概率发现隐藏传说宝物，图鉴在发现前只显示黑色剪影和“？？？”
- 40 种鱼、24 种鱼饵成分和每日重置的隐藏偏好
- 自由配置鱼饵比例，属性保持隐藏
- 40 种独立像素鱼图标、按固定鱼价划分的五级稀有度，以及已钓到/未钓到筛选
- 独立鱼篓集中显示尚未处理的鱼获，可选择吃掉或卖出；完整经过保留在钓鱼日志
- 猫咪皮肤商店：橙子猫免费，6 款分别使用 5,000～30,000 金币购买，另有 1 款在体重达到 1000 kg 后领取
- 本地 SQLite 存档和单轮离线结算
- 浮标旁应用内提示，不调用 PowerShell 系统通知
- 浅色、深色、减少动态效果和开机启动设置

## 技术栈

- Tauri 2
- React 19 + TypeScript + Vite
- Rust + SQLite（rusqlite）

## 本地开发

```powershell
npm install
npm run check
npm run tauri dev
```

运行桌面端需要 Rust stable-msvc、Microsoft C++ Build Tools（Desktop development with C++）和 WebView2 Runtime。

构建 Windows NSIS 安装包：

```powershell
npm run tauri build
```

macOS 通用版 DMG 通过 GitHub Actions 的 Mac 构建机生成，详见 [`docs/MACOS_BUILD.md`](docs/MACOS_BUILD.md)。

玩家玩法和完整功能见 [`docs/GAMEPLAY_AND_FEATURES.md`](docs/GAMEPLAY_AND_FEATURES.md)，详细实现状态见 [`docs/M0_STATUS.md`](docs/M0_STATUS.md)，鱼价数据来源见 [`docs/FISH_DATA_SOURCES.md`](docs/FISH_DATA_SOURCES.md)。

## 推荐开发环境

- [VS Code](https://code.visualstudio.com/)
- [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
