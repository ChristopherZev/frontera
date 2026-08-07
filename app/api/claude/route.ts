import { getClient, MODEL, logCall } from "@/lib/claude";
import { resolveAccess } from "@/lib/access";
import { STATS_SENTINEL } from "./stats";
import { upstreamMessage } from "./errors";
import replay from "@/lib/fixtures/replay.json";

export const runtime = "nodejs";

const MAX_PROMPT_CHARS = 4000;

/**
 * Streaming chat endpoint.
 * POST { prompt: string } → streamed plain-text response.
 *
 * Three access tiers (resolved in lib/access.ts):
 *  - byok:     caller's own key, live model call
 *  - unlocked: signed cookie present, house key, live model call
 *  - replay:   anonymous, canned fixture, zero API spend
 * The X-Claude-Tier response header reports which one served the request, and
 * the stream's final line carries per-call stats (see ./stats).
 */
export async function POST(req: Request) {
  let prompt: unknown;
  try {
    ({ prompt } = await req.json());
  } catch {
    return new Response("Body must be JSON: { prompt: string }", { status: 400 });
  }
  if (!prompt || typeof prompt !== "string") {
    return new Response("Missing prompt", { status: 400 });
  }
  // The hosted endpoint is unauthenticated on the live tiers; max_tokens bounds
  // the output side, this bounds input-token spend per request.
  if (prompt.length > MAX_PROMPT_CHARS) {
    return new Response(`Prompt too long (max ${MAX_PROMPT_CHARS} chars)`, { status: 413 });
  }

  const access = resolveAccess(req);
  const encoder = new TextEncoder();

  if (access.tier === "replay") {
    return new Response(replayStream(prompt, encoder), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Claude-Tier": "replay",
      },
    });
  }

  const started = Date.now();
  const stream = getClient(access.apiKey).messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system: "You are the assistant behind Frontera, a program-delivery workspace. Be concise and friendly.",
    messages: [{ role: "user", content: prompt }],
  });

  const body = new ReadableStream({
    async start(controller) {
      try {
        // finalMessage() resolving is our "end"; rejecting is our "error".
        // Driving the controller from it (not the SDK's end/error events)
        // avoids a double-close when a failed stream fires both.
        stream.on("text", (text) => controller.enqueue(encoder.encode(text)));
        const final = await stream.finalMessage();
        const stats = {
          model: MODEL,
          tier: access.tier,
          inputTokens: final.usage.input_tokens,
          outputTokens: final.usage.output_tokens,
          latencyMs: Date.now() - started,
        };
        logCall({ ts: new Date().toISOString(), ...stats });
        // The same numbers the choke point logs, surfaced to the UI so the
        // observability story is visible in the browser, not just in the log.
        controller.enqueue(encoder.encode(`\n${STATS_SENTINEL}${JSON.stringify(stats)}`));
        controller.close();
      } catch (err) {
        // Headers are already flushed, so there's no status code left to send:
        // aborting the stream here renders as a blank or broken page. Always
        // finish with readable text instead — an upstream failure the visitor
        // can't act on is exactly when they most need to be told what happened.
        const status = (err as { status?: number })?.status;
        logCall({
          ts: new Date().toISOString(),
          model: MODEL,
          tier: access.tier,
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: Date.now() - started,
          error: `upstream_${status ?? "unknown"}`,
        });
        controller.enqueue(encoder.encode(`\n\n${upstreamMessage(status, access.tier)}`));
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Claude-Tier": access.tier,
    },
  });
}

/** Streams a canned fixture word-by-word so the demo feels like a live stream. */
function replayStream(prompt: string, encoder: TextEncoder): ReadableStream {
  const p = prompt.toLowerCase();
  const hit = replay.fixtures.find((f) => p.includes(f.match));
  const text = (hit ?? replay.default).response;
  const chunks = text.match(/\S+\s*/g) ?? [text];
  const started = Date.now();

  return new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
        await new Promise((r) => setTimeout(r, 18));
      }
      // Replay spends no tokens; report zeros rather than omitting the stats
      // line, so the readout is present on the tier most visitors land on.
      const stats = {
        model: "replay-fixture",
        tier: "replay",
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - started,
      };
      controller.enqueue(encoder.encode(`\n${STATS_SENTINEL}${JSON.stringify(stats)}`));
      controller.close();
    },
  });
}
