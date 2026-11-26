export type PlaybackProtocol = "hls" | "dash" | "file";
export type PlaybackMediaType = "movie" | "tv" | "anime";
export type PlaybackCapability = "subtitles" | "multiple_audio" | "drm" | "resume" | "live";
export interface PlaybackTitleRef {
  mediaType: PlaybackMediaType;
  catalogueProvider: "tmdb" | "anilist";
  catalogueId: string;
  seasonNumber?: number;
  episodeNumber?: number;
  territory?: string;
}
export interface PlaybackRequest extends PlaybackTitleRef {
  userId: string;
}
export interface PlaybackSubtitle {
  language: string;
  label: string;
  url: string;
  isDefault?: boolean;
}
export interface PlaybackAudioTrack {
  language: string;
  label: string;
  isDefault?: boolean;
}
export interface PlaybackSource {
  providerKey: string;
  providerName: string;
  sourceId: string;
  protocol: PlaybackProtocol;
  manifestUrl: string;
  expiresAt?: string;
  headers?: Record<string,string>;
  subtitles: PlaybackSubtitle[];
  audioTracks: PlaybackAudioTrack[];
  drm?: { scheme: "widevine" | "fairplay" | "playready"; licenseUrl: string; headers?: Record<string,string> };
  resumePositionSeconds?: number;
}
export interface PlaybackProvider {
  readonly key: string;
  readonly displayName: string;
  readonly capabilities: readonly PlaybackCapability[];
  canPlay(request: PlaybackRequest): Promise<boolean>;
  resolve(request: PlaybackRequest): Promise<PlaybackSource | null>;
}
export type PlaybackResolution =
  | { status: "ready"; source: PlaybackSource }
  | { status: "unavailable"; reason: "no_authorized_provider" | "not_available_in_territory" | "rights_not_verified" };
