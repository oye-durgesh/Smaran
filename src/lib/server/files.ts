export const MAX_EXTRACT_BYTES = 4 * 1024 * 1024;
export const MAX_PDF_PAGES_ESTIMATE = 20;

export type DetectedKind = "application/pdf" | "image/jpeg" | "image/png" | "image/webp" | null;

export function detectFileKind(bytes: Uint8Array): DetectedKind {
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "application/pdf";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function extractPdfText(bytes: Buffer): string {
  const raw = bytes.toString("latin1");
  const chunks = [...raw.matchAll(/\((?:\\.|[^\\)]){4,400}\)/g)].map((m) => m[0].slice(1, -1)).filter((s) => /[A-Za-z]{3}/.test(s));
  return chunks.join("\n").slice(0, 8000);
}
