// Tests for upstreamMessage() — what a visitor sees when the model call fails
// after headers are flushed.
//
// Regression origin: the graceful path was gated to `tier === "byok"`, so when
// the house key went invalid the unlocked tier fell through to
// controller.error() and rendered as a blank 500 page. A recruiter following an
// invite link saw a broken app with no explanation. Streaming makes this class
// of bug easy to write: once headers are out there is no status code left to
// send, so "handle the error" has to mean "say something readable".
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { upstreamMessage } = await import("../app/api/claude/errors.ts");

const TIERS = ["byok", "unlocked", "replay"] as const;
const STATUSES = [400, 401, 403, 429, 500, 503, undefined] as const;

describe("upstreamMessage", () => {
  test("always returns a non-empty human sentence, for every tier and status", () => {
    // The bug in one assertion: no tier/status combination may go unexplained.
    for (const tier of TIERS) {
      for (const status of STATUSES) {
        const msg = upstreamMessage(status, tier);
        assert.ok(msg.length > 20, `too short for ${tier}/${status}: ${msg}`);
        assert.match(msg, /[.!]$/, `not a sentence for ${tier}/${status}: ${msg}`);
      }
    }
  });

  test("tells a BYOK visitor to check their own key on an auth failure", () => {
    for (const status of [401, 403]) {
      assert.match(upstreamMessage(status, "byok"), /your anthropic api key/i);
    }
  });

  test("never blames the visitor's key on the house tiers", () => {
    // They don't own that key and can't fix it — saying "check your key" would
    // send them chasing a problem that isn't theirs.
    for (const status of [401, 403]) {
      const msg = upstreamMessage(status, "unlocked");
      assert.doesNotMatch(msg, /your anthropic api key/i);
      assert.match(msg, /host's api key/i);
    }
  });

  test("offers the visitor a working path forward on a house-key failure", () => {
    const msg = upstreamMessage(401, "unlocked");
    assert.match(msg, /demo mode|your own key/i);
  });

  test("distinguishes rate limits from auth failures", () => {
    assert.match(upstreamMessage(429, "byok"), /rate limit/i);
    assert.match(upstreamMessage(429, "unlocked"), /rate-limited/i);
    assert.doesNotMatch(upstreamMessage(429, "unlocked"), /rejected/i);
  });

  test("suggests retrying on an upstream 5xx", () => {
    for (const status of [500, 502, 503]) {
      assert.match(upstreamMessage(status, "unlocked"), /try again/i);
    }
  });

  test("blames the prompt, not the key, on a 400", () => {
    const msg = upstreamMessage(400, "unlocked");
    assert.match(msg, /prompt/i);
    assert.doesNotMatch(msg, /key/i);
  });

  test("falls back to a generic message when the error carries no status", () => {
    const msg = upstreamMessage(undefined, "unlocked");
    assert.match(msg, /something went wrong/i);
  });

  test("never leaks internals into visitor-facing copy", () => {
    for (const tier of TIERS) {
      for (const status of STATUSES) {
        const msg = upstreamMessage(status, tier);
        assert.doesNotMatch(msg, /sk-ant-|undefined|null|\[object|Error:|stack/i);
      }
    }
  });
});
