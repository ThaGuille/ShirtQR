import Image from "next/image";
import Link from "next/link";
import { photoUrl } from "@/lib/photoUrl";
import type { AdminPost, Config } from "@/lib/types";
import {
  deletePost,
  logout,
  setFeatured,
  setHidden,
  updateConfig,
} from "./actions";
import { ConfirmButton } from "./ConfirmButton";

// The controller, server-rendered. Every button is a tiny <form> bound to a
// Server Action, so the page stays near-zero JS (only the confirm guard ships).
export function AdminDashboard({
  posts,
  config,
  siteUrl,
  qrSvg,
}: {
  posts: AdminPost[];
  config: Config;
  siteUrl: string;
  qrSvg: string;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-4">
      <header className="flex items-center justify-between pt-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
          <Link href="/" className="text-sm text-emerald-400 underline">
            View public page →
          </Link>
        </div>
        <form action={logout}>
          <button className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300">
            Log out
          </button>
        </form>
      </header>

      <ConfigEditor config={config} />

      <QrCard siteUrl={siteUrl} qrSvg={qrSvg} />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Posts ({posts.length})
        </h2>
        {posts.length === 0 ? (
          <p className="text-sm text-neutral-500">Nothing posted yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {posts.map((post) => (
              <PostRow key={post.id} post={post} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function ConfigEditor({ config }: { config: Config }) {
  return (
    <form
      action={updateConfig}
      className="flex flex-col gap-3 rounded-xl border border-neutral-800 p-4"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
        Page settings
      </h2>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-400">Title</span>
        <input
          name="title"
          defaultValue={config.title}
          maxLength={100}
          className="rounded-lg bg-neutral-900 px-3 py-2 text-neutral-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-400">Message</span>
        <textarea
          name="message"
          defaultValue={config.message ?? ""}
          maxLength={280}
          rows={2}
          className="resize-none rounded-lg bg-neutral-900 px-3 py-2 text-neutral-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-neutral-300">
        <input
          type="checkbox"
          name="active"
          defaultChecked={config.active}
          className="h-4 w-4 accent-emerald-500"
        />
        Wall is live (uncheck to pause uploads/voting)
      </label>

      <button className="self-start rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 active:bg-emerald-400">
        Save settings
      </button>
    </form>
  );
}

function QrCard({ siteUrl, qrSvg }: { siteUrl: string; qrSvg: string }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-neutral-800 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
        Shirt QR code
      </h2>

      {qrSvg ? (
        <>
          <div
            // The SVG is generated server-side from `siteUrl` (trusted), not user
            // input — safe to inline. White card so the dark code stays scannable.
            className="mx-auto w-44 rounded-lg bg-white p-3 [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <p className="break-all text-center font-mono text-xs text-neutral-400">
            {siteUrl}
          </p>
          <p className="text-center text-xs text-neutral-500">
            Print this page (or screenshot the code) and put it on the shirt.
          </p>
        </>
      ) : (
        <p className="text-sm text-neutral-500">
          Set <code className="text-neutral-300">NEXT_PUBLIC_SITE_URL</code> to your
          deployed URL to generate the QR code.
        </p>
      )}
    </section>
  );
}

function PostRow({ post }: { post: AdminPost }) {
  return (
    <li className="flex gap-3 rounded-xl border border-neutral-800 p-3">
      <Thumb post={post} />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-neutral-200">▲ {post.vote_count}</span>
          {post.featured && (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-300">
              featured
            </span>
          )}
          {post.hidden && (
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-red-300">
              hidden
            </span>
          )}
        </div>

        {post.caption && (
          <p className="truncate text-sm text-neutral-300">{post.caption}</p>
        )}

        <div className="flex flex-wrap gap-2">
          <ToggleButton
            action={setFeatured}
            id={post.id}
            field="featured"
            next={!post.featured}
            label={post.featured ? "Unfeature" : "Feature"}
          />
          <ToggleButton
            action={setHidden}
            id={post.id}
            field="hidden"
            next={!post.hidden}
            label={post.hidden ? "Unhide" : "Hide"}
          />
          <form action={deletePost}>
            <input type="hidden" name="id" value={post.id} />
            <input type="hidden" name="imagePath" value={post.image_path ?? ""} />
            <ConfirmButton
              message="Delete this post permanently? This can't be undone."
              className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-300 active:bg-red-500/10"
            >
              Delete
            </ConfirmButton>
          </form>
        </div>
      </div>
    </li>
  );
}

function ToggleButton({
  action,
  id,
  field,
  next,
  label,
}: {
  action: (formData: FormData) => void;
  id: string;
  field: "featured" | "hidden";
  next: boolean;
  label: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name={field} value={String(next)} />
      <button className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-200 active:bg-neutral-800">
        {label}
      </button>
    </form>
  );
}

function Thumb({ post }: { post: AdminPost }) {
  if (post.type === "photo" && post.image_path) {
    return (
      <Image
        src={photoUrl(post.image_path)}
        alt={post.caption ?? "Photo"}
        width={64}
        height={64}
        className="h-16 w-16 shrink-0 rounded-lg bg-neutral-800 object-cover"
      />
    );
  }
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-2xl">
      {post.type === "location" ? "📍" : "?"}
    </div>
  );
}
