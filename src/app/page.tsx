// Public landing page — THIS is what the QR code on the shirt points to.
// Server-rendered so the first paint is fast even on bad festival signal:
// config + the post list are fetched here, on the server, and streamed as HTML.
// <Gallery /> then hydrates to handle uploads and votes.
import { createClient } from "@/lib/supabase/server";
import { Gallery } from "@/components/Gallery";
import { POST_COLUMNS, type Config, type Post } from "@/lib/types";

// Festival content changes constantly — never serve a cached page.
export const dynamic = "force-dynamic";

const DEFAULT_CONFIG: Config = {
  title: "Scan & Share",
  message: null,
  active: true,
};

export default async function HomePage() {
  const supabase = await createClient();

  const [configResult, postsResult] = await Promise.all([
    supabase.from("config").select("title, message, active").single(),
    supabase
      .from("posts")
      .select(POST_COLUMNS)
      .order("featured", { ascending: false })
      .order("vote_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const config: Config = configResult.data ?? DEFAULT_CONFIG;
  const posts = (postsResult.data ?? []) as Post[];

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
      <header className="pt-6">
        <h1 className="text-2xl font-bold tracking-tight">{config.title}</h1>
        {config.message && (
          <p className="text-sm text-neutral-400">{config.message}</p>
        )}
      </header>

      {config.active ? (
        <Gallery initialPosts={posts} />
      ) : (
        <section className="rounded-xl border border-neutral-800 p-8 text-center text-neutral-400">
          This wall is paused. Check back soon.
        </section>
      )}
    </main>
  );
}
