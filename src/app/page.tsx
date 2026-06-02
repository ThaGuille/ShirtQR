// Public landing page — THIS is what the QR code on the shirt points to.
// Server-rendered so the first paint is fast even on bad festival signal.
//
// TODO (Phase 2):
//   - read the `config` row (title / message / active)
//   - list visible posts sorted by votes (server component)
//   - <Gallery />    : the photo/location grid + <VoteButton />
//   - <UploadForm /> : compress + upload a new photo/location
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
      <header className="pt-6">
        <h1 className="text-2xl font-bold tracking-tight">ShirtQR</h1>
        <p className="text-sm text-neutral-400">
          Scan the shirt. See the photos. Add your own.
        </p>
      </header>

      <section className="rounded-xl border border-neutral-800 p-4 text-neutral-400">
        Public gallery goes here.
      </section>
    </main>
  );
}
