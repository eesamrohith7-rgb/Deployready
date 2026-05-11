import { Pool } from "pg";

const url = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/webaudit";

declare global {
  // eslint-disable-next-line no-var
  var __wa_pgpool: Pool | undefined;
}

export const pool: Pool =
  globalThis.__wa_pgpool ?? new Pool({ connectionString: url, max: 10 });

if (process.env.NODE_ENV !== "production") globalThis.__wa_pgpool = pool;

export async function q<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const r = await pool.query(sql, params);
  return r.rows as T[];
}

export async function one<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const r = await pool.query(sql, params);
  return (r.rows[0] as T) || null;
}
