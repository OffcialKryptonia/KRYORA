import { redirect } from "next/navigation";
import { createClient } from "../../src/lib/supabase/server";
import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let supabase;
  try { supabase = await createClient(); }
  catch { redirect("/auth?next=/admin"); }

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/auth?next=/admin");

  const { data: membership, error: membershipError } = await supabase
    .from("kryora_admin_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) redirect("/account?notice=admin-access-required");

  const [profileCount, watchlistCount, historyCount, profilesResult, settingsResult] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("watchlist_items").select("id", { count: "exact", head: true }),
    supabase.from("viewing_history").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id,display_name,username,created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("kryora_platform_settings").select("key,value,description,updated_at").order("key"),
  ]);

  return <AdminDashboard
    email={user.email ?? ""}
    role={membership.role}
    stats={{ members: profileCount.count ?? 0, savedTitles: watchlistCount.count ?? 0, historyEntries: historyCount.count ?? 0 }}
    initialUsers={profilesResult.data ?? []}
    initialSettings={settingsResult.data ?? []}
    loadWarning={profilesResult.error?.message || settingsResult.error?.message || ""}
  />;
}
