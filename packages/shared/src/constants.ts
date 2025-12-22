import type { Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  downloadDir: "./downloads",
  libraryDir: "./library",
  queue: {
    concurrency: 2
  },
  platformShortNames: {}
};
