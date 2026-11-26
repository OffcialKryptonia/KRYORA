# MovieBox API service handoff

This directory documents the separate-service boundary for MovieBox. It intentionally does not vendor or reproduce the archived third-party repository's implementation.

## Deployment model

Deploy the MovieBox API service as its own Python/FastAPI service on a Python-capable host. Do not deploy it as part of the Next.js/Vercel application. Keep its hostname stable and HTTPS-only.

The service owner should provide:
- Public HTTPS base URL.
- Authentication method and credential provisioning.
- OpenAPI/Swagger specification or representative JSON responses for every required route.
- Confirmation of permitted use and territories.
- Expected rate limits and service availability.

## KRYORA environment variables

Configure these in the KRYORA Vercel project for Preview first:

- `MOVIEBOX_PARTNER_API_BASE_URL`: HTTPS base URL of the deployed API service.
- `MOVIEBOX_PARTNER_API_TOKEN`: service credential, if required by the service.

These are server-only values. Never add them to client-side environment variables or Git.

## Routes to verify

The upstream repository documents `/home`, `/movies`, `/tv-series`, `/animation`, `/search`, `/detail/{slug}`, and `/api/stream/{id}`. Verify actual deployed response schemas before implementing the KRYORA client. In particular, playback resolution must provide a supported manifest protocol, a short-lived HTTPS manifest URL, and any subtitle/audio metadata required by the player.

## Important

This is an integration handoff, not a deployed service. No API host, credentials, or working playback source are assumed. KRYORA's MovieBox provider remains disabled until the service and rights checks are completed.
