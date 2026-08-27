# 桌面版发布检查

检查日期：2026-08-27

版本：0.1.4

## Windows x64 / NSIS

- 安装包：`src-tauri/target/release/bundle/nsis/小小钓鱼_0.1.4_x64-setup.exe`
- 安装包大小：39,127,228 字节
- SHA-256：`5C36D76291496BAEF37DBB22A291711175FCB20E2BE87BEFB027C43F9B446C28`
- Release 主程序大小：47,465,472 字节
- 文件版本：0.1.4

## macOS 通用 DMG

- 构建方式：推送 `codex/macos-package` 分支后由 GitHub Actions 自动构建。
- 架构：Apple Silicon + Intel 通用版。
- 签名：ad-hoc 签名，未经过 Apple 公证。
- Actions 产物名：`little-fishing-macos-universal`。

## 已通过

- 前端 TypeScript 类型检查成功。
- 前端 13 个测试文件、28 项测试全部通过。
- 前端生产构建成功。
- Rust 32 项单元测试全部通过。
- Windows Rust release 编译成功。
- Windows NSIS 安装包生成成功。
- `git diff --check` 未发现空白错误。

## 0.1.4 主要更新

- 鱼类扩展至 53 种，鱼类大全支持钓获状态与稀有度组合筛选。
- 鱼饵成分扩展至 30 种，支持保存多个配方、查看五维雷达图，并为每种原料加入独立像素风图标。
- 特殊鱼分流调整为中鱼后的合计 2%，三种特殊鱼固定价格提高到 1,000 元/公斤，并加入对应成就皮肤。
- 神秘奇遇最终单竿总概率调整为约 0.5%，新增“包装精致的香水”以及对应白富美皮肤。
- 商店新增 50,000 金币的 TOM 猫皮肤，以及永久缩短 30% 等待时间的 Buff。
- 悬浮皮肤总数增至 20 款；修复购买后皮肤列表、免费皮肤切换与预览尺寸问题。
- 悬浮提示统一为跟随角色移动的感叹号；打开简要面板或完整窗口时会清除提示。
- 管理模式精简为查看鱼类概率、五维数据、偏好来源和修改金币。

## 发布前遗留

- Windows 安装包尚未进行 Authenticode 数字签名，Windows 可能显示“未知发布者”。
- macOS 构建使用 ad-hoc 签名且未公证，首次打开可能需要在 Finder 中右键选择“打开”。
- 应用标识 `com.xiaoxiaodiaoyu.app` 会触发 Tauri 的 macOS 命名提示，但暂不修改，以避免改变已有存档目录。
- 当前版本没有自动更新渠道，新版本仍需重新下载安装。

## 重建命令

Windows：

```powershell
npm run tauri build -- --bundles nsis
```

macOS 通用版：

```bash
npm run tauri build -- --target universal-apple-darwin --bundles dmg
```
