import { NextResponse } from "next/server";
import { anthropicApiKey, claudeConfigured } from "@/lib/server/env";
import { rateLimit } from "@/lib/server/rate-limit";

export const maxDuration = 30;

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`extract:${ip}`, 8, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const consent = req.headers.get("x-smaran-consent");
  if (consent !== "cloud-extract") {
    return NextResponse.json({ error: "Consent is required before any document content is processed off this device." }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File exceeds the 4 MB processing limit." }, { status: 413 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Unsupported file type." }, { status: 415 });

  const bytes = Buffer.from(await file.arrayBuffer());
  let extractedText = "";
  const status: "needs_review" | "failed" = "needs_review";

  if (file.type === "application/pdf") {
    const raw = bytes.toString("latin1");
    const chunks = [...raw.matchAll(/\((?:\\.|[^\\)]){4,400}\)/g)].map((m) => m[0].slice(1, -1)).filter((s) => /[A-Za-z]{3}/.test(s));
    extractedText = chunks.join("\n").slice(0, 8000);
    if (!extractedText.trim()) {
      return NextResponse.json({
        status: "failed",
        error: "No selectable text in this PDF. Scanned OCR is blocked until a Vercel-compatible OCR worker is configured.",
        extractedText: "",
      });
    }
  } else if (!claudeConfigured()) {
    return NextResponse.json({
      status: "failed",
      error: "Image OCR needs ANTHROPIC_API_KEY (vision) or a dedicated OCR worker. Nothing was invented.",
      extractedText: "",
    });
  }

  if (claudeConfigured() && extractedText) {
    try {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({ apiKey: anthropicApiKey(), timeout: 20_000 });
      const result = await client.messages.create({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
        max_tokens: 600,
        system: "Extract only facts printed in the text. Missing fields stay null. JSON only. Never invent doses.",
        messages: [{ role: "user", content: extractedText.slice(0, 6000) }],
      });
      const text = result.content.map((b) => (b.type === "text" ? b.text : "")).join("");
      return NextResponse.json({ status, extractedText, proposal: text.slice(0, 4000), provider: "claude" });
    } catch {
      return NextResponse.json({ status: "failed", error: "Interpretation failed. The original file is unchanged.", extractedText });
    }
  }

  return NextResponse.json({ status, extractedText, provider: "local_text", proposal: null });
}
