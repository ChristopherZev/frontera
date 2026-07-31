#!/usr/bin/env node
// Ad-hoc SQL over the app's data — so big files get queried, not pasted
// into an AI context.
//
// Usage:
//   npm run db -- "SELECT * FROM calls ORDER BY ts DESC LIMIT 10"
//   npm run db -- "SELECT count(*) FROM read_csv_auto('some-big-file.csv')"
//   npm run db -- "SELECT * FROM read_parquet('runs.parquet') LIMIT 5"
//
// `calls` is a pre-registered view over data/telemetry/calls.jsonl when it exists.

import { DuckDBInstance } from "@duckdb/node-api";
import { existsSync } from "node:fs";

const sql = process.argv.slice(2).join(" ").trim();
if (!sql) {
  console.error('usage: npm run db -- "<SQL>"');
  process.exit(1);
}

const instance = await DuckDBInstance.create(":memory:");
const conn = await instance.connect();

if (existsSync("data/telemetry/calls.jsonl")) {
  await conn.run(
    "CREATE VIEW calls AS SELECT * FROM read_json_auto('data/telemetry/calls.jsonl', format='newline_delimited')"
  );
}

const reader = await conn.runAndReadAll(sql);
const rows = reader.getRowObjects().map((row) =>
  Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k, typeof v === "bigint" ? Number(v) : v])
  )
);
console.table(rows);
console.error(`${rows.length} row(s)`);
