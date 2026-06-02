# DYNAMIC — rolling context log

Newest first. Each entry is a small unit of recent work so a fresh chat can pick
up without re-reading everything. **Keep at most the 5 most recent entries** —
once a 6th would be added, delete the oldest at the bottom.

State that's stable (architecture, how it works, setup) lives in `README.md`, not
here. This file is only the moving edge of the work.

---

## 2026-06-02 — Hero post + clearer geolocation errors

Two user requests. `tsc` + `next build` clean (live hero demo skipped — won't
mutate prod DB; user toggles it from /admin).

- **Hero (pinned, double-size, with caption)** — reused the existing `featured`
  flag, now **single-select**: `setFeatured` in `src/app/admin/actions.ts` clears
  any other featured post before promoting one. `Gallery.tsx` pulls the featured
  post out of the grid and renders `<HeroCard>` first — full-width (≈2× a grid
  cell, `aspect-[4/3]`, `next/image` priority) with its caption shown in full.
  Admin button relabeled "Set as hero" / "Remove hero"; badge "hero". No schema
  change.
- **Geolocation "permission denied" fix** — root cause is the secure-context rule
  (same family as the `crypto.randomUUID` issue): the Geolocation API is blocked
  over plain-http LAN, surfacing as PERMISSION_DENIED. `UploadForm.tsx` now checks
  `window.isSecureContext` up front and gives distinct messages for
  insecure-context vs real denied vs timeout. Real fix for the user: use the
  deployed https site (or localhost), not the http LAN IP.

---

## 2026-06-02 — Added agent docs + Vercel deploy guide

Code is committed (`e2478e1 full webpage`). Added agent-facing documentation and
a human deploy guide:

- **`docs/AGENT_CONTEXT.md`** — dense single-file reference for an agent: stack,
  data model + RLS, request flows, full `src/` file map, gotchas/conventions,
  run/verify commands. Read this first on a fresh chat.
- **`AGENTS.md`** (repo root) — short pointer to `docs/AGENT_CONTEXT.md` +
  `DYNAMIC.md`, plus the key conventions (keep this log rolling, use
  `lib/uuid.ts`, RLS boundary, admin Server Actions re-check `isAdmin`).
- **`docs/DEPLOY.md`** — step-by-step Vercel deploy for the user (push to GitHub →
  import → 5 env vars → deploy → re-run schema → set `NEXT_PUBLIC_SITE_URL` →
  print QR).

No code changes. Project is feature-complete; next real action is the user
running the Vercel deploy.

---

## 2026-06-02 — Phase 4 complete: polish (project feature-complete)

Final roadmap phase done. `next build` clean; smoke-tested live: post rate limit
returns 429 after 10/window, vote after 60/window; location validation rejects
out-of-range/missing coords (400); `/admin` renders a real `<svg>` QR + URL;
public page shows the 📍 Location button.

- **Rate limiting** `src/lib/rateLimit.ts` — in-memory fixed-window limiter keyed
  by client IP. Applied in `/api/posts` (10 / 10 min) and `/api/vote` (60 / min),
  both return 429 + `Retry-After`. Soft limit (per-instance, resets on cold
  start); upgrade path = durable store. Added lat/lng bounds check to `/api/posts`.
- **Upload cap at the source** — `supabase/schema.sql` sets the `photos` bucket
  `file_size_limit = 2 MB` + `allowed_mime_types` (webp/jpeg/png), via INSERT and
  an explicit UPDATE (so an existing bucket gets it too). **User must re-run that
  bit of schema.sql.** UploadForm also pre-rejects originals > 25 MB.
- **Location posts** — UploadForm has a 📍 Location button (`navigator.geolocation`
  → `POST /api/posts` type=location). Gallery renders location cards with coords +
  "Open in Maps" link. (No embedded map — too heavy/bandwidth-y for free tier.)
- **Loading/empty states** — `src/app/loading.tsx` route skeleton; Gallery shows an
  optimistic shimmer card while an upload/location is in flight; size/geo errors
  surface inline.
- **QR code** — added `qrcode` dep (server-side only, no client bloat).
  `src/lib/siteUrl.ts` resolves the origin (`NEXT_PUBLIC_SITE_URL` or request
  host); `/admin` generates an SVG QR and shows a printable card. Added
  `NEXT_PUBLIC_SITE_URL` to `.env.example`.

All four roadmap phases are now complete. Possible future tweaks (not on the
roadmap): lazy-import `browser-image-compression` to trim `/` first-load JS
(~194 kB); durable rate-limit store if it ever goes viral.

---

## 2026-06-02 — Phase 3 complete: /admin controller

Password-gated admin built with Server Actions (no public admin API). Verified
via `next build` + cookie-minted smoke test: no/bogus cookie → login form only;
valid cookie → full dashboard with service-role data.

- **Auth** `src/lib/auth.ts` — single `ADMIN_PASSWORD`; cookie stores
  `sha256(password)` (not plaintext), constant-time compared. `isAdmin()`,
  `checkPassword()`, `adminToken()`.
- **Actions** `src/app/admin/actions.ts` (`"use server"`) — `login`/`logout`
  (httpOnly cookie), `setHidden`, `setFeatured`, `deletePost` (also removes the
  Storage object), `updateConfig`. Each mutation re-checks `isAdmin()`; all call
  `revalidatePath('/admin' + '/')`.
- **UI** `src/app/admin/page.tsx` (gate + service-role fetch incl. hidden posts),
  `LoginForm` (client, `useActionState`), `AdminDashboard` (server-rendered:
  config editor + per-post Feature/Hide/Delete forms), `ConfirmButton` (client
  delete guard). Near-zero JS — only login + confirm ship to the browser.
- **Types** added `AdminPost` + `ADMIN_POST_COLUMNS` (POST_COLUMNS + `hidden`).
- `ADMIN_PASSWORD` + `SUPABASE_SERVICE_ROLE_KEY` confirmed set in `.env.local`.

**Next (Phase 4 — Polish):** location pins/map, upload size cap + rate limiting,
empty/loading states, the actual QR image. Also still pending: lazy-import
`browser-image-compression` to trim `/` first-load JS (~194 kB).

---

## 2026-06-02 — Fix: uploads/votes failing on mobile over LAN

Phone hitting the dev server at `http://192.168.x.x` threw
`crypto.randomUUID is not a function` — that API only exists in secure contexts
(https / localhost). Added `src/lib/uuid.ts`, a v4 UUID that falls back to
`crypto.getRandomValues()` (works over plain http) then `Math.random()`. Swapped
both call sites (`src/lib/deviceId.ts`, `src/components/UploadForm.tsx`). Typecheck
clean. Note: full phone testing still wants https (Vercel) eventually, but LAN
upload/vote now works.
