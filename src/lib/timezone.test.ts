import { describe, expect, it } from "vitest";
import { addCalendarDays, weekdayOf, zonedNow } from "./timezone";

describe("timezone", () => {
  it("returns Asia/Kolkata calendar parts", () => {
    const z = zonedNow("Asia/Kolkata", new Date("2026-10-25T08:30:00.000Z"));
    expect(z.timezone).toBe("Asia/Kolkata");
    expect(z.date).toBe("2026-10-25");
    expect(z.time).toBe("14:00");
  });

  it("adds calendar days without using the demo clock", () => {
    expect(addCalendarDays("2026-10-25", 1)).toBe("2026-10-26");
    expect(weekdayOf("2026-10-25")).toBe(0);
  });
});
