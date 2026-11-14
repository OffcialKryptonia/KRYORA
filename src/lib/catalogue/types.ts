export type MediaKind = "movie" | "series" | "anime" | "animation";
export interface Genre { id: string; name: string; }
export interface PersonCredit { id: string; name: string; role?: string; profileImageUrl?: string; }
export interface CatalogueTitle {
  id: string; provider: string; providerId: string; kind: MediaKind; title: string;
  synopsis?: string; releaseDate?: string; year?: number; runtimeMinutes?: number;
  posterUrl?: string; backdropUrl?: string; averageRating?: number; genres: Genre[];
  cast?: PersonCredit[];
}
export interface CataloguePage { items: CatalogueTitle[]; page: number; totalPages: number; totalResults: number; }
export interface CatalogueSearchOptions { query: string; page?: number; kind?: MediaKind; language?: string; region?: string; }
export interface CatalogueProvider {
  readonly name: string;
  search(options: CatalogueSearchOptions): Promise<CataloguePage>;
  getTitle(id: string, kind: MediaKind): Promise<CatalogueTitle | null>;
}
export class CatalogueProviderError extends Error {
  constructor(message: string, public readonly provider: string, options?: ErrorOptions) {
    super(message, options); this.name = "CatalogueProviderError";
  }
}