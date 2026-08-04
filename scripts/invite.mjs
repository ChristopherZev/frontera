#!/usr/bin/env node
// Mint a signed invite link that unlocks the live tier with one click.
//
// Usage:
//   npm run invite -- --label acme-recruiter
//   npm run invite -- --label jane --days 14 --base https://frontera-beta.vercel.app
//
// Reads UNLOCK_COOKIE_SECRET from .env.local (or the ambient env). The secret
// must match the deployment you're minting for — a link signed with the local
// secret will not verify in production unless the two are the same.

import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

// .env.local isn't auto-loaded outside Next, so parse it directly.
function secretFromEnvFile() {
  try {
    const txt = readFileSync(resolve(ROOT, ".env.local"), "utf8");
    const m = txt.match(/^UNLOCK_COOKIE_SECRET=(.*)$/m);
    return m ? m[1].trim() : "";
  } catch {
    return "";
  }
}

const secret = process.env.UNLOCK_COOKIE_SECRET || secretFromEnvFile();
if (!secret || secret.startsWith("change-me")) {
  console.error(
    "invite: UNLOCK_COOKIE_SECRET is unset or still the placeholder.\n" +
      "Set a real one in .env.local (and match it in the deployment you're minting for):\n" +
      '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
  );
  process.exit(1);
}

const label = arg("label", "anon");
const days = Number(arg("days", "14"));
if (!Number.isFinite(days) || days <= 0) {
  console.error("invite: --days must be a positive number");
  process.exit(1);
}
const base = arg("base", "https://frontera-beta.vercel.app").replace(/\/$/, "");

// Mirrors signInvite() in lib/access.ts — payload `<expiresAtMs>.<label>`,
// HMAC'd with the invite: domain-separation prefix.
const safeLabel = label.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 40) || "anon";
const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;
const payload = `${expiresAt}.${safeLabel}`;
const mac = createHmac("sha256", secret).update("invite:v1:" + payload).digest("hex");

console.log(`${base}/invite?t=${payload}.${mac}`);
console.error(
  `\n  label:   ${safeLabel}\n  expires: ${new Date(expiresAt).toISOString()} (${days}d)\n  target:  ${base}\n\n` +
    "Anyone holding this link gets live answers on the house key until it expires.\n" +
    "Rotate UNLOCK_COOKIE_SECRET to invalidate every outstanding link at once.\n",
);
