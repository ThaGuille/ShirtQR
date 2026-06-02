# Agent context — ShirtQR

Dense reference for an AI agent. Read this + `DYNAMIC.md` (repo root, rolling log
of the latest work) before touching code. Human-facing intro is `README.md`;
don't duplicate it here.

## What it is
QR code on a shirt → a fast, server-rendered public page where anyone scans,
votes, and posts photos/locations. A hidden `/admin` (password) moderates and
configures it. One Next.js app, Supabase backend, deploys to Vercel. Goal:
**fast on terrible festival signal** — server render, near-zero first-paint JS,
images compressed in-browser and served resized by `next/image`.

## Stack
Next.js 15 (App Router) + React 19, TypeScript (strict), Tailwind v4
(`@import "tailwindcss"` in `globals.css`, no config file). Supabase Postgres +
Storage (`@supabase/ssr`, `@supabase/supabase-js`). `browser-image-compression`,
`qrcode` (server-side only). Path alias `@/*` → `src/*`. Target: free tiers.

## Data model (`supabase/schema.sql`, idempotent — safe to re-run)
- **posts** — `id, type('photo'|'location'), image_path, caption, lat, lng,
  device_id, vote_count (denormalized), hidden (admin soft-delete), featured,
  created_at`.
- **votes** — PK `(post_id, device_id)` = one vote per device per post.
- **config** — single row (`id = true` check forces it): `title, message,
  active` (master on/off), `updated_at`.
- **cast_vote(p_post_id, p_device_id)** — `security definer` RPC: inserts vote,
  bumps `vote_count`, ignores dupes, returns new count.
- **Storage**: public `photos` bucket, `file_size_limit = 2 MB`,
  `allowed_mime_types` webp/jpeg/png (caps uploads at the source).

### RLS (the anon key ships to the browser — RLS is the real guard)
- posts: anon SELECT only `hidden = false`; anon INSERT only with
  `hidden=false AND featured=false AND vote_count=0` (defaults satisfy this — so
  never set those on insert). No anon UPDATE/DELETE.
- votes: no anon policies → only reachable via `cast_vote`.
- config: anon SELECT only.
- storage: anon SELECT + INSERT on `photos`; **no anon DELETE** (admin only).
- Admin uses the **service-role key** server-side, which bypasses RLS.

## Request flows
- **Read (public)**: `app/page.tsx` (server, `force-dynamic`) fetches config +
  posts in parallel via the anon server client, renders `<Gallery initialPosts>`.
- **Upload**: client compresses → uploads the binary **directly to Storage**
  (one hop, dodges the serverless body limit) → `POST /api/posts` with just the
  path/caption/deviceId → server inserts row, returns it → Gallery prepends.
- **Vote**: `VoteButton` optimistic bump → `POST /api/vote {postId, deviceId}` →
  `cast_vote` RPC → reconcile with returned count.
- **Admin**: `app/admin/page.tsx` gate. No/invalid cookie → `<LoginForm>`; valid
  → service-role fetch (incl. hidden) → `<AdminDashboard>`. All mutations are
  **Server Actions** in `app/admin/actions.ts` (no public admin API).

## File map (`src/`)
- `app/page.tsx` — public page, server component, `force-dynamic`.
- `app/loading.tsx` — route skeleton for `/`.
- `app/layout.tsx`, `app/globals.css` — shell, dark theme, Tailwind import.
- `app/api/posts/route.ts` — GET list (featured→votes→newest, limit 200);
  POST create (rate-limited 10/10min, validates type + lat/lng bounds).
- `app/api/vote/route.ts` — POST cast vote (rate-limited 60/min).
- `app/admin/page.tsx` — auth gate + service-role fetch + QR generation.
- `app/admin/actions.ts` — `"use server"`: login, logout, setHidden,
  setFeatured (**single-select hero** — clears other featured before promoting),
  deletePost (also removes Storage object), updateConfig. Each mutation re-checks
  `isAdmin()`; all call `revalidatePath('/admin','/')`.
- `app/admin/LoginForm.tsx` — client, `useActionState`, password gate.
- `app/admin/AdminDashboard.tsx` — server: config editor, QR card, per-post
  Feature/Hide/Delete forms.
