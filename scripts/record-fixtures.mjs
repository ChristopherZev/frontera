#!/usr/bin/env node
// Records canned replay fixtures by calling the real API over a fixed prompt
// list, then writing lib/fixtures/replay.json. Run locally with a live key:
//
//   npm run fixtures:record
//
// Replay mode (anonymous demo) serves these responses with zero API spend.

import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync } from "node:fs";

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) {
  console.error("ANTHROPIC_API_KEY required to record fixtures");
  process.exit(1);
}

const MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-5";
const SUFFIX =
  "\n\n(This is a canned demo response. Add your own Anthropic key or unlock the live demo to get real answers.)";

// id → { match substring, prompt }
const PROMPTS = [
  { id: "system-prompt", match: "system prompt", prompt: "Explain what a system prompt is, in two sentences." },
  { id: "streaming", match: "streaming", prompt: "In two sentences, what does streaming a model response do and not do?" },
];

const DEFAULT_RESPONSE =
  "You're seeing Frontera's demo mode — this is a canned response, so no live model was called. " +
  "To get real answers, either paste your own Anthropic API key (it stays in your browser) or unlock the hosted demo with a password.\n\n" +
  "Frontera streams responses from Claude through a single logged choke point, so every call's tokens, latency, and cost are observable.";

const client = new Anthropic({ apiKey: KEY });

async function ask(prompt) {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: "You are the assistant behind Frontera, a program-delivery workspace. Be concise and friendly.",
    messages: [{ role: "user", content: prompt }],
  });
  return msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
}

const fixtures = [];
for (const p of PROMPTS) {
  process.stderr.write(`recording ${p.id}… `);
  const response = (await ask(p.prompt)).trim() + SUFFIX;
  fixtures.push({ id: p.id, match: p.match, response });
  process.stderr.write("done\n");
}

const out = {
  _comment:
    "Canned responses served in anonymous replay mode (zero API spend). Regenerate with `npm run fixtures:record` using a live key. `match` is a lowercased substring tested against the prompt; first match wins, else `default`.",
  fixtures,
  default: { response: DEFAULT_RESPONSE },
};

writeFileSync("lib/fixtures/replay.json", JSON.stringify(out, null, 2) + "\n");
console.error(`wrote lib/fixtures/replay.json (${fixtures.length} fixtures)`);
