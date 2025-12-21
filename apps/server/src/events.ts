import { EventEmitter } from "events";
import type { Request, Response } from "express";
import type { ServerEvent } from "@crocdesk/shared";

const emitter = new EventEmitter();

export function publishEvent(event: ServerEvent): void {
  emitter.emit("event", event);
}

export function sseHandler(req: Request, res: Response): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  });

  const send = (event: ServerEvent) => {
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
