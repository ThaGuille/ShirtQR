// Hidden controller page — open this on your phone to manage the shirt.
// Protected by a single password (ADMIN_PASSWORD) — see middleware (Phase 3).
//
// TODO (Phase 3):
//   - password gate (sets an httpOnly cookie via /api/admin/login)
//   - list every post (including hidden) with a one-tap Delete / Hide
//   - toggle `featured` on a post
//   - edit the site `config` (title, message, active on/off)
export default function AdminPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
      <header className="pt-6">
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-neutral-400">Shirt controller.</p>
      </header>

      <section className="rounded-xl border border-neutral-800 p-4 text-neutral-400">
        Controller goes here.
      </section>
    </main>
  );
}
