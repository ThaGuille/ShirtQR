# Deploying ShirtQR to Vercel

A step-by-step for putting the app online so the shirt's QR code points at a real
URL. ~10 minutes. Everything here is free-tier.

## Before you start
- Code is committed (✅ done).
- You have your Supabase project open (you'll copy keys from it).
- You have a GitHub account and a Vercel account (sign into Vercel **with**
  GitHub — it makes importing one click).

---

## 1. Put the code on GitHub
Vercel deploys from a Git repo.

**Option A — GitHub website:** create a new **empty** repo at
https://github.com/new (no README/license). Then, in the project folder:

```bash
git remote add origin https://github.com/<you>/qrShirts.git
git branch -M main
git push -u origin main
```

**Option B — GitHub CLI** (if you have `gh`):

```bash
gh repo create qrShirts --private --source . --push
```

Refresh the repo page — you should see your files.

---

## 2. Import the repo into Vercel
1. Go to https://vercel.com/new
2. Pick your `qrShirts` repo → **Import**.
3. Vercel auto-detects **Next.js** — leave Framework, build command, and output
   settings at their defaults. **Don't deploy yet** — set env vars first
   (next step), or the first deploy will fail to reach Supabase.

---

## 3. Add the environment variables
On the import screen, expand **Environment Variables** and add each of these
(copy the values from your local `.env.local`):

| Name | Where it comes from | Notes |
| ---- | ------------------- | ----- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page | public |
| `SUPABASE_SERVICE_ROLE_KEY` | same page (service_role) | **secret** |
| `ADMIN_PASSWORD` | you pick it | the `/admin` password |
| `NEXT_PUBLIC_SITE_URL` | *(optional, see step 6)* | leave blank for now |

> Tip: paste each value carefully — no surrounding quotes, no trailing spaces.

Then click **Deploy**. Wait for the build (~1–2 min) → you get a URL like
`https://qr-shirts-xxxx.vercel.app`.

---

## 4. Make sure the database is ready
If you haven't run the **latest** `supabase/schema.sql` (it gained a Storage
size/mime cap in Phase 4), do it now:

1. Supabase → **SQL Editor** → New query.
2. Paste the whole contents of `supabase/schema.sql` → **Run**.
   (It's idempotent — safe to run again; it just ensures the 2 MB upload cap and
   allowed image types are applied.)

---

## 5. Smoke-test the live site
- Open your `…vercel.app` URL on your **phone** (you finally have `https`, so
  uploads/votes work over mobile data, not just localhost).
- Add a photo, drop a 📍 location, tap a vote.
- Open `…vercel.app/admin`, enter `ADMIN_PASSWORD`, confirm you can
  hide/feature/delete and edit the title.

---

## 6. (Optional) Pin the QR to a fixed URL
The `/admin` QR code already encodes whatever host you open it on, so it works as
is. If you want it locked to a specific address (e.g. before adding a custom
domain), set it explicitly:

1. Vercel → your project → **Settings → Environment Variables**.
2. Add `NEXT_PUBLIC_SITE_URL` = your URL (e.g. `https://qr-shirts-xxxx.vercel.app`),
   no trailing slash.
3. **Redeploy** (Deployments → ⋯ → Redeploy) — `NEXT_PUBLIC_*` vars are baked in
   at build time, so a redeploy is required for it to take effect.

---

## 7. Print the QR and wear it
1. Open `…vercel.app/admin` → the **Shirt QR code** card.
2. Print the page (or screenshot the code) and put it on the shirt.
3. Scan it with another phone to confirm it lands on your wall. 🎉

---

## Updating later
Every `git push` to `main` triggers an automatic redeploy. No extra steps.

## (Optional) Custom domain
Vercel → project → **Settings → Domains** → add your domain and follow the DNS
instructions (~€10–12/yr from a registrar). Then update `NEXT_PUBLIC_SITE_URL`
to the custom domain and redeploy so the QR uses it.

## Troubleshooting
- **Build fails / 500 on load**: almost always a missing or mistyped env var.
  Recheck all five in Vercel → Settings → Environment Variables, then redeploy.
- **Images don't load**: confirm the `photos` bucket is **public** and the
  Storage policies from `schema.sql` ran.
- **Can't log into /admin**: `ADMIN_PASSWORD` not set on Vercel, or you changed
  it — re-enter and redeploy. Cookie lasts 30 days per browser.
- **Uploads rejected as too large**: that's the 2 MB Storage cap working;
  the in-browser compressor normally keeps photos well under it.
