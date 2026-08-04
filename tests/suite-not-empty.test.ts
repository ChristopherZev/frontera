// Guard against the failure this suite was born from: `npm test` ran
// `node --test` with zero test files for weeks, so CI was green on nothing.
// An empty or unresolved glob still exits 0, so assert the suite exists.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

test("the test directory actually contains suites", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const suites = readdirSync(here).filter(
    (f) => f.endsWith(".test.ts") && f !== "suite-not-empty.test.ts",
  );
  assert.ok(
    suites.length >= 2,
    `expected real test suites in tests/, found ${suites.length}: ${suites.join(", ")}`,
  );
});
