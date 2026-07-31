import { DuckDBInstance, type DuckDBConnection } from "@duckdb/node-api";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Local analytics choke point, the data twin of `lib/claude.ts`.
 *
 * Big data files never enter a model context. Query them here — DuckDB reads
 * CSV/JSON/JSONL/Parquet in place — and hand Claude only the aggregate, sample,
 * or slice it actually needs. SQL over the file is exact; a 10k-row file pasted
 * into a prompt is not.
 *
 * Runs locally and in CI only. Native module — deployed routes must not import
 * this; a hosted store is the path for production telemetry.
 *
 * Examples:
 *   query("SELECT count(*) FROM read_csv_auto('big.csv')")
 *   query("SELECT * FROM read_parquet('runs.parquet') LIMIT 10")
 *   query(`SELECT model, sum(outputTokens) FROM
 *          read_json_auto('data/telemetry/calls.jsonl', format='newline_delimited')
 *          GROUP BY model`)
 */

const DB_PATH = process.env.DUCKDB_PATH ?? "data/frontera.duckdb";

let connPromise: Promise<DuckDBConnection> | null = null;

async function getConnection(): Promise<DuckDBConnection> {
  if (!connPromise) {
    connPromise = (async () => {
      mkdirSync(dirname(DB_PATH), { recursive: true });
      const instance = await DuckDBInstance.create(DB_PATH);
      return instance.connect();
    })();
  }
  return connPromise;
}

export async function query<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  const conn = await getConnection();
  const reader = await conn.runAndReadAll(sql);
  return reader.getRowObjects() as T[];
}
