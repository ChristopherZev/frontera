import { timingSafeEqual } from "node:crypto";
import { UNLOCK_COOKIE, readCookie, signUnlock, verifyUnlock } from "@/lib/access";

export const runtime = "nodejs";

/**
 * GET → { unlocked } — whether this request carries a valid unlock cookie.
 * The cookie is httpOnly, so this is the client's only way to know its
 * real unlock state (server is the source of truth, not sessionStorage).
 */
export async function GET(req: Request) {
  const unlocked = verifyUnlock(readCookie(req.headers.get("cookie"), UNLOCK_COOKIE));
  return Response.json({ unlocked });
}

/** DELETE → clears the unlock cookie, dropping this browser back to demo mode. */
export async function DELETE() {
  const cookie = [
    `${UNLOCK_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0",
  ].join("; ");
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": cookie },
  });
}

/**
 * POST { password } → sets a signed httpOnly unlock cookie on match.
 * Enables the live tier on the server's house key for trusted visitors.
 */
export async function POST(req: Request) {
  const expected = process.env.DEMO_UNLOCK_PASSWORD;
  const secret = process.env.UNLOCK_COOKIE_SECRET;
  if (!expected || !secret) {
    return new Response("Unlock is not configured", { status: 501 });
  }

  let password: unknown;
  try {
    ({ password } = await req.json());
  } catch {
    return new Response("Body must be JSON: { password: string }", { status: 400 });
  }
  if (typeof password !== "string") {
    return new Response("Missing password", { status: 400 });
  }

  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  if (!ok) {
    return new Response("Incorrect password", { status: 401 });
  }

  const value = signUnlock(Date.now());
  const maxAge = 7 * 24 * 60 * 60;
  const cookie = [
    `${UNLOCK_COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ].join("; ");

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": cookie },
  });
}
