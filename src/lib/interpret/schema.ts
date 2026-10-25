import { FAMILY_TIMEZONE, isDateKey, isTimeKey } from "../timezone";
import { SMARAN_INTENTS, type IntentDraft, type InterpretSession, type SmaranIntent } from "../nlu/intents";

export const SESSIONS: InterpretSession[] = ["general_reminder", "appointment", "medicine_reminder", "health_update", "ask", "document", "family"];

export const MAX_TRANSCRIPT_CHARS = 4000;

export interface InterpretRequest {
  transcript: string;
  session?: InterpretSession;
  family: { id: string; name: string; relationship?: string }[];
  appointments?: { id: string; familyMemberId: string; doctor: string; date: string; time: string; status: string }[];
}

export interface Interpretation extends IntentDraft {
  session: InterpretSession;
  provider: "rules" | "claude";
  claudeUsed: boolean;
}

export function parseInterpretRequest(body: unknown): { ok: true; value: InterpretRequest } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "invalid_body" };
  const rec = body as Record<string, unknown>;
  if (typeof rec.transcript !== "string") return { ok: false, error: "transcript_required" };
  if (rec.transcript.length > MAX_TRANSCRIPT_CHARS) return { ok: false, error: "transcript_too_long" };
  const session = rec.session;
  if (session != null && (typeof session !== "string" || !SESSIONS.includes(session as InterpretSession))) {
    return { ok: false, error: "invalid_session" };
  }
  const family = Array.isArray(rec.family)
    ? rec.family
        .filter((m): m is { id: string; name: string; relationship?: string } => Boolean(m && typeof m === "object" && typeof (m as { id: unknown }).id === "string" && typeof (m as { name: unknown }).name === "string"))
        .slice(0, 20)
    : [];
  return {
    ok: true,
    value: {
      transcript: rec.transcript,
      session: session as InterpretSession | undefined,
      family,
      appointments: Array.isArray(rec.appointments) ? (rec.appointments as InterpretRequest["appointments"]) : [],
    },
  };
}

export function validateDraft(draft: IntentDraft): IntentDraft {
  const missing = [...draft.missingFields];
  if (draft.date && !isDateKey(draft.date)) {
    missing.push("date");
    draft.date = undefined;
  }
  if (draft.time && !isTimeKey(draft.time)) {
    missing.push("time");
    draft.time = undefined;
  }
  if (!SMARAN_INTENTS.includes(draft.intent)) {
    return { ...draft, intent: "unknown", missingFields: [], requiresConfirmation: false, clarificationQuestion: "I could not interpret that safely." };
  }
  return {
    ...draft,
    timezone: draft.timezone || FAMILY_TIMEZONE,
    missingFields: [...new Set(missing)],
    requiresConfirmation: draft.intent !== "ask_question" && draft.intent !== "document_question" && draft.intent !== "unknown",
  };
}

export function sessionFromSpeak(ctx: string | undefined): InterpretSession {
  if (ctx === "appointments" || ctx === "appointment") return "appointment";
  if (ctx === "ask") return "ask";
  if (ctx === "documents" || ctx === "document") return "document";
  if (ctx === "family") return "family";
  if (ctx === "medicine") return "medicine_reminder";
  if (ctx === "health") return "health_update";
  return "general_reminder";
}

export type { SmaranIntent, InterpretSession };
