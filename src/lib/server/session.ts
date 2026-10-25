import "server-only";
import { backendConfigured } from "./env";

export interface DeviceSession {
  mode: "supabase" | "device-local";
  userId: string | null;
  familyId: string | null;
  authenticated: boolean;
}

/** Session is authenticated only when a family backend is configured and a bearer/cookie is present. */
export function readSession(req: Request): DeviceSession {
  if (!backendConfigured()) {
    return { mode: "device-local", userId: null, familyId: null, authenticated: false };
  }
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return { mode: "supabase", userId: null, familyId: null, authenticated: false };
  return { mode: "supabase", userId: "pending-jwt", familyId: null, authenticated: false };
}
