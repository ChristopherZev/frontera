import { getClient, MODEL, logCall } from "@/lib/claude";
import { resolveAccess } from "@/lib/access";
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
 * The X-Claude-Tier response header reports which one served the request.
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
        logCall({
          ts: new Date().toISOString(),
          model: MODEL,
          tier: access.tier,
          inputTokens: final.usage.input_tokens,
          outputTokens: final.usage.output_tokens,
          latencyMs: Date.now() - started,
        });
        controller.close();
      } catch (err) {
        // Headers already flushed, so we can't send a 401 mid-stream. For a
        // bad caller key (BYOK), surface it as readable text rather than an
        // opaque stream abort; otherwise abort the stream.
        const status = (err as { status?: number })?.status;
        if (access.tier === "byok" && (status === 401 || status === 403)) {
          controller.enqueue(
            encoder.encode(
              "Your Anthropic API key was rejected. Check the key in the Access & keys panel and try again.",
            ),
          );
          controller.close();
        } else {
          controller.error(err);
        }
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

  return new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
        await new Promise((r) => setTimeout(r, 18));
      }
      controller.close();
    },
  });
}
