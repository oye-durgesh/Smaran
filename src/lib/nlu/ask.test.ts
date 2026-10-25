import { describe, expect, it } from "vitest";
import { answerQuestion } from "./ask";
import { createEmptyState } from "../seed";

describe("grounded ask", () => {
  it("returns no matching record on empty memory", () => {
    const state = createEmptyState();
    const answer = answerQuestion("Papa ki next appointment kab hai?", state);
    expect(answer.found).toBe(false);
    expect(answer.text.toLowerCase()).toMatch(/couldn.t find|no /);
  });

  it("does not invent a doctor from a question", () => {
    const state = createEmptyState();
    const answer = answerQuestion("Did Dr Sharma say to stop medicine?", state);
    expect(answer.found).toBe(false);
  });
});
