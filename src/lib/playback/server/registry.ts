import "server-only";
import type { PlaybackProviderAdapter } from "./adapter-contract";
import { movieboxAdapter } from "./moviebox-adapter";

/**
 * Production adapters are enabled only after official provider contracts,
 * credentials, rights, territory and entitlement checks are reviewed.
 * The MovieBox adapter is registered as a safe placeholder and fails closed
 * until its partner-approved API integration is configured.
 */
const adapters = new Map<string, PlaybackProviderAdapter>([
  [movieboxAdapter.key, movieboxAdapter],
]);

export function getPlaybackAdapter(adapterKey: string): PlaybackProviderAdapter | null {
  return adapters.get(adapterKey) ?? null;
}

export function getRegisteredAdapterKeys(): string[] {
  return [...adapters.keys()];
}
