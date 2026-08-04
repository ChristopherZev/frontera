# CLAUDE.md — Frontera

Frontera is a Next.js (App Router, TypeScript) app that streams responses from Claude through a single logged choke point.

## Conventions

- **Design system:** `design/DESIGN_SYSTEM.md` is the single source of truth for UI. All visual values come from CSS custom properties in `app/globals.css` that mirror its tokens — never hardcode colors, radii, shadows, blurs, or spacing in components. If a needed token doesn't exist, add it to DESIGN_SYSTEM.md first.
- **One Claude choke point:** every Claude API call goes through `lib/claude.ts` (`getClient`, `logCall`) so logging and cost tracking have one place to live. Never import the SDK directly from routes or components.
- **Prompts** live in `lib/prompts/` as versioned TS files — never inline prompt strings in components.
- **Big data files never enter a model context.** Query files beyond ~50 rows through DuckDB — `lib/db.ts` in code, `npm run db -- "<SQL>"` ad hoc — and put only the aggregate or slice into a prompt.
- **Secrets only in `.env.local`** (gitignored). Never commit keys. `.env.example` documents required vars.
- **Access tiers:** `lib/access.ts` resolves each request to `byok` (caller's key), `unlocked` (signed cookie, house key), or `replay` (anonymous, canned fixtures). Never log a caller's key.
- **Signed tokens:** every HMAC payload carries a domain-separation prefix (`invite:v1:` for invite links) so a token minted for one purpose can never be replayed as another. Verify the signature *before* trusting any field in the payload, including expiry. Log a redemption's label, never the token.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`) describing the change. Keep the `Co-Authored-By` trailer.
- Small commits; one concern each.

## Deploy

`main` must always build cleanly — enforced by `.github/workflows/ci.yml` (install + `npm test` + `next build`). Deployed on Vercel; env vars `ANTHROPIC_API_KEY`, `DEMO_UNLOCK_PASSWORD`, `UNLOCK_COOKIE_SECRET`.
