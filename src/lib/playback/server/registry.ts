import "server-only";
import type { PlaybackProviderAdapter } from "./adapter-contract";

/**
 * Production adapters are added here only after KRYORA has verified:
 * - a provider contract and distribution rights,
 * - official API documentation and credentials,
 * - territory/content entitlement checks,
 * - signed-manifest expiry and DRM requirements.
 *
 * The test_provider/test_adapter registry record is intentionally NOT an adapter.
 * Registration alone must never make a provider playable.
 */
const adapters = new Map<string, PlaybackProviderAdapter>();

export function getPlaybackAdapter(adapterKey: string): PlaybackProviderAdapter | null {
  return adapters.get(adapterKey) ?? null;
}

export function getRegisteredAdapterKeys(): string[] {
  return [...adapters.keys()];
}
