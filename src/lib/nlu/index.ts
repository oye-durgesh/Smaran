export * from "./common";
export * from "./reminder";
export * from "./appointment";
export * from "./document";
export * from "./chat";
export * from "./ask";
export * from "./health";
export * from "./command";
export * from "./intents";

import { classifySmaranIntent } from "./intents";

export type CaptureIntent = "reminder" | "appointment" | "question" | "health" | "unknown";

/** Route free-form text. Unknown never becomes a reminder. */
export function classifyCapture(text: string): CaptureIntent {
  const intent = classifySmaranIntent(text);
  if (intent === "health_measurement") return "health";
  if (intent === "ask_question" || intent === "document_question") return "question";
  if (intent === "appointment_create_or_update" || intent === "appointment_complete" || intent === "appointment_cancel" || intent === "appointment_reschedule") {
    return "appointment";
  }
  if (intent === "medicine_reminder" || intent === "health_check_reminder" || intent === "pickup_reminder") return "reminder";
  return "unknown";
}
