import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DailyFishHintCard, dailyFishHintTemplates, formatDailyFishHint } from "./DailyFishHintCard";

describe("DailyFishHintCard", () => {
  it("keeps twenty fill-in templates and reveals names without ratios", () => {
    expect(dailyFishHintTemplates).toHaveLength(20);
    expect(dailyFishHintTemplates.every((template) => template.includes("{fish}") && template.includes("{bait}"))).toBe(true);
    const text = formatDailyFishHint({ localDate: "2026-08-27", fishName: "鲫鱼", ingredientNames: ["玉米粉", "麦香粉"] });
    expect(text).toContain("鲫鱼");
    expect(text).toContain("玉米粉和麦香粉");
    expect(text).not.toMatch(/%|比例|0\./);
  });

  it("renders the daily clue card", () => {
    render(<DailyFishHintCard hint={{ localDate: "2026-08-27", fishName: "鲤鱼", ingredientNames: ["虾粉"] }} />);
    expect(screen.getByText("水下悄悄话")).toBeTruthy();
    expect(screen.getByText(/鲤鱼/)).toBeTruthy();
  });
});
