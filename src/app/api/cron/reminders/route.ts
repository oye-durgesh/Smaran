import { NextResponse } from "next/server";
import { backendConfigured } from "@/lib/server/env";

/** Due-reminder worker. Blocked until Supabase + a push provider are configured. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!backendConfigured()) {
    return NextResponse.json({
      status: "blocked",
      reason: "Persistent family store is not configured (SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL).",
      delivered: 0,
    });
  }
  return NextResponse.json({
    status: "blocked",
    reason: "Web Push (VAPID_PRIVATE_KEY) is not configured. No sends were attempted.",
    delivered: 0,
  });
}
