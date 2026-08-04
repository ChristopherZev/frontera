import { UNLOCK_COOKIE, signUnlock, verifyInvite } from "@/lib/access";

export const runtime = "nodejs";

/**
 * GET /invite?t=<token> → redeem a signed invite link for an unlock cookie.
 *
 * The link itself is the credential: a recruiter clicks it from a CV or an
 * email and lands on a live-tier session with nothing to type. Redemption
 * always redirects to `/` — on success with the cookie set, on failure with
 * `?invite=<reason>` so the UI can explain what happened instead of silently
 * dropping them into demo mode.
 *
 * The token is never exchanged for a longer-lived credential than the normal
 * password unlock grants: same 7-day cookie, same signing secret.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const check = verifyInvite(url.searchParams.get("t"));
  const dest = new URL("/", url.origin);

  if (!check.ok) {
    dest.searchParams.set("invite", check.reason ?? "invalid");
    return Response.redirect(dest, 303);
  }

  // Log redemptions so a leaked link is traceable to the label it was issued
  // under. Never log the token itself — it stays a live credential until it
  // expires.
  console.log("[invite-redeemed]", JSON.stringify({ label: check.label, ts: new Date().toISOString() }));

  const maxAge = 7 * 24 * 60 * 60;
  const cookie = [
    `${UNLOCK_COOKIE}=${signUnlock(Date.now())}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ].join("; ");

  dest.searchParams.set("invite", "ok");
  return new Response(null, {
    status: 303,
    headers: { Location: dest.toString(), "Set-Cookie": cookie },
  });
}
