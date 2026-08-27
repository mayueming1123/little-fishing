# 桌面版发布检查

检查日期：2026-08-27

版本：0.1.6

## Windows x64 / NSIS

- 安装包：`src-tauri/target/release/bundle/nsis/小小钓鱼_0.1.6_x64-setup.exe`
- 安装包大小：39,134,793 字节
- SHA-256：`2430069043EC33D72D073612477D7FEF01D20B6949DA14AFE34BB0B1BEC879A7`
- Release 主程序大小：47,470,592 字节
- 文件版本：0.1.6

## macOS 通用 DMG

- 构建方式：推送 `codex/macos-package` 分支后由 GitHub Actions 自动构建。
- 架构：Apple Silicon + Intel 通用版。
- 签名：ad-hoc 签名，未经过 Apple 公证。
- Actions 产物名：`little-fishing-macos-universal`。

## 已通过

- 前端 TypeScript 类型检查成功。
- 前端 15 个测试文件、37 项测试全部通过。
- 前端生产构建成功。
- Rust 33 项单元测试全部通过。
- Windows Rust release 编译成功。
- Windows NSIS 安装包生成成功。
- Windows GUI 启动竞态修复完成，独立 Release 存活检查通过且没有新增 Windows 崩溃事件。
- `git diff --check` 未发现空白错误。

## 0.1.6 主要更新

- 钓鱼主页改为直接展示当前伙伴皮肤，并以当前鱼饵、金币和累计排泄量替换重复统计信息。
- 原侧边栏改为底部半透明 Dock，导航项使用图标、文字和类似 macOS 的悬停放大效果。
- 新增每日“水下悄悄话”，使用 20 条组合语句透露鱼类偏好的部分原料名称，不公开比例、五维数值和匹配度。
- 修复 Windows 正式安装版中，主页可能在 SQLite 状态完成注册前读取数据并导致应用闪退的问题。

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
