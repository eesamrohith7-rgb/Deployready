import { redis } from "./redis";

export async function rateLimit(key: string, max: number, windowSec: number): Promise<{ ok: boolean; remaining: number }> {
  const k = `rl:${key}`;
  const cur = await redis.incr(k);
  if (cur === 1) await redis.expire(k, windowSec);
  return { ok: cur <= max, remaining: Math.max(0, max - cur) };
}
