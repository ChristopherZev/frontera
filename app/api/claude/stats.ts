/**
 * Sentinel marking the trailing JSON line of call stats (tokens, latency) on
 * the chat stream. Usage totals only exist once the stream finishes, and
 * response headers are already flushed by then — HTTP trailers aren't reliably
 * readable from `fetch`, so the stats ride out as the stream's last line and
 * the client splits them off. Chosen to never occur in model prose.
 *
 * Lives in its own module so the client component can import it without
 * pulling the route's server-only code (SDK, node:fs) into the browser bundle.
 */
export const STATS_SENTINEL = " __frontera_stats__";

export interface CallStats {
  model: string;
  tier: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}
