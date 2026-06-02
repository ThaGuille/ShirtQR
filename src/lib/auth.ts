// Admin auth: a single shared password (ADMIN_PASSWORD) gates /admin.
// SERVER ONLY — this reads ADMIN_PASSWORD (no NEXT_PUBLIC prefix) and uses
// node:crypto, so never import it into a Client Component.
import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "shirtqr_admin";

// The cookie stores a hash of the password, not the password itself, so the
// plaintext never rides along in a cookie. This is a single shared festival
// password (not per-user accounts), so a plain SHA-256 is enough — the point is
// "don't ship the secret to the browser", not resist offline cracking.
export function adminToken(): string {
  return createHash("sha256")
    .update(process.env.ADMIN_PASSWORD ?? "")
    .digest("hex");
}

// Constant-time string compare that won't throw on length mismatch.
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

// True if the submitted password matches ADMIN_PASSWORD. Empty/unset password
// is treated as "locked" so a misconfigured deploy can't be walked into.
export function checkPassword(input: string): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  return safeEqual(input, password);
}

// True if the current request carries a valid admin cookie.
export async function isAdmin(): Promise<boolean> {
  if (!process.env.ADMIN_PASSWORD) return false;
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  return !!value && safeEqual(value, adminToken());
}
