import { describe, expect, it } from "vitest";
import { splitUtterances } from "./split";

describe("splitUtterances", () => {
  it("keeps a single request intact", () => {
    expect(splitUtterances("Papa ka BP aaj 128/82 tha.")).toEqual(["Papa ka BP aaj 128/82 tha."]);
  });

  it("splits multi-action Hinglish joined by aur", () => {
    const parts = splitUtterances("Papa ka BP aaj 128/82 tha aur Mummy ko kal 9 baje sugar ki dawa leni hai.");
    expect(parts.length).toBe(2);
    expect(parts[0]).toMatch(/BP/);
    expect(parts[1]).toMatch(/dawa/);
  });
});
