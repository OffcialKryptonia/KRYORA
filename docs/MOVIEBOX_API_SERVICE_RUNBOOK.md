# MovieBox API service integration runbook

## Decision

KRYORA will consume the MovieBox API as a separately hosted HTTP service. The upstream project is a Python/FastAPI application; it is not a Next.js library and should not be copied into the KRYORA web runtime.

Upstream repository: https://github.com/walterwhite-69/Moviebox-API
Default branch: main
Runtime described by upstream README: Python 3.9+, FastAPI, Uvicorn.
Documented startup command: `uvicorn api:app --host 0.0.0.0 --port 8000`.
The upstream repository is archived. Pin the deployed revision and do not assume upstream maintenance.

## Service deployment

Use a separate service host that supports Python/FastAPI (the upstream repository includes Railway deployment configuration). Do not deploy this Python service into the KRYORA Next.js Vercel project.

1. Create a separate service in the hosting account.
2. Connect the exact upstream repository and select its `main` branch.
3. Use the repository's supplied Railway configuration if deploying on Railway. Otherwise set the build/runtime to Python and the start command to `uvicorn api:app --host 0.0.0.0 --port $PORT`.
4. Do not add secrets or credentials unless the upstream project explicitly documents the variable and its purpose.
5. Deploy privately or restrict inbound access where the host supports it. Use HTTPS.
6. Verify the health/root route from the deployed service and test only the documented metadata endpoints before connecting KRYORA.

## Documented API surface

The upstream README documents:
- `GET /home`
- `GET /home/banner`
- `GET /home/sections`
- `GET /home/trending`
- `GET /movies`
- `GET /tv-series`
- `GET /animation`
- `GET /ranking`
- `GET /search?q={query}`
- `GET /search/suggest?q={query}`
- `GET /detail/{slug}`
- `GET /api/stream/{id}?detail_path={slug}`

The README describes the stream route as raw stream URL discovery and advertises automatic server discovery and Cloudflare bypass. KRYORA will not implement or reproduce anti-bot bypass, private-client impersonation, reverse-engineered signing, or access-control circumvention. The stream route is therefore not wired into KRYORA by this runbook. Playback remains disabled until an authorised playback method and content/territory rights are verified.

## KRYORA configuration

After a metadata service is deployed and its metadata routes have been tested, configure the base URL only as a server-side environment variable in the KRYORA Vercel project:

- `MOVIEBOX_API_BASE_URL` — HTTPS origin of the separately hosted API, without a trailing path/query.
- `MOVIEBOX_API_TOKEN` — only if the deployed service has a documented authentication mechanism. Do not invent a token scheme.

Never use a `NEXT_PUBLIC_*` variable for service credentials. Do not expose the upstream service URL or credentials in browser code.

## Integration gates

Before enabling catalogue calls:
- Confirm the deployed API responds consistently over HTTPS.
- Capture representative response examples for home, search, detail, movies, TV, and animation.
- Validate response schemas and normalize errors/timeouts/rate limits in a KRYORA server route.
- Confirm the upstream service is permitted to be used by KRYORA and that its requests do not evade access controls.

Before enabling playback:
- Obtain confirmation that KRYORA may distribute/play the relevant titles in Nigeria (NG) and any other intended territories.
- Use an authorised playback API/SDK and supported manifest delivery.
- Validate short-lived HTTPS manifests, subtitles, audio tracks, DRM and expiry.
- Keep provider disabled until all checks pass.

## Current status

This document is a deployment/integration runbook only. It does not deploy the upstream service, configure Vercel secrets, create playback sources, or enable MovieBox. The existing KRYORA MovieBox adapter intentionally returns unavailable until a verified integration is implemented.
