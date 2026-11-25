# KRYORA

**Beyond Every Story.**  
*A Product of Kryptonia*

KRYORA is an independent entertainment discovery platform for movies, television series, anime, and animated content.

## Stack
- Next.js App Router, React 19, TypeScript
- Vercel-compatible application and route handlers
- TMDB for movie and TV metadata
- AniList GraphQL for anime metadata
- FrameXTV retained only as a separate, optional integration; its API availability and reuse rights are not assumed

## Development
```bash
npm install
npm run dev
npm run typecheck
npm run build
```

## Catalogue configuration
Set `TMDB_API_READ_ACCESS_TOKEN` in the Vercel project environment variables (Preview and Production as appropriate). A TMDB v3 key can instead be supplied as `TMDB_API_KEY`. These values are server-only; do not use a `NEXT_PUBLIC_` prefix or commit real credentials.

AniList metadata requests do not require a user API key. If TMDB is not configured, the home API can still return AniList anime discovery and will report the missing TMDB configuration.

Metadata is not a video licence. Playback remains separate and must use an authorized provider and content rights. TMDB attribution and applicable API terms must be followed before public production launch.
