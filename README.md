# KRYORA

**Beyond Every Story.**  
*A Product of Kryptonia*

KRYORA is an independent entertainment discovery platform for movies, television series, anime, and animated content.

## Stack
- Next.js App Router, React 19, TypeScript
- Vercel-compatible application and route handlers
- FrameXTV catalogue adapter (provider contract and reuse permissions remain subject to verification)
- AniList GraphQL for anime metadata

## Development
```bash
npm install
npm run dev
npm run typecheck
npm run build
```

The existing Vite experience is being migrated to Next.js on a separate branch. The original `main` branch remains unchanged. Catalogue integration is provisional; FrameXTV API availability, reuse permission, and playback authorization must be verified before production streaming is enabled.
