// Hidden controller page — open this on your phone to manage the shirt.
// Gated by a single password (ADMIN_PASSWORD): no cookie -> show the login form;
// valid cookie -> load everything (including hidden posts) with the service-role
// client and render the dashboard.
import QRCode from "qrcode";
import { isAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/siteUrl";
import { ADMIN_POST_COLUMNS, type AdminPost, type Config } from "@/lib/types";
import { LoginForm } from "./LoginForm";
import { AdminDashboard } from "./AdminDashboard";

export const dynamic = "force-dynamic";

const DEFAULT_CONFIG: Config = {
  title: "Scan & Share",
  message: null,
  active: true,
};

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return <LoginForm />;
  }

  const supabase = createAdminClient();
  const [postsResult, configResult, siteUrl] = await Promise.all([
    supabase
      .from("posts")
      .select(ADMIN_POST_COLUMNS)
      .order("featured", { ascending: false })
      .order("vote_count", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("config").select("title, message, active").eq("id", true).single(),
    getSiteUrl(),
  ]);

  // QR points at the public page — what goes on the shirt. Generated as SVG so
  // it prints crisp at any size.
  const qrSvg = siteUrl
    ? await QRCode.toString(siteUrl, {
        type: "svg",
        margin: 1,
        color: { dark: "#0a0a0a", light: "#ffffff" },
      })
    : "";

  return (
    <AdminDashboard
      posts={(postsResult.data ?? []) as AdminPost[]}
      config={(configResult.data as Config | null) ?? DEFAULT_CONFIG}
      siteUrl={siteUrl}
      qrSvg={qrSvg}
    />
  );
}
