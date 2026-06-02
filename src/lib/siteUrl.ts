import { headers } from "next/headers";

// The public origin to put on the shirt's QR code. Prefer an explicit env var
// (set NEXT_PUBLIC_SITE_URL on Vercel to your real domain); otherwise fall back
// to whatever host the current request came in on.
export async function getSiteUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (fromEnv) return fromEnv;

  const h = await headers();
  const host = h.get("host");
  if (!host) return "";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
