import type { CatalogueTitle, MediaKind } from "./catalogue/types";

const API_BASE = "/api/framextv";
const DEFAULT_HEADERS: HeadersInit = { Accept: "application/json" };

export interface FrameXTVRail {
  key: string;
  title: string;
  items: CatalogueTitle[];
}
export interface FrameXTVHome {
  hero: CatalogueTitle | null;
  rails: FrameXTVRail[];
}
export interface FrameXTVSeason {
  number: number;
  name: string;
  poster?: string;
  episodeCount?: number;
}
export interface FrameXTVEpisode {
  id: string;
  number: number;
  name: string;
  still?: string;
  airDate?: string;
  rating?: string;
  overview?: string;
}
export interface FrameXTVDetails extends CatalogueTitle {
  originalTitle?: string;
  voteCount?: number;
  status?: string;
  tagline?: string;
  episodeCount?: number;
  seasons: FrameXTVSeason[];
  recommendations: CatalogueTitle[];
}
type RawMedia = {
  id?: string | number; title?: string; name?: string; type?: string;
  rating?: string | number; image?: string; poster?: string; backdrop?: string;
  year?: string | number; releaseDate?: string; overview?: string;
  genres?: string[]; runtime?: string | number; runtimeMinutes?: number;
};
type RawRail = { title?: string; results?: RawMedia[] };
type RawHome = { hero?: RawMedia; rails?: Record<string, RawRail> };
type RawDetails = RawMedia & {
  originalTitle?: string; voteCount?: number; status?: string; tagline?: string;
  numberOfSeasons?: number; numberOfEpisodes?: number; seasons?: FrameXTVSeason[];
  recommendations?: RawMedia[];
};
type RawEpisodes = { episodes?: FrameXTVEpisode[] };

function mediaKind(type?: string): MediaKind {
  const value = (type ?? "movie").toLowerCase();
  if (value === "tv" || value === "series" || value === "tvseries") return "series";
  if (value === "anime") return "anime";
  if (value === "animation") return "animation";
  return "movie";
}
function mapTitle(raw: RawMedia): CatalogueTitle | null {
  const id = raw.id == null ? "" : String(raw.id);
  const title = raw.title || raw.name || "";
  if (!id || !title) return null;
  const year = Number.parseInt(String(raw.year ?? raw.releaseDate ?? "").slice(0, 4), 10);
  const rating = Number.parseFloat(String(raw.rating ?? ""));
  return {
    id: `framextv:${mediaKind(raw.type)}:${id}`,
    provider: "framextv",
    providerId: id,
    kind: mediaKind(raw.type),
    title,
    synopsis: raw.overview,
    releaseDate: raw.releaseDate,
    year: Number.isFinite(year) ? year : undefined,
    runtimeMinutes: raw.runtimeMinutes ?? (typeof raw.runtime === "number" ? raw.runtime : undefined),
    posterUrl: raw.poster || raw.image,
    backdropUrl: raw.backdrop,
    averageRating: Number.isFinite(rating) ? rating : undefined,
    genres: (raw.genres ?? []).map((name, index) => ({ id: `${index}-${name}`, name })),
  };
}
async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { headers: DEFAULT_HEADERS });
  const payload = await response.json().catch(() => null) as { error?: string } | T | null;
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
      ? payload.error : `Catalogue request failed (HTTP ${response.status}).`;
    throw new Error(message);
  }
  if (payload === null) throw new Error("FrameXTV returned an empty response.");
  return payload as T;
}

async function getAniListDetails(id: string): Promise<FrameXTVDetails> {
  const query = `query ($id: Int) {
    Media(id: $id, type: ANIME, isAdult: false) {
      id title { english romaji native } coverImage { extraLarge large }
      bannerImage description episodes genres averageScore seasonYear
    }
  }`;
  const response = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { id: Number(id) } }),
  });
  if (!response.ok) throw new Error(`AniList returned HTTP ${response.status}`);
  const payload = await response.json() as { data?: { Media?: {
    id?: number; title?: { english?: string; romaji?: string; native?: string };
    coverImage?: { extraLarge?: string; large?: string }; bannerImage?: string;
    description?: string; episodes?: number; genres?: string[];
    averageScore?: number; seasonYear?: number;
  } } };
  const media = payload.data?.Media;
  if (!media?.id) throw new Error("AniList did not return this anime.");
  const title = media.title?.english || media.title?.romaji || media.title?.native || `Anime ${id}`;
  const synopsis = media.description?.replace(/<[^>]*>/g, " ").replace(/\\s+/g, " ").trim();
  return {
    id: `framextv:anime:${media.id}`, provider: "framextv", providerId: String(media.id),
    kind: "anime", title, synopsis, year: media.seasonYear,
    posterUrl: media.coverImage?.extraLarge || media.coverImage?.large,
    backdropUrl: media.bannerImage,
    averageRating: media.averageScore == null ? undefined : media.averageScore / 10,
    episodeCount: media.episodes,
    genres: (media.genres ?? []).map((name, index) => ({ id: `${index}-${name}`, name })),
    seasons: [], recommendations: [],
  };
}

export async function getFrameXTVHome(): Promise<FrameXTVHome> {
  const data = await getJson<RawHome>("/api/home");
  const rails = Object.entries(data.rails ?? {}).map(([key, rail]) => ({
    key,
    title: rail.title || key.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    items: (rail.results ?? []).map(mapTitle).filter((item): item is CatalogueTitle => item !== null),
  }));
  return { hero: data.hero ? mapTitle(data.hero) : null, rails };
}
export async function searchFrameXTV(query: string): Promise<CatalogueTitle[]> {
  const data = await getJson<{ results?: RawMedia[] }>(`/api/search?q=${encodeURIComponent(query)}`);
  return (data.results ?? []).map(mapTitle).filter((item): item is CatalogueTitle => item !== null);
}
export async function getFrameXTVDetails(id: string, kind: MediaKind): Promise<FrameXTVDetails> {
  if (kind === "anime") return getAniListDetails(id);
  const type = kind === "series" ? "tv" : kind;
  const raw = await getJson<RawDetails>(`/api/details?id=${encodeURIComponent(id)}&type=${encodeURIComponent(type)}`);
  const title = mapTitle({ ...raw, id: raw.id ?? id, type });
  if (!title) throw new Error("FrameXTV returned incomplete title details.");
  return {
    ...title,
    originalTitle: raw.originalTitle,
    voteCount: raw.voteCount,
    status: raw.status,
    tagline: raw.tagline,
    episodeCount: raw.numberOfEpisodes,
    seasons: raw.seasons ?? [],
    recommendations: (raw.recommendations ?? []).map(mapTitle).filter((item): item is CatalogueTitle => item !== null),
  };
}
export async function getFrameXTVSeason(id: string, season: number): Promise<FrameXTVEpisode[]> {
  const data = await getJson<RawEpisodes>(`/api/season?id=${encodeURIComponent(id)}&season=${season}`);
  return data.episodes ?? [];
}
