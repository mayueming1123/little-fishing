import { useEffect, useState, type CSSProperties } from "react";
import { defaultAppSettings, type AppSettings, type AppTheme, type BobberSkinId } from "../../domain/prototype";
import { bobberSkins } from "../bobber/skins";
import {
  clearBobberSkinPreview,
  getAppSettings,
  getSkinStoreState,
  previewBobberSkin,
  sendPrototypeNotification,
  updateAppSettings,
} from "../../ipc/client";

function ToggleSetting({ checked, disabled, label, description, onChange }: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  description: string;
  onChange: (checked: boolean) => void;
}) {
  return <label className={`settings-toggle ${disabled ? "disabled" : ""}`}>
    <span><strong>{label}</strong><small>{description}</small></span>
    <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
    <i aria-hidden="true" />
  </label>;
}

const themes: Array<{ value: AppTheme; label: string }> = [
  { value: "system", label: "跟随系统" },
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
];

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);
  const [saved, setSaved] = useState<AppSettings>(defaultAppSettings);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [ownedSkinIds, setOwnedSkinIds] = useState<BobberSkinId[]>(["orange"]);

  useEffect(() => {
    let cancelled = false;
    void getAppSettings()
      .then((value) => {
        if (cancelled) return;
        setSettings(value);
        setSaved(value);
        setSettingsLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setMessage("暂时无法读取当前设置，请重新打开设置页再试");
      });
    void getSkinStoreState()
      .then((store) => {
        if (!cancelled) setOwnedSkinIds(store.ownedSkinIds);
      })
      .catch(() => {
        if (!cancelled) setMessage((current) => current ?? "暂时无法读取已拥有的皮肤");
      });
    return () => {
      cancelled = true;
      void clearBobberSkinPreview().catch(() => undefined);
    };
  }, []);

  function patch(value: Partial<AppSettings>) {
    setSettings((current) => ({ ...current, ...value }));
    setMessage(null);
  }

  async function save() {
    setSaving(true);
    try {
      const next = await updateAppSettings(settings);
      setSettings(next);
      setSaved(next);
      await clearBobberSkinPreview().catch(() => undefined);
      setMessage("设置已保存并立即生效。");
    } catch (error) {
      setMessage(typeof error === "string" ? error : "设置没有保存成功");
    } finally {
      setSaving(false);
    }
  }

  async function chooseSkin(skinId: BobberSkinId) {
    patch({ bobberSkin: skinId });
    try {
      await previewBobberSkin(skinId);
      setMessage("正在桌面浮标上临时预览；离开设置页会恢复已保存皮肤。");
    } catch (error) {
      setMessage(typeof error === "string" ? error : "暂时无法预览这款皮肤");
    }
  }

  async function testNotification() {
    const sent = await sendPrototypeNotification();
    setMessage(sent ? "测试通知已发送。" : "通知已关闭，或当前处于浏览器预览模式。");
  }

  const dirty = JSON.stringify(settings) !== JSON.stringify(saved);
  const selectableSkinIds = new Set<BobberSkinId>(["orange", settings.bobberSkin, ...ownedSkinIds]);
  const availableSkins = bobberSkins.filter((skin) => selectableSkinIds.has(skin.value));
  return <section className="section-page">
    <div className="section-intro"><div><h2>设置</h2><p>这里只放日常会用到的选项。修改后点击保存，窗口行为和显示风格会立即更新。</p></div><span>{dirty ? "有未保存修改" : "已保存"}</span></div>
    <div className="settings-layout">
      <article className="paper-card settings-group"><h3>提醒与后台</h3>
        <ToggleSetting checked={settings.notificationsEnabled} label="浮标旁提示" description="过程事件和每一竿结果会在浮标旁轻轻出现；关闭后不会补发错过的旧消息。" onChange={(value) => patch({ notificationsEnabled: value })} />
        <ToggleSetting checked={settings.autostartEnabled} label="开机自动启动" description="登录 Windows 后在后台启动，只显示桌面浮标，不主动弹出主窗口。" onChange={(value) => patch({ autostartEnabled: value })} />
        <button className="quiet-button settings-test" disabled={!settings.notificationsEnabled} onClick={() => void testNotification()}>发送测试通知</button>
      </article>
      <article className="paper-card settings-group"><h3>桌面浮标</h3>
        <ToggleSetting checked={settings.bobberVisible} label="显示桌面浮标" description="关闭后仍可通过系统托盘打开主窗口和状态面板。" onChange={(value) => patch({ bobberVisible: value })} />
        <ToggleSetting checked={settings.bobberAlwaysOnTop} disabled={!settings.bobberVisible} label="浮标保持置顶" description="让浮标停留在普通窗口上方；全屏程序仍可能覆盖它。" onChange={(value) => patch({ bobberAlwaysOnTop: value })} />
      </article>
      <article className="paper-card settings-group settings-appearance"><h3>显示</h3>
        <div className="setting-copy"><strong>悬浮伙伴皮肤</strong><small>点击皮肤会立即在桌面浮标上临时预览；只有保存后才会永久生效。</small></div>
        <div className="skin-options" role="group" aria-label="悬浮伙伴皮肤">
          {availableSkins.map((skin) => <button
            type="button"
            className={`skin-option ${settings.bobberSkin === skin.value ? "active" : ""}`}
            aria-pressed={settings.bobberSkin === skin.value}
            key={skin.value}
            onClick={() => void chooseSkin(skin.value)}
          ><img src={skin.image} alt="" draggable={false} style={{ "--skin-preview-inset": `${skin.inset}%` } as CSSProperties} /><span>{skin.label}</span></button>)}
        </div>
        <div className="setting-copy"><strong>界面主题</strong><small>选择跟随 Windows，或固定使用浅色、深色外观。</small></div>
        <div className="theme-options" role="group" aria-label="界面主题">{themes.map((theme) => <button className={settings.theme === theme.value ? "active" : ""} key={theme.value} onClick={() => patch({ theme: theme.value })}>{theme.label}</button>)}</div>
        <ToggleSetting checked={settings.reducedMotion} label="减少动态效果" description="停止浮标呼吸与轻微摆动，更适合长时间放在屏幕一角。" onChange={(value) => patch({ reducedMotion: value })} />
      </article>
      <aside className="settings-save-card"><div><strong>设置保存在本机</strong><p>不需要登录，也不会同步到网络。关闭浮标不会停止正在进行的钓鱼。</p></div><button className="primary-button" disabled={!settingsLoaded || !dirty || saving} onClick={() => void save()}>{saving ? "正在保存…" : "保存设置"}</button>{message && <div className="error-strip" role="status">{message}</div>}</aside>
    </div>
  </section>;
}
