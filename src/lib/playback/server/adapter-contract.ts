import "server-only";

export type PlaybackProtocol = "hls" | "dash" | "file";
export type PlaybackMediaType = "movie" | "tv" | "anime";
export type CatalogueProvider = "tmdb" | "anilist";

export type PlaybackResolveInput = {
  mediaType: PlaybackMediaType;
  catalogueProvider: CatalogueProvider;
  catalogueId: string;
  seasonNumber?: number;
  episodeNumber?: number;
  territory: string;
  providerKey: string;
  providerContentId: string;
  sourceReference: string | null;
  supportedProtocols: PlaybackProtocol[];
};

export type PlaybackSession = {
  manifestUrl: string;
  protocol: PlaybackProtocol;
  expiresAt: string;
  // DRM details are intentionally adapter-specific and must be short-lived.
  drm?: {
    scheme: "widevine" | "playready" | "fairplay";
    licenseUrl: string;
    requestHeaders?: Record<string, string>;
  };
  subtitles?: Array<{
    language: string;
    label: string;
    url: string;
    default?: boolean;
  }>;
  audioTracks?: Array<{ language: string; label: string }>;
};

export type PlaybackAdapterResult =
  | { status: "ready"; session: PlaybackSession }
  | { status: "unavailable"; reason: string };

export interface PlaybackProviderAdapter {
  readonly key: string;
  resolve(input: PlaybackResolveInput): Promise<PlaybackAdapterResult>;
}

/**
 * Adapter implementations must call only their provider's documented API.
 * They must treat sourceReference as an opaque identifier, never as a URL to fetch.
 * Provider credentials belong in server-side environment secrets or a secret manager.
 */
