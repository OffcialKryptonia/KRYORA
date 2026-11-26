import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../src/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getAdminClient() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  const { data: membership } = await supabase.from("kryora_admin_users").select("role").eq("user_id", user.id).maybeSingle();
  if (!membership) return { response: NextResponse.json({ error: "Administrator access required." }, { status: 403 }) };
  return { supabase, user };
}

export async function GET() {
  try {
    const auth = await getAdminClient();
    if ("response" in auth) return auth.response;
    const { data, error } = await auth.supabase.from("playback_providers")
      .select("id,provider_key,display_name,adapter_key,enabled,priority,supported_protocols,capabilities,created_at,updated_at")
      .order("priority", { ascending: true });
    if (error) return NextResponse.json({ error: "Could not load provider registry." }, { status: 500 });
    return NextResponse.json({ providers: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Playback administration is unavailable." }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAdminClient();
    if ("response" in auth) return auth.response;
    let body: Record<string, unknown>;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
    const providerKey = String(body.providerKey ?? "").trim().toLowerCase();
    const displayName = String(body.displayName ?? "").trim();
    const adapterKey = String(body.adapterKey ?? "").trim().toLowerCase();
    const protocols = Array.isArray(body.protocols) ? body.protocols.filter((v): v is string => ["hls", "dash", "file"].includes(v)) : [];
    if (!/^[a-z0-9][a-z0-9_-]{1,39}$/.test(providerKey) || !displayName || displayName.length > 80 || !/^[a-z0-9][a-z0-9_-]{1,39}$/.test(adapterKey) || protocols.length === 0) {
      return NextResponse.json({ error: "Provide a valid provider key, name, adapter key and at least one supported protocol." }, { status: 400 });
    }
    const { data, error } = await auth.supabase.from("playback_providers").insert({
      provider_key: providerKey, display_name: displayName, adapter_key: adapterKey,
      enabled: false, priority: 100, supported_protocols: [...new Set(protocols)],
      capabilities: { subtitles: false, multiple_audio: false, drm: false, resume: true },
      configuration: { integration_status: "pending", credentials_configured: false },
    }).select("id,provider_key,display_name,adapter_key,enabled,priority,supported_protocols,capabilities").single();
    if (error) return NextResponse.json({ error: error.code === "23505" ? "That provider key already exists." : "Could not register provider." }, { status: error.code === "23505" ? 409 : 500 });
    await auth.supabase.from("kryora_admin_audit_logs").insert({
      actor_id: auth.user.id, action: "registered_playback_provider", resource: providerKey,
      details: { display_name: displayName, adapter_key: adapterKey, enabled: false },
    });
    return NextResponse.json({ provider: data }, { status: 201 });
  } catch { return NextResponse.json({ error: "Playback administration is unavailable." }, { status: 503 }); }
}
