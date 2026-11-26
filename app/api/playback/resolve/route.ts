import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../src/lib/supabase/server";

export const dynamic = "force-dynamic";
const mediaTypes = new Set(["movie", "tv", "anime"]);
const catalogueProviders = new Set(["tmdb", "anilist"]);

export async function GET(request: NextRequest) {
  let supabase;
  try { supabase = await createClient(); } catch { return NextResponse.json({ error: "Playback service is not configured." }, { status: 503 }); }
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to access playback." }, { status: 401 });

  const q = request.nextUrl.searchParams;
  const mediaType = q.get("mediaType") ?? "";
  const catalogueProvider = q.get("catalogueProvider") ?? "";
  const catalogueId = q.get("catalogueId") ?? "";
  const seasonNumber = q.get("seasonNumber");
  const episodeNumber = q.get("episodeNumber");
  const territory = (q.get("territory") ?? "NG").toUpperCase();

  if (!mediaTypes.has(mediaType) || !catalogueProviders.has(catalogueProvider) || !catalogueId || catalogueId.length > 100) {
    return NextResponse.json({ error: "A valid catalogue title reference is required." }, { status: 400 });
  }
  if ((seasonNumber === null) !== (episodeNumber === null)) return NextResponse.json({ error: "Season and episode must be supplied together." }, { status: 400 });

  const { data: sources, error } = await supabase
    .from("playback_sources")
    .select("id,provider_id,provider_content_id,source_reference,territory_codes,available_from,available_until,rights_verified,enabled,playback_providers!inner(provider_key,display_name,adapter_key,enabled,supported_protocols,capabilities,priority)")
    .eq("media_type", mediaType)
    .eq("external_catalogue_provider", catalogueProvider)
    .eq("external_catalogue_id", catalogueId)
    .eq("enabled", true)
    .eq("rights_verified", true)
    .eq("playback_providers.enabled", true)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Could not check playback availability." }, { status: 500 });
  const now = Date.now();
  const eligible = (sources ?? []).filter((source: any) => {
    const territories = source.territory_codes as string[];
    const territoryAllowed = territories.length === 0 || territories.includes(territory) || territories.includes("*");
    const startAllowed = !source.available_from || new Date(source.available_from).getTime() <= now;
    const endAllowed = !source.available_until || new Date(source.available_until).getTime() > now;
    return territoryAllowed && startAllowed && endAllowed;
  });

  // Source references are opaque provider-side identifiers, never client-playable URLs.
  // A provider-specific server adapter must exchange them for a short-lived signed manifest.
  return NextResponse.json({
    status: "unavailable",
    reason: eligible.length ? "provider_adapter_not_configured" : "no_authorized_provider",
    message: eligible.length
      ? "An eligible rights-verified source exists, but its secure provider adapter has not been connected."
      : "Playback is not currently available for this title in the selected territory.",
    providers: eligible.map((source: any) => ({
      key: source.playback_providers.provider_key,
      name: source.playback_providers.display_name,
      adapter: source.playback_providers.adapter_key,
    })),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
