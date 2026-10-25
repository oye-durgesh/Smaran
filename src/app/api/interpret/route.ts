import { NextResponse } from "next/server";
import { interpretTranscript } from "@/lib/server/interpret";
import { rateLimit } from "@/lib/server/rate-limit";

export const maxDuration = 30;

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`interpret:${ip}`)) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }
  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > 20_000) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    body = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ error: "We could not read that request." }, { status: 400 });
  }
  const result = await interpretTranscript(body, ip);
  return NextResponse.json(result.body, { status: result.status });
}
