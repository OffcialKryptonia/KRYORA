import "server-only";
import type { PlaybackProviderAdapter } from "./adapter-contract";

/**
 * MovieBox integration scaffold.
 * Connect this adapter only through MovieBox's partner-approved API contract.
 * The public third-party repository is not used as an upstream endpoint.
 */
export const movieboxAdapter: PlaybackProviderAdapter = {
  key: "moviebox",
  async resolve() {
    return {
      status: "unavailable",
      reason: "moviebox_partner_api_not_configured",
    };
  },
};
