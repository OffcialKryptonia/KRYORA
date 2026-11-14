# KRYORA architecture

## Product boundary
KRYORA is an independent entertainment discovery and streaming product from Kryptonia. It is not affiliated with any film studio, streaming service, comic-book publisher, or entertainment franchise.

## Initial application stack
- React 19 + TypeScript
- Vite for the browser application and production asset build
- Cloudflare Workers with Workers Static Assets as the intended hosting/runtime platform
- GitHub as the source of truth

The first commit establishes the frontend shell. Cloudflare deployment configuration is intentionally deferred until the current CLI and build workflow are verified against the connected account.

## Planned Cloudflare services
- Workers + Static Assets: application delivery and API entry point
- D1: relational application data such as profiles, watchlists, and viewing progress
- R2: user-uploaded artwork or other owned assets where required
- Stream or a separately verified playback provider: authorised video delivery
- Workers Logs and Traces: production observability

These are architectural candidates, not provisioned resources. Enable only what the implementation needs and verify account plan limits and pricing before provisioning.

## Provider boundaries
Catalogue metadata and video playback are separate concerns:
1. A catalogue adapter supplies searchable metadata, artwork references, genres, credits, seasons, and episodes.
2. A playback adapter supplies a playable source only when the content is authorised and the provider contract permits embedding.
3. User progress and watchlist services persist account-specific state.

The UI must not assume that a metadata record is playable. The FrameXTV documentation and the supplied .cc documentation / .xyz embed-host details require verification before an adapter is implemented.

## Security requirements
- Provider credentials and signing secrets stay server-side.
- Validate playback URLs against explicit provider host allowlists.
- Validate postMessage sender origins and message schemas.
- Never expose administrative or provider credentials in client bundles.
- Protect administrative routes and enforce authorization on the server, not only in the UI.
- Do not scrape or proxy unauthorised streams.
- Do not publish fabricated catalogue records, playback links, ratings, or provider capabilities.

## Environments
- Local development
- Preview / staging
- Production

Secrets, databases, and provider credentials must be isolated by environment. No production DNS changes or resource provisioning should happen until a deployment has been built and verified.
