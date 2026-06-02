// Shown while the server component for `/` is fetching (navigations / slow
// signal). Mirrors the real layout so the page doesn't jump when it loads.
export default function Loading() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
      <header className="pt-6">
        <div className="h-7 w-40 animate-pulse rounded bg-neutral-800" />
        <div className="mt-2 h-4 w-56 animate-pulse rounded bg-neutral-900" />
      </header>

      <div className="h-28 animate-pulse rounded-xl border border-neutral-800 bg-neutral-900" />

      <ul className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <li
            key={i}
            className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900"
          >
            <div className="aspect-square w-full animate-pulse bg-neutral-800" />
            <div className="flex items-center justify-between p-2">
              <span className="h-3 w-16 animate-pulse rounded bg-neutral-800" />
              <span className="h-6 w-10 animate-pulse rounded-full bg-neutral-800" />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
