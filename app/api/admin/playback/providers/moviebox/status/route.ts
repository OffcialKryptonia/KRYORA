import { NextResponse } from "next/server";
import { createClient } from "../../../../../../src/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: admin } = await supabase.from("kryora_admin_users").select("role").eq("user_id", user.id).maybeSingle();
    if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

    const baseUrl = process.env.MOVIEBOX_PARTNER_API_BASE_URL ?? "";
    const token = process.env.MOVIEBOX_PARTNER_API_TOKEN ?? "";
    let validBaseUrl = false;
    if (baseUrl) {
      try {
        const url = new URL(baseUrl);
        validBaseUrl = url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash;
      } catch {
        validBaseUrl = false;
      }
    }

    const config = {
      endpointConfigured: Boolean(baseUrl),
      endpointValid: validBaseUrl,
      credentialConfigured: Boolean(token),
      readyForPartnerConnection: Boolean(baseUrl && validBaseUrl && token),
      adapterConnected: false,
      playbackEnabled: false,
      note: "Configuration readiness only. This endpoint does not contact MovieBox or expose secrets.",
    };
    return NextResponse.json(config, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "MovieBox readiness check unavailable." }, { status: 503 });
  }
}
