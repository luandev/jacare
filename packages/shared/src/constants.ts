import type { Profile, Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  libraryRoots: [],
  downloadDir: "./downloads",
  queue: {
    concurrency: 2
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
