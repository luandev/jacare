import { PORT } from "./config";
import { createApp } from "./app";

async function start(): Promise<void> {
  const app = await createApp();

  app.listen(PORT, () => {
    console.log(`CrocDesk server listening on ${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
