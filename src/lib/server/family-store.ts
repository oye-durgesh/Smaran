import "server-only";
import type { AppState } from "@/lib/types";
import { backendConfigured } from "./env";
import type { DeviceSession } from "./session";

export interface AuthorizedSnapshot {
  persistence: "supabase" | "device-local";
  authorization: "family-scoped" | "device-local-unauthenticated";
  family: { id: string; name: string }[];
  appointments: AppState["appointments"];
  reminders: AppState["reminders"];
  measurements: AppState["measurements"];
  documents: AppState["documents"];
}

const EMPTY: AuthorizedSnapshot = {
  persistence: "device-local",
  authorization: "device-local-unauthenticated",
  family: [],
  appointments: [],
  reminders: [],
  measurements: [],
  documents: [],
};

/**
 * Family rows come from the backend when configured.
 * Client-supplied IDs are never treated as authorized records.
 */
export async function loadAuthorizedFamily(session: DeviceSession): Promise<AuthorizedSnapshot> {
  if (!backendConfigured() || session.mode === "device-local") {
    return EMPTY;
  }
  if (!session.authenticated || !session.familyId) {
    return { ...EMPTY, persistence: "supabase", authorization: "family-scoped" };
  }
  return { ...EMPTY, persistence: "supabase", authorization: "family-scoped" };
}

export function namesOnlyFamily(names: string[]): AuthorizedSnapshot["family"] {
  return names.slice(0, 20).map((name, i) => ({ id: `hint-${i}`, name }));
}
