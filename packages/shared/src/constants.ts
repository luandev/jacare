import type { Profile, Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  libraryRoots: [],
  downloadDir: "./downloads",
  queue: {
    maxConcurrentDownloads: 2,
    maxConcurrentTransfers: 1
  }
};

export const DEFAULT_PROFILE: Profile = {
  id: "default",
  name: "Default",
  platforms: {},
  postActions: {
    writeManifest: true,
    writePlaylists: false
  }
};
