# KRYORA multi-provider playback

## Design principles
- The KRYORA player consumes one normalized playback contract; provider-specific APIs stay behind adapters.
- Register only providers with documented APIs, valid credentials, contractual streaming rights, and territory entitlement.
- Provider secrets and signed manifest URLs are server-side only. Signed URLs must be short-lived and must never be persisted in viewing history.
- Metadata providers (TMDB/AniList) are not playback providers and do not grant streaming rights.
- No scraping, DRM circumvention, unauthorized embeds, or fabricated stream URLs.

## Components
1. **Player UI** — one responsive experience for loading, playback, errors, captions, audio selection, and episode navigation.
2. **Playback API / orchestrator** — authenticates the user, checks territory and rights, chooses an eligible provider by priority, obtains a short-lived source, and applies safe fallback.
3. **Provider adapters** — implement `PlaybackProvider` in `src/lib/playback/types.ts`; isolate provider auth, catalog ID mapping, source resolution, DRM and subtitle mapping.
4. **Playback persistence** — `playback_progress` stores only user progress and catalogue references, never stream URLs or provider credentials.
5. **Operations/admin** — provider enablement, health, territory, rights windows and audit history. Provider secrets belong in server environment variables or a secrets manager, not client-visible database rows.

## Provider onboarding checklist
- Written authorization and content/territory scope verified.
- API documentation and credentials supplied through secure configuration.
- Supported protocols (HLS/DASH), DRM, captions, audio tracks and token expiry tested.
- Provider adapter implemented and contract-tested.
- Failover, timeout, rate-limit and outage behaviour tested.
- Signed URLs and DRM licence requests are never exposed in logs.
- Only then enable the provider in the admin control plane.

## Current implementation boundary
The architecture and database foundation are in place. No streaming provider is registered or enabled yet. KRYORA remains a discovery platform until an authorized provider is integrated.
