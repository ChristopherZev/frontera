import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Access tiers for the public demo endpoint.
 *
 * - "byok"     — visitor supplied their own Anthropic key (billed to them).
 * - "unlocked" — a valid signed unlock cookie is present (uses the house key).
 * - "replay"   — anonymous; served canned fixtures, zero API spend.
 *
 * Resolution order: BYOK header > unlock cookie > replay.
 */
export type Tier = "byok" | "unlocked" | "replay";

export interface Access {
  tier: Tier;
  apiKey?: string;
}

export const UNLOCK_COOKIE = "demo_unlock";
const KEY_HEADER = "x-user-anthropic-key";

/** Anthropic keys start with `sk-ant-`; a shape check, not a validity check. */
function looksLikeKey(v: string): boolean {
  return /^sk-ant-[A-Za-z0-9_-]{20,}$/.test(v);
}

function secret(): string {
  return process.env.UNLOCK_COOKIE_SECRET ?? "";
}

/** Value stored in the unlock cookie: `<issuedAtMs>.<hmac>`. */
export function signUnlock(issuedAtMs: number): string {
  const mac = createHmac("sha256", secret()).update(String(issuedAtMs)).digest("hex");
  return `${issuedAtMs}.${mac}`;
}

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function verifyUnlock(cookieValue: string | undefined): boolean {
  if (!cookieValue || !secret()) return false;
  const dot = cookieValue.lastIndexOf(".");
  if (dot <= 0) return false;
  const issued = cookieValue.slice(0, dot);
  const mac = cookieValue.slice(dot + 1);
  const issuedMs = Number(issued);
  if (!Number.isFinite(issuedMs)) return false;
  if (Date.now() - issuedMs > MAX_AGE_MS) return false;
  const expected = createHmac("sha256", secret()).update(issued).digest("hex");
  const a = Buffer.from(mac, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export function resolveAccess(req: Request): Access {
  const userKey = req.headers.get(KEY_HEADER)?.trim();
  if (userKey && looksLikeKey(userKey)) {
    return { tier: "byok", apiKey: userKey };
  }
  if (verifyUnlock(readCookie(req.headers.get("cookie"), UNLOCK_COOKIE))) {
    return { tier: "unlocked" };
  }
  return { tier: "replay" };
}
