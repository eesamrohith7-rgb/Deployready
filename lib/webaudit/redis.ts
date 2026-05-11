import IORedis from "ioredis";

const url = process.env.REDIS_URL || "redis://localhost:6379";

declare global {
  // eslint-disable-next-line no-var
  var __wa_redis: IORedis | undefined;
}

export const redis: IORedis =
  globalThis.__wa_redis ??
  new IORedis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: true,
    // Give up reconnecting after ~4s of failures so health checks don't hang.
    retryStrategy: (times: number) => (times > 8 ? null : Math.min(times * 200, 2000)),
  });

if (process.env.NODE_ENV !== "production") globalThis.__wa_redis = redis;

export function eventsChannel(scanId: string) {
  return `wa:scan:${scanId}:events`;
}
