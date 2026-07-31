"use client";

import { useEffect, useState } from "react";

/**
 * Home: browser → API route → Claude → streamed back.
 * Surfaces the three access tiers: anonymous replay, bring-your-own-key,
 * and password unlock.
 */
export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [tier, setTier] = useState<string>("");

  const [apiKey, setApiKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [unlockMsg, setUnlockMsg] = useState("");

  useEffect(() => {
    setApiKey(sessionStorage.getItem("anthropicKey") ?? "");
    setUnlocked(sessionStorage.getItem("unlocked") === "1");
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
        sessionStorage.setItem("unlocked", "1");
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

  async function run() {
    setBusy(true);
    setOutput("");
    setTier("");
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) headers["X-User-Anthropic-Key"] = apiKey;
      const res = await fetch("/api/claude", {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt }),
      });
      setTier(res.headers.get("X-Claude-Tier") ?? "");
      if (!res.ok || !res.body) {
        setOutput(`Error: ${res.status} ${await res.text()}`);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setOutput((prev) => prev + decoder.decode(value));
      }
    } catch (err) {
      setOutput(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  const mode = apiKey ? "byok" : unlocked ? "unlocked" : "replay";

  return (
    <>
      <h1>Frontera</h1>
      <p className="sub">
        A streaming Claude workspace. Every call runs through one logged choke
        point, so tokens, latency, and cost stay observable.
      </p>

      {mode === "replay" && (
        <p className="notice">
          Demo mode — responses are canned, no live model is called. Add your own
          key below (it stays in your browser) or unlock the hosted demo for live answers.
        </p>
      )}

      <div className="panel">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Explain what a system prompt is, in two sentences."
        />
        <button onClick={run} disabled={busy || !prompt.trim()}>
          {busy ? "Streaming…" : "Send"}
        </button>
        {tier && <span className="tier-tag">served: {tier}</span>}
        <div className="output">{output}</div>
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
          {unlocked && <p className="hint">Hosted demo unlocked for this session.</p>}
          {unlockMsg && <p className="hint">{unlockMsg}</p>}
        </div>
      </details>
    </>
  );
}
