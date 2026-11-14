export type FrameXTVMedia = "movie" | "series";

export interface FrameXTVPlaybackRequest {
  media: FrameXTVMedia;
  tmdbId: string;
  season?: number;
  episode?: number;
}

const PLAYER_ORIGIN = "https://framextv.xyz";

export function buildFrameXTVEmbedUrl(request: FrameXTVPlaybackRequest): string {
  if (!/^\d+$/.test(request.tmdbId)) {
    throw new Error("A valid numeric TMDB ID is required by FrameXTV.");
  }
  let path = `/embed/${encodeURIComponent(request.tmdbId)}`;
  if (request.media === "series") {
    if (!Number.isInteger(request.season) || !Number.isInteger(request.episode) ||
        (request.season ?? 0) < 1 || (request.episode ?? 0) < 1) {
      throw new Error("Series playback requires a season and episode number.");
    }
    path += `/${request.season}/${request.episode}`;
  }
  const url = new URL(path, PLAYER_ORIGIN);
  url.searchParams.set("autoplay", "0");
  url.searchParams.set("muted", "0");
  return url.toString();
}

export const FRAMEX_TV_PLAYER_ORIGIN = PLAYER_ORIGIN;
