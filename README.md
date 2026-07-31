# Frontera

A streaming Claude workspace built with Next.js. Every model call runs through a
single logged choke point, so tokens, latency, and cost stay observable — the
foundation for adding evals, cost tracking, and guardrails as the app grows.

**Live demo:** [frontera-beta.vercel.app](https://frontera-beta.vercel.app)

## Try it

The demo endpoint has three access tiers, resolved per request:

- **Demo mode (default):** anonymous visitors get clearly-labeled canned
  responses. Zero API spend, so the live link is safe to share publicly.
- **Bring your own key:** paste an Anthropic API key in the **Access & keys**
  panel to get live answers billed to you. The key is kept in your browser tab
  (`sessionStorage`), sent only with your own requests, and never stored or
  logged server-side.
- **Password unlock:** a shared password enables live answers on the host's key
  (for a guided walkthrough). It sets a signed, httpOnly cookie.

## Stack

- Next.js 15 (App Router) + TypeScript + React 19
- Anthropic SDK (`@anthropic-ai/sdk`), streaming responses
- DuckDB (`@duckdb/node-api`) for local analytics over the call log
- Deployed on Vercel

## Local setup

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

Record fresh demo-mode fixtures (needs a live key):

```bash
npm run fixtures:record
```

Query the local call log:

```bash
npm run db -- "SELECT tier, count(*), sum(outputTokens) FROM calls GROUP BY tier"
```

## Environment

| Var | Required | Purpose |
|-----|----------|---------|
| `ANTHROPIC_API_KEY` | yes | House key for local dev and the unlocked tier |
| `DEMO_UNLOCK_PASSWORD` | for unlock | Password visitors type to enable live answers |
| `UNLOCK_COOKIE_SECRET` | for unlock | HMAC secret signing the unlock cookie |
| `CLAUDE_MODEL` | no | Override the model (default `claude-sonnet-5`) |
| `DUCKDB_PATH` | no | Local DuckDB file path (default `data/frontera.duckdb`) |

## Roadmap

Structured status drafting, an agentic risk register, retrieval-grounded
project memory, an eval dashboard, and reliability tooling — each landing as a
new route on the same logged choke point.

## License

MIT
