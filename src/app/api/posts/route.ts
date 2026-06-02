import { NextResponse } from "next/server";

// GET  /api/posts  -> list visible posts, sorted by votes
// POST /api/posts  -> create a post (photo or location)
//
// TODO (Phase 2): wire to the Supabase server client (see src/lib/supabase).

export async function GET() {
  return NextResponse.json({ posts: [] });
}

export async function POST() {
  return NextResponse.json(
    { ok: false, error: "not implemented yet" },
    { status: 501 },
  );
}
