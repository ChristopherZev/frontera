"use client";

import { useEffect, useState } from "react";
import { STATS_SENTINEL, type CallStats } from "./api/claude/stats";

/** Copy for the persistent mode badge — what tier the *next* call will use. */
const MODE_COPY: Record<string, { label: string; detail: string }> = {
  replay: {
    label: "Demo mode",
    detail: "canned responses · no live model call · $0",
  },
  byok: {
    label: "Your key",
    detail: "live model · billed to your Anthropic account",
  },
  unlocked: {
    label: "Unlocked",
    detail: "live model · billed to the host's key",
  },
};

/**
 * Home: browser → API route → Claude → streamed back.
 * Surfaces the three access tiers: anonymous replay, bring-your-own-key,
 * and password unlock. Each answer carries the same tokens/latency numbers
 * the server-side choke point logs, so the observability story is visible.
 */
export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<CallStats | null>(null);

  const [apiKey, setApiKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [unlockMsg, setUnlockMsg] = useState("");

  useEffect(() => {
    setApiKey(sessionStorage.getItem("anthropicKey") ?? "");
    // The unlock cookie is httpOnly — ask the server for the real state.
    fetch("/api/unlock")
      .then((res) => (res.ok ? res.json() : { unlocked: false }))
      .then((data) => setUnlocked(Boolean(data.unlocked)))
      .catch(() => {});
  }, []);

  function saveKey(v: string) {
    setApiKey(v);
    if (v) sessionStorage.setItem("anthropicKey", v);
    else sessionStorage.removeItem("anthropicKey");
  }

  async function unlock() {
    setUnlockMsg("");
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setUnlocked(true);
        setPassword("");
        setUnlockMsg("Unlocked — live responses enabled.");
      } else {
        setUnlockMsg(`Unlock failed: ${res.status} ${await res.text()}`);
      }
    } catch (err) {
      setUnlockMsg(`Unlock error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function lock() {
    setUnlockMsg("");
    try {
      await fetch("/api/unlock", { method: "DELETE" });
      setUnlocked(false);
      setUnlockMsg("Locked — back to demo mode.");
    } catch (err) {
      setUnlockMsg(`Lock error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function run() {
    setBusy(true);
    setOutput("");
    setStats(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) headers["X-User-Anthropic-Key"] = apiKey;
      const res = await fetch("/api/claude", {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok || !res.body) {
        setOutput(`Error: ${res.status} ${await res.text()}`);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      // Accumulate locally: the stats sentinel can straddle two chunks, so the
      // split has to run against the whole text, not a single decoded chunk.
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        const cut = text.indexOf(STATS_SENTINEL);
        setOutput(cut === -1 ? text : text.slice(0, cut));
      }
      const cut = text.indexOf(STATS_SENTINEL);
      if (cut !== -1) {
        try {
          setStats(JSON.parse(text.slice(cut + STATS_SENTINEL.length)));
        } catch {
          // malformed trailer — the answer itself is still shown
        }
      }
    } catch (err) {
      setOutput(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  const mode = apiKey ? "byok" : unlocked ? "unlocked" : "replay";
  const copy = MODE_COPY[mode];

  return (
    <>
      <h1>Frontera</h1>
      <p className="sub">
        A streaming Claude workspace. Every call runs through one logged choke
        point, so tokens, latency, and cost stay observable.
      </p>

      <div className={`mode-badge mode-${mode}`}>
        <span className="mode-dot" aria-hidden="true" />
        <strong>{copy.label}</strong>
        <span className="mode-detail">{copy.detail}</span>
        {mode === "replay" && (
          <span className="mode-cta">Add a key or unlock below for live answers ↓</span>
        )}
      </div>

      <div className="panel">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Explain what a system prompt is, in two sentences."
        />
        <button onClick={run} disabled={busy || !prompt.trim()}>
          {busy ? "Streaming…" : "Send"}
        </button>
        <div className="output">{output}</div>
        {stats && (
          <dl className="stats" aria-label="Call stats">
            <div>
              <dt>served by</dt>
              <dd>{stats.tier}</dd>
            </div>
            <div>
              <dt>latency</dt>
              <dd>{stats.latencyMs.toLocaleString()} ms</dd>
            </div>
            <div>
              <dt>tokens in / out</dt>
              <dd>
                {stats.inputTokens} / {stats.outputTokens}
              </dd>
            </div>
            <div>
              <dt>model</dt>
              <dd>{stats.model}</dd>
            </div>
          </dl>
        )}
      </div>

      <details className="access">
        <summary>Access &amp; keys</summary>
        <div className="access-body">
          <label htmlFor="key">Your Anthropic API key (stays in this browser tab only)</label>
          <input
            id="key"
            type="password"
            value={apiKey}
            onChange={(e) => saveKey(e.target.value.trim())}
            placeholder="sk-ant-…"
            autoComplete="off"
          />
          <p className="hint">
            Sent only with your requests, never stored server-side or logged.
            Clearing this field removes it.
          </p>

          {unlocked ? (
            <>
              <label>Hosted demo unlocked — live responses on the house key</label>
              <div className="row">
                <p className="hint">Stays unlocked on this browser for up to 7 days.</p>
                <button onClick={lock}>Lock</button>
              </div>
            </>
          ) : (
            <>
              <label htmlFor="pw">Or unlock the hosted demo with a password</label>
              <div className="row">
                <input
                  id="pw"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="demo password"
                  autoComplete="off"
                />
                <button onClick={unlock} disabled={!password.trim()}>
                  Unlock
                </button>
              </div>
            </>
          )}
          {unlockMsg && <p className="hint">{unlockMsg}</p>}
        </div>
      </details>
    </>
  );
}
