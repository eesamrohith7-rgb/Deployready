import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";

export const QUEUE_NAME = "wa-scans";

export type ScanJob = {
  scanId: string;
  url: string | null;
  modules: string[];
  files?: string[];
};

// Build a fresh connection per BullMQ object (BullMQ requires its own
// dedicated client and does not tolerate shared command/subscriber clients).
function makeConnection() {
  return new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
    retryStrategy: (times: number) => (times > 8 ? null : Math.min(times * 200, 2000)),
  });
}

declare global {
  // eslint-disable-next-line no-var
  var __wa_queue: Queue<ScanJob> | undefined;
  // eslint-disable-next-line no-var
  var __wa_queueEvents: QueueEvents | undefined;
}

// Lazy getters so importing this module during `next build` does not
// open a Redis connection.
let _q: Queue<ScanJob> | undefined = globalThis.__wa_queue;
let _qe: QueueEvents | undefined = globalThis.__wa_queueEvents;

export function getScanQueue(): Queue<ScanJob> {
  if (!_q) {
    _q = new Queue<ScanJob>(QUEUE_NAME, { connection: makeConnection() as any });
    if (process.env.NODE_ENV !== "production") globalThis.__wa_queue = _q;
  }
  return _q;
}

export function getScanQueueEvents(): QueueEvents {
  if (!_qe) {
    _qe = new QueueEvents(QUEUE_NAME, { connection: makeConnection() as any });
    if (process.env.NODE_ENV !== "production") globalThis.__wa_queueEvents = _qe;
  }
  return _qe;
}

// Backwards-compatible exports used by the worker (eagerly constructs)
export const scanQueue: Queue<ScanJob> = new Proxy({} as Queue<ScanJob>, {
  get(_t, prop) {
    return (getScanQueue() as any)[prop];
  },
});
