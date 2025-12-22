import { EventEmitter } from "events";
import type { Request, Response } from "express";
import type { JobEvent } from "@crocdesk/shared";
import { logger } from "./utils/logger";

const emitter = new EventEmitter();

export function publishEvent(event: JobEvent): void {
  logger.debug("Publishing SSE event", { 
    jobId: event.jobId, 
    type: event.type,
    step: event.step,
    progress: event.progress
  });
  emitter.emit("event", event);
}

export function sseHandler(req: Request, res: Response): void {
  logger.info("SSE connection established", { ip: req.ip });
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  });

  const send = (event: JobEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  const heartbeat = setInterval(() => {
    res.write(`: ping\n\n`);
  }, 15000);

  emitter.on("event", send);

  req.on("close", () => {
    clearInterval(heartbeat);
    emitter.off("event", send);
    res.end();
  });
}
