# macOS 安装包

项目通过 GitHub Actions 的 macOS 构建机生成通用版 DMG，同时支持 Apple Silicon 与 Intel Mac。

## 生成方式

1. 打开仓库的 **Actions** 页面。
2. 选择 **Build macOS DMG**。
3. 点击 **Run workflow**。
4. 构建完成后下载 `little-fishing-macos-universal` 产物并解压，即可取得 `.dmg`。

工作流会执行前端类型检查、测试与生产构建，再使用以下 Tauri 命令打包：

```bash
npm run tauri build -- --target universal-apple-darwin --bundles dmg
```

## 当前签名说明

当前自动构建使用 macOS ad-hoc 签名，不需要 Apple Developer 证书，适合开发测试和少量自用分发，但没有经过 Apple 公证。首次打开时，macOS 可能要求在 Finder 中右键选择“打开”，或前往“系统设置 → 隐私与安全性”确认允许运行。

如果后续要公开分发，应配置 Apple Developer ID 证书、App Store Connect API 密钥并启用公证，再将相应密钥保存到 GitHub Actions Secrets。

透明橘猫悬浮窗依赖 Tauri 的 `macOSPrivateApi`，该选项只在 `tauri.macos.conf.json` 中启用，不影响 Windows 构建。因为使用了这项私有 API，此版本适合通过 DMG 分发，不能提交到 Mac App Store。
