import { describe, expect, it } from "vitest";
import { formatElapsed, formatPlannedDuration } from "./time";

describe("formatElapsed", () => {
  it("shows a dash when no round is active", () => {
    expect(formatElapsed(null, 0)).toBe("—");
  });

  it("never shows a negative duration", () => {
    expect(formatElapsed("1970-01-01T00:00:01.000Z", 0)).toBe("00:00");
  });

  it("formats durations longer than an hour", () => {
    expect(formatElapsed("1970-01-01T00:00:00.000Z", 3_723_000)).toBe("1:02:03");
  });
});

describe("formatPlannedDuration", () => {
  it("keeps the configured thirty-second precision", () => {
    expect(formatPlannedDuration(30)).toBe("30秒");
    expect(formatPlannedDuration(5_430)).toBe("1小时 30分钟 30秒");
  });
});
