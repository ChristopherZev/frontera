// Tests for lib/access.ts — the tier gate and the two signed-token schemes.
//
// Run by `npm test` (node --test, native TypeScript type-stripping on Node 22+;
// no test framework or build step). The secret must be set before the module is
// imported, since access.ts reads it per call via process.env.
//
// These are the app's security boundary: a bug here hands the house key to
// anyone. The forgery cases matter more than the happy paths.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

process.env.UNLOCK_COOKIE_SECRET = "test-secret-not-a-real-one";

const {
  UNLOCK_COOKIE,
  readCookie,
  resolveAccess,
  signInvite,
  signUnlock,
  verifyInvite,
  verifyUnlock,
// Relative, not the "@/" alias: that alias is a bundler/tsconfig feature and
// Node's own resolver doesn't know it.
} = await import("../lib/access.ts");

const SECRET = process.env.UNLOCK_COOKIE_SECRET!;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** A request carrying the given headers, as the route handlers see it. */
function req(headers: Record<string, string> = {}): Request {
  return new Request("https://example.test/api/claude", { method: "POST", headers });
}

describe("readCookie", () => {
  test("finds a cookie among several", () => {
    assert.equal(readCookie("a=1; demo_unlock=xyz; b=2", UNLOCK_COOKIE), "xyz");
  });

  test("returns undefined for a missing cookie or absent header", () => {
    assert.equal(readCookie("a=1", UNLOCK_COOKIE), undefined);
    assert.equal(readCookie(null, UNLOCK_COOKIE), undefined);
  });

  test("does not match a cookie whose name merely ends with the target", () => {
    assert.equal(readCookie("not_demo_unlock=xyz", UNLOCK_COOKIE), undefined);
  });

  test("keeps '=' inside a value intact", () => {
    assert.equal(readCookie("demo_unlock=a=b=c", UNLOCK_COOKIE), "a=b=c");
  });
});

describe("unlock cookie (session token)", () => {
  test("a freshly signed cookie verifies", () => {
    assert.equal(verifyUnlock(signUnlock(Date.now())), true);
  });

  test("rejects a cookie older than the 7-day window", () => {
    assert.equal(verifyUnlock(signUnlock(Date.now() - 8 * DAY)), false);
    // Just inside the window still passes.
    assert.equal(verifyUnlock(signUnlock(Date.now() - 6 * DAY)), true);
  });

  test("rejects a tampered timestamp that reuses a valid signature", () => {
    const value = signUnlock(Date.now());
    const mac = value.slice(value.indexOf(".") + 1);
    assert.equal(verifyUnlock(`${Date.now() + DAY}.${mac}`), false);
  });

  test("rejects malformed, empty, and unsigned values", () => {
    assert.equal(verifyUnlock(undefined), false);
    assert.equal(verifyUnlock(""), false);
    assert.equal(verifyUnlock("no-dot"), false);
    assert.equal(verifyUnlock(".abc"), false);
    assert.equal(verifyUnlock("notanumber.abc"), false);
  });

  test("rejects a signature made with a different secret", () => {
    const issued = String(Date.now());
    const mac = createHmac("sha256", "wrong-secret").update(issued).digest("hex");
    assert.equal(verifyUnlock(`${issued}.${mac}`), false);
  });
});

