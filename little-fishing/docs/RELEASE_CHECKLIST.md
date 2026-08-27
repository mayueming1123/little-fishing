# 桌面版发布检查

检查日期：2026-08-27

版本：0.1.5

## Windows x64 / NSIS

- 安装包：`src-tauri/target/release/bundle/nsis/小小钓鱼_0.1.5_x64-setup.exe`
- 安装包大小：39,138,765 字节
- SHA-256：`9D92D706C52D231EB7C36D50915B1C60C162A336A41CF95F9E0B92035C83A309`
- Release 主程序大小：47,469,568 字节
- 文件版本：0.1.5

## macOS 通用 DMG

- 构建方式：推送 `codex/macos-package` 分支后由 GitHub Actions 自动构建。
- 架构：Apple Silicon + Intel 通用版。
- 签名：ad-hoc 签名，未经过 Apple 公证。
- Actions 产物名：`little-fishing-macos-universal`。

## 已通过

- 前端 TypeScript 类型检查成功。
- 前端 14 个测试文件、35 项测试全部通过。
- 前端生产构建成功。
- Rust 32 项单元测试全部通过。
- Windows Rust release 编译成功。
- Windows NSIS 安装包生成成功。
- `git diff --check` 未发现空白错误。

## 0.1.5 主要更新

- 鱼饵页新增删除自定义配方与重置未保存修改；默认“综合试钓饵”保持不可删除。
- 悬浮提示重新区分事件、普通中鱼、特殊鱼和神秘奇遇，并按类型跳转到主页、鱼篓或藏宝室。
- 特殊鱼使用持续发光的小鱼提示，神秘奇遇使用发光宝箱提示；重要结果不会被后续普通事件覆盖。
- 新增侧边栏“藏宝室”，以每层 3 件藏品、可纵向延伸的展示架保存神秘奇遇物品。

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
