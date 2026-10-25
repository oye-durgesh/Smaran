import type { AppState } from "../types";
import { parseHealth, type HealthDraft } from "./health";
import { interpretLocally, type IntentDraft, type InterpretSession, type SmaranIntent } from "./intents";

export type CommandIntent = SmaranIntent;

export interface ParsedCommand {
  intent: CommandIntent;
  health?: HealthDraft;
  text: string;
  draft: IntentDraft;
}

export function parseSmaranCommand(text: string, state: AppState, session?: InterpretSession): ParsedCommand {
  const trimmed = text.trim();
  const draft = interpretLocally(trimmed, state, session);
  const health = draft.intent === "health_measurement" ? parseHealth(trimmed, state.family) : undefined;
  return { intent: draft.intent, health, text: trimmed, draft };
}
