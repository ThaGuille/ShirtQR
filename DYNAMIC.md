# DYNAMIC — rolling context log

Newest first. Each entry is a small unit of recent work so a fresh chat can pick
up without re-reading everything. **Keep at most the 5 most recent entries** —
once a 6th would be added, delete the oldest at the bottom.

State that's stable (architecture, how it works, setup) lives in `README.md`, not
here. This file is only the moving edge of the work.

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

---

## 2026-06-02 — Phase 2 complete: public page is live

Built the whole public page against the connected Supabase project. Verified
locally (`next build` + `next start`): home renders server-side, `/api/posts`
returns `{"posts":[]}` from the live DB, validation paths return 400s.

- **API** `src/app/api/posts/route.ts` — `GET` lists visible posts (featured →
  votes → newest, limit 200); `POST` validates + inserts a photo/location via the
  anon client (RLS-guarded), returns the created row.
- **API** `src/app/api/vote/route.ts` — `POST {postId, deviceId}` → `cast_vote`
  RPC, returns the new `voteCount`.
- **Components** — `VoteButton` (optimistic count, remembers voted post ids in
  `localStorage`, server count reconciles), `UploadForm` (compress → upload
  straight to Storage `photos/` → `POST /api/posts`), `Gallery` (client
  coordinator: holds post state, prepends new uploads, 2-col `next/image` grid).
- **Page** `src/app/page.tsx` — server component, `force-dynamic`, fetches config
  + posts in parallel, renders header + `<Gallery>`; shows "paused" when
  `config.active` is false.
- **Shared** `src/lib/types.ts` (`Post`, `Config`, `POST_COLUMNS`),
  `src/lib/photoUrl.ts` (public Storage URL builder).
- `supabase/schema.sql` has an uncommitted change adding explicit GRANTs (already
  applied in the project).

**Next (Phase 3 — Admin):** `/admin` password gate (`ADMIN_PASSWORD` cookie),
delete/hide posts (service-role client), set featured, edit config.

Open polish later: `browser-image-compression` makes the `/` first-load JS ~194kB
— could lazy-import it; no upload size cap / rate limiting yet (Phase 4).

---

## 2026-06-02 — Phase 1 scaffold (baseline)

Structure, config, DB schema, Supabase clients (browser/server/admin), deploy
path. All Phase 2 component/route files existed as stubs returning placeholders.
Supabase project connected; `.env.local` + `node_modules` present.
