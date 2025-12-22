import type { Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  downloadDir: "./downloads",
  queue: {
    concurrency: 2
  }
};
