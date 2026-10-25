import { describe, expect, it } from "vitest";
import { parseInterpretRequest, validateDraft } from "./schema";
import type { IntentDraft } from "../nlu/intents";

describe("interpret schema", () => {
  it("rejects oversized transcripts", () => {
    const res = parseInterpretRequest({ transcript: "x".repeat(5000), family: [] });
    expect(res.ok).toBe(false);
  });

  it("accepts a valid body", () => {
    const res = parseInterpretRequest({ transcript: "Papa ka BP 120/80", session: "health_update", family: [{ id: "papa", name: "Papa" }] });
    expect(res.ok).toBe(true);
  });

  it("drops invalid dates", () => {
    const draft = validateDraft({
      intent: "medicine_reminder",
      transcript: "x",
      timezone: "Asia/Kolkata",
      date: "tomorrow",
      missingFields: [],
      assumptions: [],
      requiresConfirmation: true,
      confidence: 0.4,
    } as IntentDraft);
    expect(draft.date).toBeUndefined();
    expect(draft.missingFields).toContain("date");
  });
});
