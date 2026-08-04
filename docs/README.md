# docs

Assets referenced by the top-level README.

## `demo.gif` — not yet recorded

A ~15 second silent loop that shows the access tiers and the stats readout,
because those are the two things a reader can't infer from a static screenshot.

**What to capture** (against https://frontera-beta.vercel.app or `npm run dev`):

1. Land on the page — the **Demo mode** badge is visible before anything is typed.
2. Ask something the fixtures cover, e.g. *"what is a system prompt"*, and let it
   stream. Pause on the stats row (tier · latency · tokens · model).
3. Open **Access & keys**, enter the demo password, hit **Unlock** — the badge
   flips to **Unlocked** with a green dot.
4. Ask the same question again. The stats row now shows real token counts and
   `claude-sonnet-5` instead of `replay-fixture`.

**Capture settings**

- Window ~1280×800, browser chrome cropped out.
- macOS: `Cmd+Shift+5` to record the region → convert with
  `ffmpeg -i in.mov -vf "fps=12,scale=960:-1:flags=lanczos" -loop 0 demo.gif`
- Keep it under ~5 MB so GitHub renders it inline; trim dead air rather than
  dropping frame rate further.
- Do not record with a real API key visible in the key field.

**Then**: drop the file here as `demo.gif` and swap the placeholder quote block
in the root README for `![Frontera demo](docs/demo.gif)`.
