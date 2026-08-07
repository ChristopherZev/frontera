/**
 * Visitor-facing copy for a model call that fails *after* the response headers
 * are already flushed.
 *
 * Once streaming starts there is no status code left to send, so aborting the
 * stream renders as a blank or broken page. Every failure therefore ends with
 * readable text instead.
 *
 * The split is by who can act on the problem: on BYOK the visitor owns the key
 * and can fix it; on the house tiers they can't, so point them at something
 * that works rather than at a key they don't control.
 *
 * Its own module so tests can import it without pulling the route's server-only
 * dependencies (the SDK, node:fs) into scope.
 */
export function upstreamMessage(status: number | undefined, tier: string): string {
  const byok = tier === "byok";
  if (status === 401 || status === 403) {
    return byok
      ? "Your Anthropic API key was rejected. Check the key in the Access & keys panel and try again."
      : "The host's API key isn't working right now, so live answers are unavailable. Demo mode still works — clear your key and lock the session to use it, or add your own key for live answers.";
  }
  if (status === 429) {
    return byok
      ? "Your Anthropic account hit a rate limit. Wait a moment and try again."
      : "The hosted demo is rate-limited right now. Try again shortly, or add your own key for live answers.";
  }
  if (status === 400) {
    return "That request was rejected by the model API — try a shorter or differently worded prompt.";
  }
  if (status && status >= 500) {
    return "The model API is having trouble right now. Try again in a moment.";
  }
  return "Something went wrong reaching the model. Try again in a moment — demo mode works without a live call.";
}
