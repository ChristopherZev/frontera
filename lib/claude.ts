import Anthropic from "@anthropic-ai/sdk";
import { appendFileSync, mkdirSync } from "node:fs";

/**
 * Single choke point for every Claude API call in the app.
 * All logging and cost tracking lands here — which is why routes and
 * components must go through this module instead of the SDK directly.
 */
const houseClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Returns the client to use for a request. Pass a caller-supplied key
 * (bring-your-own-key) to bill that request to the visitor; omit it to
 * use the server's house key. The house client is a singleton; per-key
 * clients are created per request and never cached.
 */
export function getClient(apiKey?: string): Anthropic {
  return apiKey ? new Anthropic({ apiKey }) : houseClient;
}

export const MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-5";

export interface CallLog {
  ts: string;
  model: string;
  tier: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  /** Set only on a failed call, e.g. "upstream_401". Absent on success. */
  error?: string;
}

const TELEMETRY_FILE = "data/telemetry/calls.jsonl";

// Local persistence lands in JSONL, queryable via `npm run db` / lib/db.ts
// (the `calls` view). Deployed hosts have a read-only filesystem, so the
// append silently no-ops there and console.log is the fallback.
// Never log the caller's API key.
export function logCall(log: CallLog) {
  console.log("[claude-call]", JSON.stringify(log));
  try {
    mkdirSync("data/telemetry", { recursive: true });
    appendFileSync(TELEMETRY_FILE, JSON.stringify(log) + "\n");
  } catch {
    // read-only filesystem — keep serving; the console line above still logs
  }
}
