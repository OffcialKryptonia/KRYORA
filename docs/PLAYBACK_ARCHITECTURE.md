# KRYORA playback architecture

## Current state

KRYORA uses TMDB and AniList for catalogue metadata. Neither service is treated as a video source. Playback remains disabled until a provider is contracted, the content/territory rights are verified, and an official server-side adapter is implemented.

## Resolution flow

1. The signed-in member opens a movie or episode from the catalogue.
2. The player requests `GET /api/playback/resolve` with the catalogue provider, media type, content ID, episode coordinates and territory.
3. The server authenticates the member and queries only enabled, rights-verified sources whose provider is enabled.
4. Territory and availability windows are evaluated on the server.
5. A provider adapter (not yet connected) must exchange an opaque source reference for a short-lived signed HLS/DASH manifest and any required DRM license configuration.
6. The player receives only the minimum playback session payload. Provider credentials and long-lived secrets never enter browser code.

The current resolver deliberately returns `unavailable` even when a source row exists if its adapter has not been connected. It never treats a database URL or arbitrary user input as a playable manifest.

## Provider registration

Administrators can open `/admin/playback`. New providers are registered disabled by default. Registry access is restricted by the `private.is_kryora_admin()` database authorization function. Normal authenticated members can read only enabled providers and enabled, rights-verified sources. Provider credentials must be stored in server-side secrets or a provider-specific secure integration; do not put secrets in `NEXT_PUBLIC_*` variables or browser configuration JSON.

A provider may be enabled only after:
- Official API/SDK documentation and production credentials are verified.
- KRYORA has written distribution rights for the relevant content and territories.
- Adapter implementation validates the requested title/episode against provider-side entitlements.
- Signed playback URLs have short expiry and are never persisted as catalogue data.
- DRM, audio, subtitles, error handling and fallback behavior are tested where applicable.

## Continue Watching

- `GET /api/playback/progress` returns the signed-in member's unfinished progress.
- `POST /api/playback/progress` validates and upserts progress for that member.
- RLS ensures each member can read/write only their own rows.
- The unique identity treats NULL season/episode values as equal, preventing duplicate movie-level progress rows.
- Progress is stored as position/duration seconds, not as a playback URL.

## Supported content and protocols

Media types: `movie`, `tv`, `anime`.
Catalogue identifiers: `tmdb`, `anilist`.
Player protocols modelled: HLS, MPEG-DASH and progressive file. Actual protocol support depends on the connected provider and browser/device capabilities.

## Outstanding integration work

1. Select an authorised provider and confirm rights/territories.
2. Implement its server adapter and signed-manifest exchange.
3. Implement actual HLS/DASH playback and DRM using the provider's documented player SDK.
4. Add audio/subtitle track switching and robust retry/fallback behavior.
5. Connect the player timeupdate/heartbeat to the progress API and add a polished Continue Watching rail/page.
6. Complete member/admin end-to-end tests on desktop and mobile before enabling any provider.
