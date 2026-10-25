import { NextResponse } from "next/server";
import { backendConfigured } from "@/lib/server/env";
import { processDueJobs } from "@/lib/server/reminder-jobs";
import { zonedNow } from "@/lib/timezone";

/** Due-reminder worker. Never claims delivery without a configured provider. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const due = processDueJobs(zonedNow().timestamp);
  if (!backendConfigured()) {
    return NextResponse.json({
      status: "blocked",
      reason: "Persistent family store is not configured (SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL).",
      delivered: 0,
      processed: due.processed.length,
    });
  }
  return NextResponse.json({
    status: "blocked",
    reason: due.reason ?? "No notification provider accepted a send.",
    delivered: due.delivered,
    processed: due.processed.length,
  });
}
