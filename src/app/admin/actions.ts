"use server";

// Admin mutations, as Server Actions. These run server-side only, so the
// service-role key (which bypasses RLS) never reaches the browser, and there's
// no public admin API surface to lock down — only these typed entry points.
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ADMIN_COOKIE,
  adminToken,
  checkPassword,
  isAdmin,
} from "@/lib/auth";

export type LoginState = { error?: string };

// --- session ---------------------------------------------------------------

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password)) {
    return { error: "Wrong password." };
  }

  (await cookies()).set(ADMIN_COOKIE, adminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin");
}

// Every mutation re-checks auth: Server Actions are callable endpoints, so the
// fact that the UI only renders for admins isn't enough on its own.
async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Not authorized");
}

// --- post moderation -------------------------------------------------------

export async function setHidden(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const hidden = formData.get("hidden") === "true";

  await createAdminClient().from("posts").update({ hidden }).eq("id", id);
  refresh();
}

export async function setFeatured(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const featured = formData.get("featured") === "true";

  await createAdminClient().from("posts").update({ featured }).eq("id", id);
  refresh();
}

export async function deletePost(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const imagePath = formData.get("imagePath");

  const supabase = createAdminClient();
  // Row first (votes cascade via FK), then the stored image if there is one.
  await supabase.from("posts").delete().eq("id", id);
  if (typeof imagePath === "string" && imagePath) {
    await supabase.storage.from("photos").remove([imagePath]);
  }
  refresh();
}

// --- site config -----------------------------------------------------------

export async function updateConfig(formData: FormData) {
  await requireAdmin();
  const title =
    String(formData.get("title") ?? "").trim().slice(0, 100) || "Scan & Share";
  const message =
    String(formData.get("message") ?? "").trim().slice(0, 280) || null;
  const active = formData.get("active") === "on";

  await createAdminClient()
    .from("config")
    .update({ title, message, active, updated_at: new Date().toISOString() })
    .eq("id", true);
  refresh();
}

// Both the admin view and the public wall reflect every change.
function refresh() {
  revalidatePath("/admin");
  revalidatePath("/");
}
