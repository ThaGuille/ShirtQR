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

  const isEmpty = posts.length === 0 && !uploading;

  return (
    <>
      <UploadForm onUploaded={prepend} onPendingChange={setUploading} />

      {isEmpty ? (
        <p className="rounded-xl border border-dashed border-neutral-800 p-8 text-center text-sm text-neutral-500">
          No photos yet — be the first to add one.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {/* Optimistic placeholder while an upload/location is in flight. */}
          {uploading && <SkeletonCard />}

          {posts.map((post) => (
            <li
              key={post.id}
              className={`overflow-hidden rounded-xl border bg-neutral-900 ${
                post.featured ? "border-emerald-500" : "border-neutral-800"
              }`}
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

function PostMedia({ post }: { post: Post }) {
  if (post.type === "photo" && post.image_path) {
    return (
      <Image
        src={photoUrl(post.image_path)}
        alt={post.caption ?? "Festival photo"}
        width={500}
        height={500}
        // Two columns within a max-w-md (~28rem) page -> each cell is ~13rem.
        sizes="(max-width: 28rem) 50vw, 14rem"
        className="aspect-square w-full bg-neutral-800 object-cover"
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
        className="flex aspect-square w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-neutral-800 to-neutral-900 text-center"
        aria-label="Open location in Google Maps"
      >
        <span className="text-4xl">📍</span>
        <span className="px-2 font-mono text-[10px] text-neutral-400">
          {post.lat.toFixed(4)}, {post.lng.toFixed(4)}
        </span>
        <span className="text-xs font-medium text-emerald-400">Open in Maps</span>
      </a>
    );
  }

  return (
    <div className="flex aspect-square w-full items-center justify-center bg-neutral-800 text-neutral-600">
      ?
    </div>
  );
}
