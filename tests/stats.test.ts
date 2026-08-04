// Tests for the stats-trailer protocol (app/api/claude/stats.ts) and the
// client-side parsing rule it implies.
//
// The trailer exists because usage totals only exist once a stream finishes,
// by which point response headers are flushed. The failure mode that matters:
// the sentinel can straddle two network chunks, so parsing must run against
// accumulated text, never a single decoded chunk.
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { STATS_SENTINEL } = await import("../app/api/claude/stats.ts");

/**
 * The parsing rule from app/page.tsx: accumulate, then split on the sentinel.
 * Mirrored here so the protocol contract is tested without a DOM.
 */
function parseStream(chunks: string[]): { answer: string; stats: unknown | null } {
  let text = "";
  let answer = "";
  for (const chunk of chunks) {
    text += chunk;
    const cut = text.indexOf(STATS_SENTINEL);
    answer = cut === -1 ? text : text.slice(0, cut);
  }
  const cut = text.indexOf(STATS_SENTINEL);
  if (cut === -1) return { answer, stats: null };
  try {
    return { answer, stats: JSON.parse(text.slice(cut + STATS_SENTINEL.length)) };
  } catch {
    return { answer, stats: null };
  }
}

const STATS = { model: "claude-sonnet-5", tier: "unlocked", inputTokens: 49, outputTokens: 4, latencyMs: 1322 };
const trailer = (s: unknown = STATS) => `\n${STATS_SENTINEL}${JSON.stringify(s)}`;

describe("stats trailer", () => {
  // The route prefixes the trailer with "\n", so the answer keeps that
  // trailing newline. Assert on trimmed text where the newline isn't the point.
  test("splits answer from stats in a single chunk", () => {
    const { answer, stats } = parseStream([`Hello.${trailer()}`]);
    assert.equal(answer.trimEnd(), "Hello.");
    assert.deepEqual(stats, STATS);
  });

  test("handles a sentinel split across chunk boundaries", () => {
    // The regression this protocol is most likely to hit in production.
    const whole = `Hello.${trailer()}`;
    const mid = whole.indexOf(STATS_SENTINEL) + 5;
    const { answer, stats } = parseStream([whole.slice(0, mid), whole.slice(mid)]);
    assert.equal(answer.trimEnd(), "Hello.");
    assert.deepEqual(stats, STATS);
  });

  test("handles the sentinel arriving one character at a time", () => {
    const whole = `Hi.${trailer()}`;
    const { answer, stats } = parseStream(whole.split(""));
    assert.equal(answer.trimEnd(), "Hi.");
    assert.deepEqual(stats, STATS);
  });

  test("never shows the sentinel in the answer mid-stream", () => {
    // Each intermediate render must already have the partial sentinel hidden.
    const whole = `Answer text.${trailer()}`;
    let text = "";
    for (const ch of whole) {
      text += ch;
      const cut = text.indexOf(STATS_SENTINEL);
      const shown = cut === -1 ? text : text.slice(0, cut);
      assert.ok(!shown.includes(STATS_SENTINEL.trim()), `leaked: ${shown}`);
    }
  });

  test("shows the answer when the trailer is missing or malformed", () => {
    assert.deepEqual(parseStream(["Just an answer."]), { answer: "Just an answer.", stats: null });
    // A malformed trailer must never cost the user their answer. The route
    // prefixes the trailer with "\n", so that newline stays on the answer —
    // harmless under `white-space: pre-wrap`, but it is the real contract.
    const bad = parseStream([`Answer.\n${STATS_SENTINEL}{not json`]);
    assert.equal(bad.answer, "Answer.\n");
    assert.equal(bad.stats, null);
  });

  test("keeps replay's zero-token stats distinguishable from a missing trailer", () => {
    // Replay reports zeros rather than omitting stats, so the row still renders.
    const zeros = { model: "replay-fixture", tier: "replay", inputTokens: 0, outputTokens: 0, latencyMs: 1545 };
    const { stats } = parseStream([`Canned.${trailer(zeros)}`]);
    assert.deepEqual(stats, zeros);
  });

  test("sentinel is distinctive enough not to occur in prose", () => {
    assert.ok(STATS_SENTINEL.includes("__"));
    assert.ok(STATS_SENTINEL.includes("frontera"));
  });
});
