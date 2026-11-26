import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../src/lib/supabase/server";

export const dynamic = "force-dynamic";
const mediaTypes = new Set(["movie", "tv", "anime"]);
const catalogueProviders = new Set(["tmdb", "anilist"]);

export async function GET() {
  let supabase;
  try { supabase = await createClient(); } catch { return NextResponse.json({ error: "Playback service is not configured." }, { status: 503 }); }
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to view Continue Watching." }, { status: 401 });
  const { data, error } = await supabase.from("playback_progress").select("*").eq("user_id", user.id).eq("completed", false).order("updated_at", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: "Could not load playback progress." }, { status: 500 });
  return NextResponse.json({ items: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  let supabase;
  try { supabase = await createClient(); } catch { return NextResponse.json({ error: "Playback service is not configured." }, { status: 503 }); }
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to save playback progress." }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const mediaType = String(body.mediaType ?? "");
  const catalogueProvider = String(body.catalogueProvider ?? "");
  const catalogueId = String(body.catalogueId ?? "").trim();
  const title = String(body.title ?? "").trim();
  const posterUrl = typeof body.posterUrl === "string" ? body.posterUrl : null;
  const seasonNumber = body.seasonNumber == null ? null : Number(body.seasonNumber);
  const episodeNumber = body.episodeNumber == null ? null : Number(body.episodeNumber);
  const positionSeconds = Number(body.positionSeconds);
  const durationSeconds = body.durationSeconds == null ? null : Number(body.durationSeconds);

  if (!mediaTypes.has(mediaType) || !catalogueProviders.has(catalogueProvider) || !catalogueId || catalogueId.length > 100 || !title || title.length > 250) {
    return NextResponse.json({ error: "Invalid title information." }, { status: 400 });
  }
  if (!Number.isFinite(positionSeconds) || positionSeconds < 0 || (durationSeconds !== null && (!Number.isFinite(durationSeconds) || durationSeconds <= 0))) {
    return NextResponse.json({ error: "Invalid playback position." }, { status: 400 });
  }
  if ((seasonNumber === null) !== (episodeNumber === null) || (seasonNumber !== null && (!Number.isInteger(seasonNumber) || seasonNumber < 0 || !Number.isInteger(episodeNumber) || episodeNumber! < 0))) {
    return NextResponse.json({ error: "Season and episode must be valid and supplied together." }, { status: 400 });
  }
  if (posterUrl && (!posterUrl.startsWith("https://") || posterUrl.length > 2048)) return NextResponse.json({ error: "Poster URL must use HTTPS." }, { status: 400 });

  const completed = durationSeconds !== null && positionSeconds >= durationSeconds * 0.9;
  const row = {
    user_id: user.id, media_type: mediaType, catalogue_provider: catalogueProvider,
    catalogue_id: catalogueId, title, poster_url: posterUrl, season_number: seasonNumber,
    episode_number: episodeNumber, position_seconds: Math.floor(positionSeconds),
    duration_seconds: durationSeconds === null ? null : Math.floor(durationSeconds),
    completed, updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("playback_progress")
    .upsert(row, { onConflict: "user_id,media_type,catalogue_provider,catalogue_id,season_number,episode_number" })
    .select().single();
  if (error) return NextResponse.json({ error: "Could not save playback progress." }, { status: 500 });
  return NextResponse.json({ item: data }, { headers: { "Cache-Control": "private, no-store" } });
}
