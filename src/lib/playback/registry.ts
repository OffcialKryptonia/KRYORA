import type { PlaybackProvider, PlaybackRequest, PlaybackResolution } from "./types";

/**
 * Provider adapters are registered here only after their contract, credentials,
 * territories and content rights have been verified. Never add scraped embeds
 * or undocumented third-party stream URLs.
 */
const providers = new Map<string, PlaybackProvider>();

export function registerPlaybackProvider(provider: PlaybackProvider): void {
  if (providers.has(provider.key)) throw new Error(`Playback provider already registered: ${provider.key}`);
  providers.set(provider.key, provider);
}

export function listPlaybackProviders(): Array<Pick<PlaybackProvider,"key"|"displayName"|"capabilities">> {
  return [...providers.values()].map(({key,displayName,capabilities})=>({key,displayName,capabilities}));
}

export async function resolvePlayback(request: PlaybackRequest): Promise<PlaybackResolution> {
  const ordered=[...providers.values()];
  for (const provider of ordered) {
    if (!await provider.canPlay(request)) continue;
    const source=await provider.resolve(request);
    if (source) return {status:"ready",source};
  }
  return {status:"unavailable",reason:"no_authorized_provider"};
}
