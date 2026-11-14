# KRYORA delivery roadmap

## Phase 1 — Foundation
- [x] Establish project repository and product README
- [x] Add React + TypeScript + Vite application shell
- [x] Establish responsive visual foundation
- [x] Define provider-neutral catalogue types
- [x] Document platform architecture and security boundaries
- [ ] Run dependency installation, type-check, and production build in CI
- [ ] Verify Cloudflare Workers deployment workflow

## Phase 2 — Catalogue and discovery
- [x] Implement a provisional FrameXTV catalogue adapter using the endpoint map documented by a third-party FrameXTV provider project
- [ ] Verify official FrameXTV catalogue endpoint support, CORS, response stability and reuse permissions
- [ ] Implement server-side provider adapter
- [ ] Add discovery, trending, popular, and genre shelves using real provider data
- [ ] Implement search, filters, pagination, and empty/error states
- [x] Add movie, series, season, and episode detail views
- [x] Resolve anime detail metadata using the AniList GraphQL lookup described by the FrameXTV integration project

## Phase 3 — Playback
- [x] Implement the documented FrameXTV iframe URL patterns for movie and series playback
- [ ] Verify playback provider terms, content permissions, and supported embed origins
- [ ] Add a server-controlled playback resolver only if FrameXTV later requires signed or protected URLs
- [ ] Add secure player embedding and origin-validated messaging
- [ ] Add episode navigation and viewing progress
- [ ] Test with authorised content before enabling watch actions

## Phase 4 — Accounts
- [ ] Implement secure authentication and sessions
- [ ] Add profile management
- [ ] Add watchlists and viewing history
- [ ] Persist playback progress

## Phase 5 — Administration
- [ ] Add server-protected /admin
- [ ] Add user and content administration
- [ ] Add curated homepage collections and genre management
- [ ] Add provider settings without exposing secrets
- [ ] Add branding, maintenance, and analytics settings

## Phase 6 — Production readiness
- [ ] Accessibility and responsive QA across supported screen sizes
- [ ] Security review and abuse protection
- [ ] Performance and caching review
- [ ] Automated tests and deployment checks
- [ ] Production deployment and custom domain after verification

## Release rule
A phase is not complete because its UI exists. Mark it complete only after the relevant behavior has been implemented and verified.