- `app/admin/ConfirmButton.tsx` — client confirm guard for delete.
- `components/Gallery.tsx` — client coordinator: holds post state, prepends new
  uploads, optimistic shimmer card while uploading, 2-col `next/image` grid,
  location cards. Pulls the single `featured` post out as a full-width
  double-size **hero** (`HeroCard`, caption shown in full) above the grid.
- `components/UploadForm.tsx` — client: caption + photo (compress→Storage) +
  📍 location (geolocation). 25 MB pre-check, `onPendingChange` for the skeleton.
- `components/VoteButton.tsx` — client: optimistic, remembers voted ids in
  `localStorage` (`shirtqr_voted`).
- `lib/supabase/{client,server,admin}.ts` — anon browser / anon server (cookies)
  / service-role admin clients.
- `lib/types.ts` — `Post`, `Config`, `AdminPost`, `POST_COLUMNS`,
  `ADMIN_POST_COLUMNS` (= POST_COLUMNS + `hidden`). `device_id` never sent to
  clients.
- `lib/auth.ts` — admin auth (server-only): cookie `shirtqr_admin` =
  `sha256(ADMIN_PASSWORD)`, constant-time compared. `isAdmin/checkPassword/adminToken`.
- `lib/rateLimit.ts` — in-memory fixed-window limiter + `clientIp()`.
- `lib/deviceId.ts` — anon per-browser id in `localStorage` (`shirtqr_device_id`).
- `lib/uuid.ts` — v4 UUID with non-secure-context fallback (see gotcha).
- `lib/imageCompression.ts` — `compressImage()` → ~0.5 MB / 1600px webp.
- `lib/photoUrl.ts` — builds public Storage URL from `image_path`.
- `lib/siteUrl.ts` — `NEXT_PUBLIC_SITE_URL` or request host, for the QR.

## Env (`.env.example`)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` (server-only), `ADMIN_PASSWORD`,
`NEXT_PUBLIC_SITE_URL` (optional, QR). Live in `.env.local` (gitignored, present).

## Gotchas / conventions (read before editing)
- **`crypto.randomUUID()` only exists in secure contexts** (https/localhost). A
  phone on `http://192.168.x.x` throws "not a function". Always use
  `lib/uuid.ts`, never `crypto.randomUUID()` directly. Same applies to any new
  Web Crypto / secure-context-only API.
- **Rate limiter is soft**: in-memory, per serverless instance, resets on cold
  start. Fine for one phone spamming; not a hard guarantee. Durable store
  (Supabase table / Upstash) is the upgrade path.
- **Bucket size/mime cap lives in `schema.sql`** — changing it means the user
  must re-run that section in the Supabase SQL Editor; code can't set it.
- **Never set hidden/featured/vote_count on anon insert** (RLS forbids it).
- **Admin mutations must re-check `isAdmin()`** — Server Actions are public
  endpoints; UI gating isn't enough.
- **Don't import `lib/auth.ts` or `lib/supabase/admin.ts` into a Client
  Component** — they read server-only secrets / use node:crypto.
- `next.config.mjs` `images.remotePatterns` allows `*.supabase.co` for
  `next/image`. New image hosts need adding there.
- `/` and `/admin` are `force-dynamic` (festival content changes constantly).

## Run / verify
- `npm run dev` → http://localhost:3000. `npm run build` for full type-check of
  routes. `npx tsc --noEmit` for a fast type pass.
- Local server smoke test on a spare port: `npx next start -p 3100`. To exercise
  the authed admin without the Server-Action login, mint the cookie:
  `sha256(ADMIN_PASSWORD)` → `curl -b "shirtqr_admin=<hash>" .../admin`.
  To dodge a tripped rate limit, vary `-H "x-forwarded-for: <ip>"`.
- **Windows**: `next start` children can outlive TaskStop and hold the port
  (EADDRINUSE). Free it via PowerShell `Get-NetTCPConnection -LocalPort <p>` →
  `Stop-Process`.

## Status
All 4 roadmap phases complete (see `README.md` roadmap + `DYNAMIC.md`). Open
optional tweaks: lazy-import `browser-image-compression` (trims `/` first-load JS
~194 kB); durable rate-limit store. Deploy guide: `docs/DEPLOY.md`.
