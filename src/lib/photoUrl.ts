// Build the public URL for a photo in the Supabase `photos` bucket.
// The bucket is public, so the URL is a deterministic string — no round trip
// needed. Works on both server and client (NEXT_PUBLIC_* is inlined at build).
export function photoUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${path}`;
}
