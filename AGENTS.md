# AGENTS.md

Guidance for AI agents working in this repo. Humans: see `README.md`.

## Read first
1. **`docs/AGENT_CONTEXT.md`** — dense map of the whole project: stack, data
   model, RLS, request flows, every file's job, gotchas, run/verify commands.
2. **`DYNAMIC.md`** — rolling log of the latest work (newest first). Tells you
   the current moving edge without re-reading everything.

## What this is
ShirtQR: a Next.js 15 (App Router) + Supabase festival photo wall. QR on a shirt
→ server-rendered public page to scan/vote/post; hidden `/admin` to moderate.
Optimized for bad signal: near-zero first-paint JS, in-browser image compression.

## Project conventions
- **Keep `DYNAMIC.md` current.** After a meaningful unit of work, prepend a dated
  entry; keep at most the 5 newest (drop the oldest). Stable facts go in
  `docs/AGENT_CONTEXT.md` / `README.md`, not there.
- **Never call `crypto.randomUUID()` directly** — use `src/lib/uuid.ts` (the page
  must work for a phone on plain-http LAN, a non-secure context).
- **RLS is the security boundary.** The anon key is public. Don't set
  `hidden/featured/vote_count` on anon inserts; admin writes use the service-role
  client server-side only.
- **Admin = Server Actions** in `src/app/admin/actions.ts`; every mutation
  re-checks `isAdmin()`. Don't import `src/lib/auth.ts` or
  `src/lib/supabase/admin.ts` into Client Components.
- The Storage size/mime cap lives in `supabase/schema.sql`; changing it requires
  re-running that SQL in Supabase — note this to the user when relevant.

## Verify your changes
`npx tsc --noEmit` (fast) and `npm run build` (full route type-check) must pass.
For runtime checks see the "Run / verify" section of `docs/AGENT_CONTEXT.md`.

## Deploy
Vercel. Step-by-step for the human operator: `docs/DEPLOY.md`.
