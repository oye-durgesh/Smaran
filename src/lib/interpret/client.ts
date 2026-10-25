import type { AppState } from "../types";
import type { Interpretation, InterpretSession } from "./schema";
import { interpretLocally } from "../nlu/intents";
import { validateDraft } from "./schema";

export async function requestInterpretation(transcript: string, state: AppState, session?: InterpretSession): Promise<Interpretation> {
  const payload = {
    transcript,
    session,
    family: state.family.map((m) => ({ id: m.id, name: m.name, relationship: m.relationship })),
    appointments: state.appointments.map((a) => ({
      id: a.id,
      familyMemberId: a.familyMemberId,
      doctor: a.doctor,
      date: a.date,
      time: a.time,
      status: a.status,
    })),
  };
  try {
    const res = await fetch("/api/interpret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as Interpretation & { error?: string };
    if (!res.ok || data.error) throw new Error(data.error || "interpret_failed");
    return data;
  } catch {
    const draft = validateDraft(interpretLocally(transcript, state, session));
    return { ...draft, session: session ?? "general_reminder", provider: "rules", claudeUsed: false };
  }
}
