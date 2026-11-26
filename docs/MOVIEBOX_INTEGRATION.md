# MovieBox integration plan

KRYORA consumes MovieBox through a separate HTTPS API service. The web application must never import MovieBox's Python code or expose provider credentials to browsers.

## Service boundary

- MovieBox API service: independently hosted Python/FastAPI service, separate from the Next.js/Vercel application.
- KRYORA: calls the service only from server-side route handlers and server-only adapters.
- Configuration: `MOVIEBOX_PARTNER_API_BASE_URL` and `MOVIEBOX_PARTNER_API_TOKEN`, stored as server-side Vercel environment variables. Never use a `NEXT_PUBLIC_` prefix and never commit credentials.
- The API base URL must be HTTPS. The KRYORA admin status endpoint reports only whether configuration is present; it does not expose values.

## Required API capabilities

The integration needs documented, stable responses for:

1. Home/catalogue discovery.
2. Search.
3. Title details.
4. Seasons and episodes.
5. Playback resolution for a selected title/episode.
6. Subtitle and audio-track metadata.
7. Territory availability, especially NG.

The public MovieBox-API repository documents routes such as `/home`, `/movies`, `/tv-series`, `/animation`, `/search`, `/detail/{slug}`, and `/api/stream/{id}`. KRYORA must validate the actual response schemas and deployed service behavior before binding these routes into production UI.

## Security and playback requirements

- Use a fixed, administrator-configured HTTPS base URL; never accept an upstream URL from a browser request or database source reference.
- Send credentials only from the server.
- Apply request timeouts, bounded response sizes, rate limits, and safe error handling.
- Validate returned manifest and license URLs as HTTPS; do not allow arbitrary redirects or internal-network destinations.
- Do not treat catalogue metadata or a returned stream URL as proof of distribution rights.
- A provider and its sources remain disabled until distribution rights, territory, and permitted use are verified.
- Do not reproduce private-client impersonation, reverse-engineered request signing, token bootstrapping, or anti-bot/Cloudflare circumvention code in KRYORA.
- If the service requires those mechanisms, obtain a partner-supported deployment/API path from MovieBox rather than implementing the circumvention in KRYORA.

## Current status

The MovieBox provider is registered in KRYORA but remains disabled and pending. The current adapter deliberately fails closed. No source records are enabled, no playback is claimed to work, and no production environment is changed by this document.

## Acceptance checklist

- [ ] A reachable HTTPS API service is supplied/deployed by the integration owner.
- [ ] Endpoint response examples and error codes are confirmed.
- [ ] Search/details/episodes are tested from the KRYORA preview server.
- [ ] Stream response schema is confirmed, including expiry and protocol.
- [ ] NG availability and rights are verified per title/source.
- [ ] Subtitles/audio tracks are tested where advertised.
- [ ] Provider remains disabled until the checks above pass.
