/** Split a single utterance that clearly lists more than one request. */
export function splitUtterances(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [""];
  const parts = trimmed
    .split(/\s+(?:aur|and then|and also)\s+|(?<=[.!?])\s+(?=[A-Z\u0900-\u097F])/i)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 1) return [trimmed];
  return parts.filter((p) => p.split(/\s+/).length >= 3);
}
