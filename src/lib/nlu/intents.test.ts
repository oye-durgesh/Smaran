import { describe, expect, it } from "vitest";
import { classifySmaranIntent, interpretLocally } from "./intents";
import type { AppState } from "../types";
import { addCalendarDays } from "../timezone";

const family = [
  { id: "mummy", name: "Mummy", relationship: "Mother" as const, avatar: { initials: "M", tone: "peach" as const }, createdAt: "2026-01-01T00:00" },
  { id: "papa", name: "Papa", relationship: "Father" as const, avatar: { initials: "P", tone: "sand" as const }, createdAt: "2026-01-01T00:00" },
];

const appointments = [
  {
    id: "a1",
    familyMemberId: "papa",
    doctor: "Dr Sharma",
    date: "2026-10-26",
    time: "11:00",
    status: "upcoming" as const,
    documentIds: [],
    reminders: [],
    createdAt: "2026-10-20T10:00",
    source: "sample" as const,
  },
  {
    id: "a2",
    familyMemberId: "mummy",
    doctor: "Dr Mehta",
    date: "2026-10-27",
    time: "09:00",
    status: "upcoming" as const,
    documentIds: [],
    reminders: [],
    createdAt: "2026-10-20T10:00",
    source: "sample" as const,
  },
];

const state = { family, appointments } as Pick<AppState, "family" | "appointments">;

const now = { date: "2026-10-25", time: "14:00", weekday: 0, timestamp: "2026-10-25T14:00", timezone: "Asia/Kolkata" };

describe("classifySmaranIntent", () => {
  it("does not default unknown text to a reminder", () => {
    expect(classifySmaranIntent("Should we do it tomorrow?")).toBe("unknown");
    expect(classifySmaranIntent("")).toBe("unknown");
    expect(classifySmaranIntent("asdf qwerty hello")).toBe("unknown");
  });

  it("routes the required examples", () => {
    expect(classifySmaranIntent("Mummy ko kal subah 9 baje sugar ki dawa leni hai.")).toBe("medicine_reminder");
    expect(classifySmaranIntent("Papa ka BP aaj 128/82 tha.")).toBe("health_measurement");
    expect(classifySmaranIntent("Papa ki age 62 hai.")).toBe("family_fact");
    expect(classifySmaranIntent("Papa ke last appointment mein kya bola tha?")).toBe("ask_question");
    expect(classifySmaranIntent("Mummy ki dawa kal pharmacy se pick up karni hai.")).toBe("pickup_reminder");
    expect(classifySmaranIntent("Papa ka doctor appointment kal 11 baje hai.")).toBe("appointment_create_or_update");
    expect(classifySmaranIntent("Papa ka appointment ho gaya")).toBe("appointment_complete");
    expect(classifySmaranIntent("appointment done")).toBe("appointment_complete");
  });
});

describe("interpretLocally", () => {
  it("extracts medicine reminder without inventing dose or daily frequency", () => {
    const draft = interpretLocally("Mummy ko kal subah 9 baje sugar ki dawa leni hai.", state, "general_reminder", now);
    expect(draft.intent).toBe("medicine_reminder");
    expect(draft.memberId).toBe("mummy");
    expect(draft.time).toBe("09:00");
    expect(draft.date).toBe(addCalendarDays(now.date, 1));
    expect(draft.frequency).toBe("once");
    expect(draft.medicineName?.toLowerCase()).toBe("sugar");
  });

  it("treats BP as a measurement draft", () => {
    const draft = interpretLocally("Papa ka BP aaj 128/82 tha.", state, "health_update", now);
    expect(draft.intent).toBe("health_measurement");
    expect(draft.measurementValue).toBe("128/82");
    expect(draft.requiresConfirmation).toBe(true);
  });

  it("proposes family age without creating a reminder", () => {
    const draft = interpretLocally("Papa ki age 62 hai.", state, "family", now);
    expect(draft.intent).toBe("family_fact");
    expect(draft.familyFact).toEqual({ field: "age", value: 62 });
  });

  it("keeps pickup distinct from take-medicine", () => {
    const draft = interpretLocally("Mummy ki dawa kal pharmacy se pick up karni hai.", state, undefined, now);
    expect(draft.intent).toBe("pickup_reminder");
    expect(draft.kind).toBe("pickup");
  });

  it("completes a unique appointment and refuses to create one", () => {
    const draft = interpretLocally("Papa ka appointment ho gaya.", state, "appointment", now);
    expect(draft.intent).toBe("appointment_complete");
    expect(draft.matchedAppointmentIds).toEqual(["a1"]);
  });

  it("asks which appointment when complete is ambiguous", () => {
    const extra = {
      ...state,
      appointments: [
        ...state.appointments,
        { ...appointments[0], id: "a3", doctor: "Dr Gupta" },
      ],
    };
    const draft = interpretLocally("Papa ka appointment ho gaya.", extra, "appointment", now);
    expect(draft.missingFields).toContain("matchedRecordId");
    expect(draft.clarificationQuestion?.toLowerCase()).toMatch(/which/);
  });

  it("asks for time instead of guessing", () => {
    const draft = interpretLocally("Kal shaam reminder laga do.", state, "general_reminder", now);
    expect(draft.intent === "unknown" || draft.missingFields.includes("time") || draft.missingFields.includes("person")).toBe(true);
  });

  it("does not write — draft only", () => {
    const before = JSON.stringify(state);
    interpretLocally("Mummy ko kal subah 9 baje sugar ki dawa leni hai.", state, undefined, now);
    expect(JSON.stringify(state)).toBe(before);
  });
});
