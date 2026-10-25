import "server-only";
import { interpretLocally, type IntentDraft } from "@/lib/nlu/intents";
import type { AppState } from "@/lib/types";
import { zonedNow } from "@/lib/timezone";
import { parseInterpretRequest, validateDraft, type Interpretation } from "@/lib/interpret/schema";
import { anthropicApiKey, anthropicModel, claudeConfigured } from "./env";

const SYSTEM = `You interpret family-care notes for SMARAN. Return JSON only.
Never invent medicine names, doses, frequency, doctor names, or times.
If unsure, intent must be "unknown" and include one clarificationQuestion.
Use timezone Asia/Kolkata. Resolve today/tomorrow/weekdays from the provided nowDate.
Do not write to storage. requiresConfirmation is true for any write.`;

function toState(req: { family: { id: string; name: string }[]; appointments?: { id: string; familyMemberId: string; doctor: string; date: string; time: string; status: string }[] }): Pick<AppState, "family" | "appointments"> {
  return {
    family: req.family.map((m) => ({
      id: m.id,
      name: m.name,
      relationship: "Other",
      avatar: { initials: m.name.charAt(0), tone: "peach" },
      createdAt: "",
    })),
    appointments: (req.appointments ?? []).map((a) => ({
      id: a.id,
      familyMemberId: a.familyMemberId,
      doctor: a.doctor,
      date: a.date,
      time: a.time,
      status: a.status === "completed" || a.status === "cancelled" ? a.status : "upcoming",
      documentIds: [],
      reminders: [],
      createdAt: "",
      source: "manual",
    })),
  };
}

export async function interpretTranscript(raw: unknown, clientKey: string): Promise<{ status: number; body: Interpretation | { error: string } }> {
  const parsed = parseInterpretRequest(raw);
  if (!parsed.ok) return { status: 400, body: { error: "We could not read that request." } };

  const now = zonedNow();
  const state = toState(parsed.value);
  const fallback = validateDraft(interpretLocally(parsed.value.transcript, state, parsed.value.session, now));
  const session = parsed.value.session ?? "general_reminder";

  if (!claudeConfigured()) {
    return {
      status: 200,
      body: { ...fallback, session, provider: "rules", claudeUsed: false },
    };
  }

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: anthropicApiKey(), timeout: 20_000 });
    const result = await client.messages.create({
      model: anthropicModel(),
      max_tokens: 800,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            nowDate: now.date,
            nowTime: now.time,
            timezone: now.timezone,
            session,
            familyNames: parsed.value.family.map((m) => m.name),
            transcript: parsed.value.transcript.slice(0, 4000),
          }),
        },
      ],
    });
    const text = result.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd < 0) throw new Error("unstructured");
    const model = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as Partial<IntentDraft>;
    const merged = validateDraft({
      ...fallback,
      ...model,
      transcript: parsed.value.transcript,
      intent: model.intent ?? fallback.intent,
      memberId: fallback.memberId,
      memberName: model.memberName ?? fallback.memberName,
      matchedAppointmentIds: fallback.matchedAppointmentIds,
    });
    void clientKey;
    return { status: 200, body: { ...merged, session, provider: "claude", claudeUsed: true } };
  } catch {
    return {
      status: 200,
      body: {
        ...fallback,
        session,
        provider: "rules",
        claudeUsed: false,
        assumptions: [...fallback.assumptions, "Cloud interpretation was unavailable; used the local parser."],
      },
    };
  }
}
