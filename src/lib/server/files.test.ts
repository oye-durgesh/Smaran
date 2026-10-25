import { describe, expect, it } from "vitest";
import { detectFileKind, extractPdfText } from "./files";

describe("file signatures", () => {
  it("detects PDF magic bytes", () => {
    expect(detectFileKind(Buffer.from("%PDF-1.4 hello"))).toBe("application/pdf");
    expect(detectFileKind(Buffer.from("not a file"))).toBeNull();
  });

  it("extracts selectable PDF text fragments", () => {
    const text = extractPdfText(Buffer.from("%PDF (Blood Report) (Glucose 118 mg/dL)"));
    expect(text).toMatch(/Blood Report/);
    expect(text).toMatch(/Glucose/);
  });
});
