import { NextResponse } from "next/server";

// POST /api/vote  { postId }  -> cast one vote per device for a post.
// Calls the `cast_vote(post_id, device_id)` Postgres RPC, which is atomic
// and ignores duplicate votes from the same device.
//
// TODO (Phase 2): read deviceId, call supabase.rpc("cast_vote", ...).

export async function POST() {
  return NextResponse.json(
    { ok: false, error: "not implemented yet" },
    { status: 501 },
  );
}
