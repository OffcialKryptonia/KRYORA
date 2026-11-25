# KRYORA architecture

## Application platform
- Next.js App Router, React 19, and TypeScript.
- Vercel-compatible server route handlers and deployments.
- GitHub is the source of truth; migration is developed away from `main`.
- Existing discovery UI and provider adapter are retained during the framework migration.

## Provider boundaries
Catalogue metadata and video playback are separate concerns. The catalogue adapter supplies metadata and artwork; a playback adapter may provide a playable source only when content is authorized and provider terms permit embedding. A metadata record is never proof that content is playable.

## FrameXTV catalogue adapter
The existing integration targets `https://api.framextv.tech` endpoints `/api/home`, `/api/search`, `/api/details`, and `/api/season`. These are integration leads based on a third-party provider project, not a verified official API contract. Live availability, response stability, reuse permission, and regional compatibility remain unverified. The Next.js route handler allows only read-only endpoints and their required query parameters.

## Playback and security
The existing player constructs embed URLs on `https://framextv.xyz` using numeric TMDB IDs. This remains provisional until rights, provider terms, and content availability are confirmed. Do not proxy or extract media streams. Keep credentials server-side, validate route parameters, and enforce authorization on the server.

## Planned backend
Supabase Auth and PostgreSQL are candidates for authentication, profiles, watchlists, and viewing progress. No Supabase project or credentials are assumed to exist.
