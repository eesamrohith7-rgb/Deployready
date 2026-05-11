import IORedis from "ioredis";
import { eventsChannel } from "@/lib/webaudit/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const scanId = params.id;
  const channel = eventsChannel(scanId);

  // Dedicated subscriber connection (must not share with publisher pool)
  const sub = new IORedis(REDIS_URL);

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      controller.enqueue(encoder.encode(`: connected\n\n`));
      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 15_000);

      sub.subscribe(channel).catch(() => {});
      sub.on("message", (_ch: string, msg: string) => {
        try {
          const ev = JSON.parse(msg);
          send(ev);
          if (ev.type === "scan.completed" || ev.type === "scan.failed") {
            clearInterval(heartbeat);
            closed = true;
            controller.close();
            sub.quit().catch(() => {});
          }
        } catch {}
      });
    },
    cancel() {
      closed = true;
      sub.quit().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
