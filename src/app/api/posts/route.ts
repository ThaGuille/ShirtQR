import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { POST_COLUMNS, type Post } from "@/lib/types";

// GET  /api/posts  -> list visible posts, most-voted first.
// POST /api/posts  -> create a post (photo or location).
//
// Reads/writes go through the anon Supabase client; Row Level Security
// (see supabase/schema.sql) is what actually restricts what's allowed.

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_COLUMNS)
    .order("featured", { ascending: false })
    .order("vote_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ posts: (data ?? []) as Post[] });
}

export async function POST(request: Request) {
  // Cap new posts per IP so one device can't flood the wall.
  const limit = rateLimit(`posts:${clientIp(request)}`, 10, 10 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "You're posting too fast. Try again in a minute." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const type = body.type;
  if (type !== "photo" && type !== "location") {
    return NextResponse.json(
      { error: "type must be 'photo' or 'location'" },
      { status: 400 },
    );
  }

  const imagePath = typeof body.imagePath === "string" ? body.imagePath : null;
  const lat = typeof body.lat === "number" ? body.lat : null;
  const lng = typeof body.lng === "number" ? body.lng : null;

  if (type === "photo" && !imagePath) {
    return NextResponse.json(
      { error: "imagePath is required for a photo" },
      { status: 400 },
    );
  }
  if (type === "location") {
    if (lat === null || lng === null) {
      return NextResponse.json(
        { error: "lat and lng are required for a location" },
        { status: 400 },
      );
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: "lat/lng out of range" },
        { status: 400 },
      );
    }
  }

  // Trim/cap the caption; empty -> null so the DB stays clean.
  const rawCaption = typeof body.caption === "string" ? body.caption : "";
  const caption = rawCaption.trim().slice(0, 280) || null;
  const deviceId = typeof body.deviceId === "string" ? body.deviceId : null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .insert({
      type,
      image_path: type === "photo" ? imagePath : null,
      caption,
      lat: type === "location" ? lat : null,
      lng: type === "location" ? lng : null,
      device_id: deviceId,
      // hidden / featured / vote_count are left at their DB defaults — the RLS
      // insert policy requires exactly that, so don't set them here.
    })
    .select(POST_COLUMNS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ post: data as Post }, { status: 201 });
}
