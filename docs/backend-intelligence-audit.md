# Backend intelligence audit (pre-change)

Inspected 2026-10-25 before adding `/api/ai/interpret`, `/api/ask`, and `src/lib/server/anthropic.ts`.

## Intent routing (then)

- `classifySmaranIntent` / `interpretLocally` in `src/lib/nlu/intents.ts`. Unknown does **not** become a reminder.
- `/api/interpret` accepted **client-supplied** family and appointment rows. That is not authorization.
- Claude was optional; missing key used the local parser and set `claudeUsed: false`.
- No Zod. No multi-action list. No `/api/ask`. No `anthropic.ts` module.

## Storage

- Source of truth: `localStorage` `smaran:state` + IndexedDB `smaran-files`.
- No live Supabase client. `supabase/migrations/0001_smaran_family.sql` is schema only.
- `demoNow` still exists for seeded UI; **new** NLU dates use `Asia/Kolkata` via `zonedNow()`.

## Uploads

- Client: PDF/JPEG/PNG/WEBP, 10 MB, IndexedDB.
- `/api/documents/extract`: MIME + size + consent header. No magic-byte check. Filename was not sent to Claude as facts (good). Scanned OCR blocked without a key.

## APIs / tests / deploy

- Routes: `/api/interpret`, `/api/documents/extract`, `/api/cron/reminders` (always `delivered: 0` without VAPID/Supabase).
- Tests: vitest on NLU, timezone, request schema.
- Render/Vercel: Node 20. Secrets must stay off `NEXT_PUBLIC_` except anon URL/key and VAPID public.

This file is historical. Implementation after this audit must not treat localStorage as a shared cloud vault.
