# MovieBox integration plan

KRYORA consumes MovieBox through a separate HTTPS API service. The web application must never import MovieBox's Python code or expose provider credentials to browsers.

## Source repository findings

Source: https://github.com/walterwhite-69/Moviebox-API

The repository README documents a Python/FastAPI service and these routes:

| Capability | Route |
|---|---|
| Discovery | `/home` |
| Movie catalogue | `/movies?page=1` |
| TV catalogue | `/tv-series?page=1` |
| Search | `/search?q={query}&page=1` |
| Details | `/detail/{subject_id}` |
| Season/episode breakdown | `/episodes/{subject_id}` |
| Stream resolution | `/api/stream/{subject_id}?se={season}&ep={episode}` |
| Subtitles | `/api/stream/{subject_id}/captions?se={season}&ep={episode}` |

For movies, the README says the stream endpoint takes the `subject_id`. For TV episodes, it requires `se` and `ep`. These routes and their actual JSON schemas must be tested against a running service before KRYORA consumes them.

**Critical upstream limitation:** the repository README itself states that it “doesnt work properly” because MovieBox is blocking the bypass. It describes TLS fingerprint impersonation via `curl_cffi`, signed-token decoding and authenticated CDN subtitle URLs. Therefore, deployment of this repository alone does not establish that upstream MovieBox requests or playback currently work. KRYORA will not recreate anti-bot bypass, private-client impersonation, reverse-engineered signing or token bootstrapping. If these are required for service operation, the MovieBox contact must provide a supported working integration route or explicitly maintained partner build.

## Service boundary

- MovieBox API service: independently hosted Python/FastAPI service, separate from the Next.js/Vercel application.
- KRYORA: calls the service only from server-side route handlers and server-only adapters.
- Configuration: `MOVIEBOX_PARTNER_API_BASE_URL` and `MOVIEBOX_PARTNER_API_TOKEN`, stored as server-side Vercel environment variables. Never use a `NEXT_PUBLIC_` prefix and never commit credentials.
- The API base URL must be HTTPS. The KRYORA admin status endpoint reports only whether configuration is present; it does not expose values.

## Security and playback requirements

- Use a fixed, administrator-configured HTTPS base URL; never accept an upstream URL from a browser request or database source reference.
- Send credentials only from the server.
- Apply request timeouts, bounded response sizes, rate limits, and safe error handling.
- Validate returned manifest and license URLs as HTTPS; do not allow arbitrary redirects or internal-network destinations.
- Do not treat catalogue metadata or a returned stream URL as proof of distribution rights.
- A provider and its sources remain disabled until distribution rights, territory, and permitted use are verified.
- If an authorised endpoint requires authentication, use the credential mechanism explicitly issued for KRYORA; do not infer or recreate private client credentials.

## Current status

The MovieBox provider is registered in KRYORA but remains disabled and pending. The current adapter deliberately fails closed. No source records are enabled, no playback is claimed to work, and no production environment is changed by this integration branch.

## Acceptance checklist

- [ ] A reachable HTTPS API service is supplied/deployed by the integration owner.
- [ ] The upstream README's stated blocking issue is resolved through a supported service/API path.
- [ ] Search/details/episodes are tested from the KRYORA preview server.
- [ ] Stream response schema is confirmed, including expiry and protocol.
- [ ] NG availability and rights are verified per title/source.
- [ ] Subtitles/audio tracks are tested where advertised.
- [ ] Provider remains disabled until the checks above pass.
