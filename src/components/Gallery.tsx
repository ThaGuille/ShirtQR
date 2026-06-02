"use client";

import { useState } from "react";
import Image from "next/image";
import { UploadForm } from "./UploadForm";
import { VoteButton } from "./VoteButton";
import { photoUrl } from "@/lib/photoUrl";
import type { Post } from "@/lib/types";

// The interactive shell around the public wall. Server-rendered first paint
// (it receives initialPosts already fetched on the server), then hydrates to
// handle uploads and votes. New uploads are prepended so they show instantly.
export function Gallery({ initialPosts }: { initialPosts: Post[] }) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [uploading, setUploading] = useState(false);

  function prepend(post: Post) {
    setPosts((prev) => [post, ...prev.filter((p) => p.id !== post.id)]);
  }

  // The admin pins one post as the "hero" (featured) — it shows first, large,
  // with its caption. Everything else flows into the normal grid below it.
  const hero = posts.find((p) => p.featured) ?? null;
  const rest = hero ? posts.filter((p) => p.id !== hero.id) : posts;
  const isEmpty = posts.length === 0 && !uploading;

  return (
    <>
      <UploadForm onUploaded={prepend} onPendingChange={setUploading} />

      {hero && <HeroCard post={hero} />}

      {isEmpty ? (
        <p className="rounded-xl border border-dashed border-neutral-800 p-8 text-center text-sm text-neutral-500">
          No photos yet — be the first to add one.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {/* Optimistic placeholder while an upload/location is in flight. */}
          {uploading && <SkeletonCard />}

          {rest.map((post) => (
            <li
              key={post.id}
              className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900"
            >
              <PostMedia post={post} />
              <div className="flex items-center justify-between gap-2 p-2">
                <span className="min-w-0 truncate text-sm text-neutral-300">
                  {post.caption}
                </span>
                <VoteButton postId={post.id} initialCount={post.vote_count} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// The pinned post: full width (≈2× a grid cell), with its caption shown in full.
function HeroCard({ post }: { post: Post }) {
  return (
    <section className="overflow-hidden rounded-xl border-2 border-emerald-500 bg-neutral-900">
      <PostMedia post={post} variant="hero" />
      <div className="flex items-start justify-between gap-3 p-3">
        <div className="min-w-0">
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
            ★ Featured
          </span>
          {post.caption && (
            <p className="mt-2 text-base font-medium text-neutral-100">
              {post.caption}
            </p>
          )}
        </div>
        <VoteButton postId={post.id} initialCount={post.vote_count} />
      </div>
    </section>
  );
}

function SkeletonCard() {
  return (
    <li
      aria-hidden
      className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900"
    >
      <div className="aspect-square w-full animate-pulse bg-neutral-800" />
      <div className="flex items-center justify-between p-2">
        <span className="h-3 w-16 animate-pulse rounded bg-neutral-800" />
        <span className="h-6 w-10 animate-pulse rounded-full bg-neutral-800" />
      </div>
    </li>
  );
}

function PostMedia({
  post,
  variant = "grid",
}: {
  post: Post;
  variant?: "grid" | "hero";
}) {
  const hero = variant === "hero";

  if (post.type === "photo" && post.image_path) {
    return (
      <Image
        src={photoUrl(post.image_path)}
        alt={post.caption ?? "Festival photo"}
        width={1000}
        height={hero ? 750 : 1000}
        priority={hero}
        // Hero spans the full max-w-md page; grid cells are half of it.
        sizes={hero ? "(max-width: 28rem) 100vw, 28rem" : "(max-width: 28rem) 50vw, 14rem"}
        className={`w-full bg-neutral-800 object-cover ${hero ? "aspect-[4/3]" : "aspect-square"}`}
      />
    );
  }

  // Location posts link out to Maps. A real embedded/clustered map is a heavier,
  // bandwidth-hungry add — deliberately skipped for the festival free tier.
  if (post.type === "location" && post.lat !== null && post.lng !== null) {
    return (
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${post.lat},${post.lng}`}
        target="_blank"
        rel="noreferrer"
        className={`flex w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-neutral-800 to-neutral-900 text-center ${
          hero ? "aspect-[4/3]" : "aspect-square"
        }`}
        aria-label="Open location in Google Maps"
      >
        <span className={hero ? "text-6xl" : "text-4xl"}>📍</span>
        <span className="px-2 font-mono text-[10px] text-neutral-400">
          {post.lat.toFixed(4)}, {post.lng.toFixed(4)}
        </span>
        <span className="text-xs font-medium text-emerald-400">Open in Maps</span>
      </a>
    );
  }

  return (
    <div
      className={`flex w-full items-center justify-center bg-neutral-800 text-neutral-600 ${
        hero ? "aspect-[4/3]" : "aspect-square"
      }`}
    >
      ?
    </div>
  );
}
