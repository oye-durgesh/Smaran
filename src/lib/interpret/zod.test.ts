import { describe, expect, it } from "vitest";
import { parseModelJson, proposedActionSchema } from "./zod";

describe("model output validation", () => {
  it("rejects malformed JSON", () => {
    expect(() => parseModelJson("not json")).toThrow("malformed_model_output");
  });

  it("rejects invented enum intents", () => {
    const parsed = proposedActionSchema.safeParse({ intent: "delete_everything", transcript: "x" });
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid dates", () => {
    const parsed = proposedActionSchema.safeParse({ intent: "unknown", transcript: "x", date: "tomorrow" });
    expect(parsed.success).toBe(false);
  });
});
