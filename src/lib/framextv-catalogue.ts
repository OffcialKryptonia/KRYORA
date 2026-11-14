import type { CatalogueTitle, MediaKind } from "./catalogue/types";

const API_BASE = "https://api.framextv.tech";
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
  if (!response.ok) throw new Error(`FrameXTV returned HTTP ${response.status}`);
  return response.json() as Promise<T>;
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
    seasons: raw.seasons ?? [],
    recommendations: (raw.recommendations ?? []).map(mapTitle).filter((item): item is CatalogueTitle => item !== null),
  };
}
export async function getFrameXTVSeason(id: string, season: number): Promise<FrameXTVEpisode[]> {
  const data = await getJson<RawEpisodes>(`/api/season?id=${encodeURIComponent(id)}&season=${season}`);
  return data.episodes ?? [];
}
