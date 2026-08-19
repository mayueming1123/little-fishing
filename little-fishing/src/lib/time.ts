export function formatElapsed(startTime: string | null, now = Date.now()): string {
  if (!startTime) return "—";
  const elapsed = Math.max(0, now - new Date(startTime).getTime());
  const totalSeconds = Math.floor(elapsed / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatClock(iso: string | null): string {
  if (!iso) return "尚未开始";
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

export function formatPlannedDuration(seconds: number): string {
  if (seconds <= 0) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return [
    hours > 0 ? `${hours}小时` : "",
    minutes > 0 ? `${minutes}分钟` : "",
    remainingSeconds > 0 ? `${remainingSeconds}秒` : "",
  ].filter(Boolean).join(" ");
}
