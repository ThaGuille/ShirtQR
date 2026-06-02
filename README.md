# ShirtQR

A QR code on a shirt → a fast little web page that shows photos / locations and
lets anyone scan, vote, and post their own. You change what's featured (and nuke
anything gross) from a hidden, password-protected admin page on your phone.

Built to be **fast on terrible festival signal**: server-rendered, near-zero
JS on first paint, images compressed in the browser before upload and served
resized by `next/image`.

## How it works

```
                    ┌─────────────────────────────┐
   QR on shirt ───▶ │   Public page  /            │  (server-rendered)
                    │   featured photo / gallery  │
                    │   vote ▲     upload 📷       │
                    └──────────────┬──────────────┘
                                   │
   You, on phone ──▶  /admin       │      ┌──────────────────────────┐
   (password gate)  delete / hide  ├─────▶│        SUPABASE          │
                    set featured   │      │  Postgres (posts, votes) │
                    edit title     │      │  Storage  (photos)       │
                    └──────────────┘      └──────────────────────────┘
   Host + CDN + image optimization: VERCEL
```

One Next.js app serves three things: the public page, the `/admin` controller,
and the API routes between them. There is **no separate mobile app** — `/admin`
is just a web page you open on your phone.

## Tech / components

| Component        | Choice                          | Cost        |
| ---------------- | ------------------------------- | ----------- |
| Framework        | Next.js (App Router) + React    | free        |
| Hosting / CDN    | Vercel                          | free tier   |
| Database         | Supabase Postgres               | free tier   |
| Image storage    | Supabase Storage (public bucket)| free tier   |
| Image delivery   | `next/image` (auto WebP/resize) | free        |
| Upload compress  | `browser-image-compression`     | free        |
| Styling          | Tailwind CSS v4                 | free        |
| Admin auth       | single `ADMIN_PASSWORD` cookie  | free        |
| QR code          | any generator → your Vercel URL | free        |

100% runnable on free tiers. Only paid extras if you want them: a custom
domain (~€12/yr) and, in a viral scenario, image bandwidth overage (mitigated
by compression + the upload size cap).

## Data model (see `supabase/schema.sql`)

- **posts** — one photo or location. `hidden` = admin soft-delete, `featured`
  = the single "hero" post (admin-pinned, shown first at double size with its
  caption), `vote_count` denormalized for fast reads.
- **votes** — `(post_id, device_id)` primary key = one vote per device.
- **config** — single row: title, message, master on/off switch.
- **cast_vote()** — atomic RPC that adds a vote and bumps the count, ignoring
  duplicates from the same device.

Row Level Security: anyone can read visible posts and add a post; nobody can
edit/delete with the public key. Admin deletes use the service-role key
server-side.

## Local setup

```bash
npm install

# 1. Create a free project at https://supabase.com
# 2. SQL Editor -> paste & run supabase/schema.sql
# 3. Copy env vars:
cp .env.example .env.local      # then fill in the values

npm run dev                     # http://localhost:3000
```

`.env.local` needs (from Supabase → Project Settings → API):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `ADMIN_PASSWORD` (you pick it)
- `NEXT_PUBLIC_SITE_URL` (optional — your public URL, used for the `/admin` QR code)

## Deploy

Import the repo on [vercel.com](https://vercel.com), paste the same env vars,
deploy. Point the QR code at the resulting URL. Done.

## Roadmap

- [x] **Phase 1 — Scaffold** (this commit): structure, config, DB schema, deploy path.
- [x] **Phase 2 — Public page**: gallery sorted by votes, anonymous upload (compress → Storage), one-tap voting.
- [x] **Phase 3 — Admin**: password gate, delete/hide, set featured, edit config.
- [x] **Phase 4 — Polish**: location pins/map, upload size caps + rate limiting, empty/loading states, the actual QR image.

## Project layout

```
src/
  app/
    page.tsx          public page (QR target)
    admin/page.tsx    hidden controller
    api/posts/        list + create posts
    api/vote/         cast a vote
  components/         Gallery, UploadForm, VoteButton
  lib/
    supabase/         browser / server / admin clients
    deviceId.ts       anonymous one-vote-per-device id
    imageCompression.ts
supabase/schema.sql   database + storage + RLS
```
