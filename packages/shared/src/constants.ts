import type { Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  downloadDir: "./downloads",
  libraryDir: "./library",
  autoOrganizeUnrecognized: false,
  queue: {
    concurrency: 2
  }
};
