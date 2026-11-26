import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../src/lib/supabase/server";
import { getPlaybackAdapter } from "../../../../src/lib/playback/server/registry";
import type { PlaybackMediaType, CatalogueProvider, PlaybackProtocol } from "../../../../src/lib/playback/server/adapter-contract";

export const dynamic = "force-dynamic";
const mediaTypes = new Set<PlaybackMediaType>(["movie", "tv", "anime"]);
const catalogueProviders = new Set<CatalogueProvider>(["tmdb", "anilist"]);

function isSafeSession(session: { manifestUrl: string; protocol: PlaybackProtocol; expiresAt: string; drm?: { licenseUrl: string } }, supported: string[]) {
  const now = Date.now();
  const expiry = Date.parse(session.expiresAt);
  try {
    const manifest = new URL(session.manifestUrl);
    if (manifest.protocol !== "https:") return false;
    if (!supported.includes(session.protocol)) return false;
    if (!Number.isFinite(expiry) || expiry <= now || expiry > now + 10 * 60 * 1000) return false;
    if (session.drm) {
      const license = new URL(session.drm.licenseUrl);
      if (license.protocol !== "https:") return false;
    }
    return true;
  } catch { return false; }
}

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

  if (!mediaTypes.has(mediaType as PlaybackMediaType) || !catalogueProviders.has(catalogueProvider as CatalogueProvider) || !catalogueId || catalogueId.length > 100) {
    return NextResponse.json({ error: "A valid catalogue title reference is required." }, { status: 400 });
  }
  if ((seasonNumber === null) !== (episodeNumber === null)) return NextResponse.json({ error: "Season and episode must be supplied together." }, { status: 400 });
  if (seasonNumber !== null && (!/^\\d+$/.test(seasonNumber) || !/^\\d+$/.test(episodeNumber ?? ""))) {
    return NextResponse.json({ error: "Season and episode must be valid non-negative integers." }, { status: 400 });
  }

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

  for (const source of eligible as any[]) {
    const provider = source.playback_providers;
    const adapter = getPlaybackAdapter(provider.adapter_key);
    if (!adapter) continue;
    try {
      const result = await adapter.resolve({
        mediaType: mediaType as PlaybackMediaType,
        catalogueProvider: catalogueProvider as CatalogueProvider,
        catalogueId,
        ...(seasonNumber !== null ? { seasonNumber: Number(seasonNumber), episodeNumber: Number(episodeNumber) } : {}),
        territory,
        providerKey: provider.provider_key,
        providerContentId: source.provider_content_id,
        sourceReference: source.source_reference,
        supportedProtocols: provider.supported_protocols as PlaybackProtocol[],
      });
      if (result.status !== "ready") continue;
      if (!isSafeSession(result.session, provider.supported_protocols)) continue;
      return NextResponse.json({
        status: "ready",
        provider: { key: provider.provider_key, name: provider.display_name },
        session: result.session,
      }, { headers: { "Cache-Control": "private, no-store" } });
    } catch {
      // Fail closed and try the next eligible provider. Never return provider internals.
    }
  }

  const hasEligibleSource = eligible.length > 0;
  return NextResponse.json({
    status: "unavailable",
    reason: hasEligibleSource ? "provider_adapter_not_configured" : "no_authorized_provider",
    message: hasEligibleSource
      ? "An eligible rights-verified source exists, but its secure provider adapter has not been connected."
      : "Playback is not currently available for this title in the selected territory.",
    providers: eligible.map((source: any) => ({
      key: source.playback_providers.provider_key,
      name: source.playback_providers.display_name,
      adapter: source.playback_providers.adapter_key,
    })),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
