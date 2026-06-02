import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { clientIp, rateLimit } from "@/lib/rateLimit";

// POST /api/vote  { postId, deviceId }  -> cast one vote per device for a post.
// Delegates to the `cast_vote(post_id, device_id)` Postgres RPC, which is
// atomic and silently ignores duplicate votes from the same device.
// Returns the post's new (or current, if a dupe) vote_count.

export async function POST(request: Request) {
  // Generous: the RPC already dedupes votes, so this just caps brute spam.
  const limit = rateLimit(`vote:${clientIp(request)}`, 60, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Slow down a moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const postId = typeof body.postId === "string" ? body.postId : null;
  const deviceId = typeof body.deviceId === "string" ? body.deviceId : null;
  if (!postId || !deviceId) {
    return NextResponse.json(
      { error: "postId and deviceId are required" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cast_vote", {
    p_post_id: postId,
    p_device_id: deviceId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ voteCount: (data as number) ?? 0 });
}
