"use client";

import { useEffect, useState } from "react";
import { getDeviceId } from "@/lib/deviceId";

// One-tap upvote. Optimistic: the count bumps instantly, then reconciles with
// the server's true count. The server RPC dedupes per device, so a stray double
// tap can't inflate the count even if the UI guard is bypassed.
//
// We also remember locally which posts this browser voted on, so the button
// stays "voted" across reloads (matches the device's one-vote-per-post reality).

const VOTED_KEY = "shirtqr_voted";

function votedPosts(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(VOTED_KEY) ?? "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function rememberVote(postId: string) {
  const next = new Set(votedPosts());
  next.add(postId);
  localStorage.setItem(VOTED_KEY, JSON.stringify([...next]));
}

export function VoteButton({
  postId,
  initialCount,
}: {
  postId: string;
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(false);
  const [pending, setPending] = useState(false);

  // localStorage is client-only — read it after hydration to avoid a mismatch.
  useEffect(() => {
    setVoted(votedPosts().includes(postId));
  }, [postId]);

  async function vote() {
    if (voted || pending) return;
    setPending(true);
    setVoted(true);
    setCount((c) => c + 1); // optimistic
    rememberVote(postId);

    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, deviceId: getDeviceId() }),
      });
      const json = await res.json();
      if (res.ok && typeof json.voteCount === "number") {
        setCount(json.voteCount); // server truth wins
      }
    } catch {
      // Bad signal: keep the optimistic count. The vote may still have landed;
      // worst case the next page load shows the real number.
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={vote}
      disabled={voted || pending}
      aria-pressed={voted}
      aria-label={voted ? `Voted, ${count} votes` : `Upvote, ${count} votes`}
      className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
        voted
          ? "bg-emerald-500/20 text-emerald-300"
          : "bg-neutral-800 text-neutral-200 active:bg-neutral-700"
      } disabled:opacity-100`}
    >
      <span aria-hidden>▲</span>
      {count}
    </button>
  );
}
