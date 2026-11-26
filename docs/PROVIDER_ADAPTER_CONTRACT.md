# KRYORA provider adapter contract

## Purpose

This contract defines the trusted server-side boundary between KRYORA's playback resolver and a licensed playback provider. It is not itself a playback integration.

## Adapter interface

Implementations live under `src/lib/playback/server/` and implement `PlaybackProviderAdapter` from `adapter-contract.ts`. Register the adapter under an explicit, reviewed key in `registry.ts`.

The resolver supplies:
- KRYORA catalogue identity (TMDB/AniList ID and media type)
- season/episode coordinates where relevant
- selected territory
- provider-side content ID and opaque source reference
- provider protocol capabilities

The adapter is responsible for provider authentication, title/episode entitlement checks, territory validation, and requesting a short-lived playback session from the provider's official API.

## Security requirements

- Never interpret `sourceReference` as a URL or fetch an arbitrary URL supplied from the database.
- Use a fixed provider API origin and documented endpoints; validate all provider responses.
- Keep API keys, client secrets, signing keys and DRM credentials server-side only.
- Do not put secrets in `NEXT_PUBLIC_*` variables, client bundles, logs, audit details, or catalogue records.
- Return HTTPS manifest and license URLs only, with a short expiry (preferably no more than 10 minutes).
- Do not persist signed manifests or DRM tokens.
- Do not enable a provider until KRYORA has verified written distribution rights for the content and territory.
- Treat provider registration, source mapping, rights verification, adapter readiness, and enablement as separate controls.

## Current implementation status

The typed adapter contract and explicit server-side registry are in place. The registry is deliberately empty. `test_provider` / `test_adapter` is a registration smoke-test record only and has no playback adapter. The resolver must continue to return unavailable until a real, authorised provider is integrated and reviewed.

## Required integration inputs

Before implementing a production adapter, obtain the provider name, official developer/API documentation, credentials and authentication method, supported protocols, DRM requirements, content entitlement model, permitted territories, and evidence of KRYORA's distribution rights. Do not substitute public catalogue APIs or scraped embed sites for a licensed playback provider.