describe("invite token", () => {
  test("a valid invite verifies and returns its label", () => {
    const check = verifyInvite(signInvite(Date.now() + DAY, "acme-recruiter"));
    assert.equal(check.ok, true);
    assert.equal(check.label, "acme-recruiter");
  });

  test("rejects an expired invite, reporting the label for traceability", () => {
    const check = verifyInvite(signInvite(Date.now() - 1000, "stale"));
    assert.equal(check.ok, false);
    assert.equal(check.reason, "expired");
    assert.equal(check.label, "stale");
  });

  test("rejects an extended expiry that reuses a valid signature", () => {
    // The attack the signature exists to stop: keep the MAC, push the clock out.
    const token = signInvite(Date.now() - 1000, "stale");
    const [, label, mac] = token.split(".");
    const forged = `${Date.now() + DAY}.${label}.${mac}`;
    assert.equal(verifyInvite(forged).reason, "bad-signature");
  });

  test("rejects a swapped label that reuses a valid signature", () => {
    const token = signInvite(Date.now() + DAY, "guest");
    const [exp, , mac] = token.split(".");
    assert.equal(verifyInvite(`${exp}.attacker.${mac}`).reason, "bad-signature");
  });

  test("rejects a forged signature", () => {
    assert.equal(verifyInvite(`${Date.now() + DAY}.evil.deadbeef`).reason, "bad-signature");
  });

  test("rejects malformed tokens and null", () => {
    assert.equal(verifyInvite(null).reason, "malformed");
    assert.equal(verifyInvite("").reason, "malformed");
    assert.equal(verifyInvite("only.two").reason, "malformed");
    assert.equal(verifyInvite("a.b.c.d").reason, "malformed");
    assert.equal(verifyInvite("notanumber.label.abc").reason, "malformed");
  });

  test("verifies the signature before trusting the expiry", () => {
    // A forged token that is ALSO expired must read as bad-signature, not
    // expired — otherwise the reason leaks that the payload was well-formed.
    assert.equal(verifyInvite(`${Date.now() - DAY}.evil.deadbeef`).reason, "bad-signature");
  });

  test("sanitizes label characters that would break the payload framing", () => {
    // Dots delimit the fields, so a dotted label must not smuggle in a field.
    const check = verifyInvite(signInvite(Date.now() + DAY, "a.b/c d"));
    assert.equal(check.ok, true);
    assert.equal(check.label, "a-b-c-d");
  });

  test("caps label length and falls back for an empty label", () => {
    const long = verifyInvite(signInvite(Date.now() + DAY, "x".repeat(200)));
    assert.equal(long.label!.length, 40);
    assert.equal(verifyInvite(signInvite(Date.now() + DAY, "")).label, "anon");
  });
});

describe("domain separation between the two token types", () => {
  // Both schemes sign with the same secret. The invite: prefix is what stops
  // one from being replayed as the other.
  test("a session cookie is not a valid invite", () => {
    assert.equal(verifyInvite(signUnlock(Date.now())).ok, false);
  });

  test("an invite token is not a valid session cookie", () => {
    assert.equal(verifyUnlock(signInvite(Date.now() + DAY, "guest")), false);
  });

  test("an invite payload signed WITHOUT the prefix is rejected", () => {
    const payload = `${Date.now() + DAY}.guest`;
    const mac = createHmac("sha256", SECRET).update(payload).digest("hex");
    assert.equal(verifyInvite(`${payload}.${mac}`).reason, "bad-signature");
  });
});

describe("resolveAccess", () => {
  test("defaults to replay for an anonymous request", () => {
    assert.deepEqual(resolveAccess(req()), { tier: "replay" });
  });

  test("uses a well-formed caller key as byok", () => {
    const key = `sk-ant-${"a".repeat(24)}`;
    assert.deepEqual(resolveAccess(req({ "x-user-anthropic-key": key })), {
      tier: "byok",
      apiKey: key,
    });
  });

  test("ignores a malformed caller key rather than trying it", () => {
    assert.equal(resolveAccess(req({ "x-user-anthropic-key": "hunter2" })).tier, "replay");
    assert.equal(resolveAccess(req({ "x-user-anthropic-key": "sk-ant-short" })).tier, "replay");
  });

  test("resolves a valid unlock cookie to the unlocked tier", () => {
    const cookie = `${UNLOCK_COOKIE}=${signUnlock(Date.now())}`;
    assert.deepEqual(resolveAccess(req({ cookie })), { tier: "unlocked" });
  });

  test("falls back to replay on a forged unlock cookie", () => {
    const cookie = `${UNLOCK_COOKIE}=${Date.now()}.deadbeef`;
    assert.equal(resolveAccess(req({ cookie })).tier, "replay");
  });

  test("prefers the caller's key over an unlock cookie", () => {
    // BYOK first means a visitor with both spends their own money, not ours.
    const key = `sk-ant-${"b".repeat(24)}`;
    const cookie = `${UNLOCK_COOKIE}=${signUnlock(Date.now())}`;
    assert.equal(resolveAccess(req({ cookie, "x-user-anthropic-key": key })).tier, "byok");
  });

  test("never returns an apiKey on the non-byok tiers", () => {
    assert.equal(resolveAccess(req()).apiKey, undefined);
    const cookie = `${UNLOCK_COOKIE}=${signUnlock(Date.now())}`;
    assert.equal(resolveAccess(req({ cookie })).apiKey, undefined);
  });
});
