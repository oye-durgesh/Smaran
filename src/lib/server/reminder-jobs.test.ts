import { describe, expect, it, beforeEach } from "vitest";
import { enqueueReminderJob, processDueJobs, resetJobsForTests } from "./reminder-jobs";

describe("reminder jobs", () => {
  beforeEach(() => resetJobsForTests());

  it("is idempotent on the same key", () => {
    const a = enqueueReminderJob({ idempotencyKey: "r1:2026-10-26T09:00", reminderId: "r1", dueAt: "2026-10-26T09:00" });
    const b = enqueueReminderJob({ idempotencyKey: "r1:2026-10-26T09:00", reminderId: "r1", dueAt: "2026-10-26T09:00" });
    expect(a.id).toBe(b.id);
  });

  it("does not claim delivery without VAPID", () => {
    enqueueReminderJob({ idempotencyKey: "due", reminderId: "r1", dueAt: "2020-01-01T00:00" });
    const result = processDueJobs("2026-10-26T09:00");
    expect(result.delivered).toBe(0);
    expect(result.reason).toMatch(/VAPID/);
    expect(result.processed[0]?.status).toBe("blocked");
  });
});
