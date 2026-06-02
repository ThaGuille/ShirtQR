// Shared shapes for the public page + API routes.

export type Post = {
  id: string;
  type: "photo" | "location";
  image_path: string | null;
  caption: string | null;
  lat: number | null;
  lng: number | null;
  vote_count: number;
  featured: boolean;
  created_at: string;
};

export type Config = {
  title: string;
  message: string | null;
  active: boolean;
};

// The columns clients are allowed to see. Kept in one place so the page's
// server fetch and the /api/posts route always select the same shape.
// `device_id` is intentionally excluded — it's a submitter tag, not public.
export const POST_COLUMNS =
  "id, type, image_path, caption, lat, lng, vote_count, featured, created_at";

// Admin sees everything the public does plus `hidden` (the soft-delete flag),
// including posts that are currently hidden.
export type AdminPost = Post & { hidden: boolean };

export const ADMIN_POST_COLUMNS = `${POST_COLUMNS}, hidden`;
