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

The UI must not assume that a metadata record is playable. The documented FrameXTV playback integration uses `https://framextv.xyz/embed/{tmdb_id}` for movies and `https://framextv.xyz/embed/{tmdb_id}/{season}/{episode}` for series. KRYORA constructs these URLs from validated IDs and embeds the provider player. The published documentation does not describe a public catalogue-search API; catalogue discovery must not be represented as an API capability until FrameXTV documents or confirms one.

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

## FrameXTV playback integration
- Player origin: `https://framextv.xyz`.
- Movie URL: `/embed/{tmdb_id}`.
- Series URL: `/embed/{tmdb_id}/{season}/{episode}`.
- KRYORA playback routes accept `?watch=movie&id={tmdb_id}` or `?watch=series&id={tmdb_id}&season={season}&episode={episode}`.
- IDs and episode numbers are validated before an iframe URL is built.
- KRYORA embeds the provider player and does not proxy or extract media streams.
- Playback availability and provider permissions remain subject to FrameXTV.

## FrameXTV catalogue adapter
KRYORA uses the FrameXTV catalogue backend at `https://api.framextv.tech`. The integration currently targets the endpoints documented by a third-party FrameXTV CloudStream provider project:
- `GET /api/home` for homepage hero and catalogue rails
- `GET /api/search?q={query}` for search
- `GET /api/details?id={id}&type={movie|tv}` for movie/series details
- `GET /api/season?id={id}&season={number}` for episode lists
These endpoints are integration leads rather than a published official catalogue API contract. Their live availability, CORS behavior, response stability and permission to reuse remain to be verified. Anime is displayed from catalogue rails/search; a dedicated detail/playback path is not enabled until verified.
