import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../src/lib/supabase/server";
import PlaybackProviderManager from "./PlaybackProviderManager";

export const dynamic = "force-dynamic";

export default async function AdminPlaybackPage() {
  let supabase;
  try { supabase = await createClient(); } catch { redirect("/auth?next=/admin/playback"); }
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/auth?next=/admin/playback");
  const { data: membership } = await supabase.from("kryora_admin_users").select("role").eq("user_id", user.id).maybeSingle();
  if (!membership) redirect("/account?notice=admin-access-required");
  return <PlaybackProviderManager role={membership.role} />;
}
