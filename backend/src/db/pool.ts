import { Pool } from "pg";
import { config } from "../config";

let pool: Pool | null = null;

export function getPool(): Pool | null {
  if (!config.databaseUrl) return null;
  if (!pool) {
    pool = new Pool({ connectionString: config.databaseUrl, max: 10 });
  }
  return pool;
}

export async function pingDatabase(): Promise<"ok" | "unconfigured" | "unreachable"> {
  const p = getPool();
  if (!p) return "unconfigured";
  try {
    await p.query("SELECT 1");
    return "ok";
  } catch {
    return "unreachable";
  }
}
