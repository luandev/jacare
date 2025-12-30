import path from "path";
import { DEFAULT_SETTINGS } from "@crocdesk/shared";
import type { Settings } from "@crocdesk/shared";

const portValue = Number(process.env.CROCDESK_PORT ?? 3333);
export const PORT = Number.isNaN(portValue) ? 3333 : portValue;
export const CROCDESK_DATA_DIR =
  process.env.CROCDESK_DATA_DIR ?? path.resolve(process.cwd(), "data");
export const CROCDB_BASE_URL =
  process.env.CROCDB_BASE_URL ?? "https://api.crocdb.net";
export const CROCDB_CACHE_TTL_MS = Number(
  process.env.CROCDB_CACHE_TTL_MS ?? 1000 * 60 * 60 * 24
);

export function getDefaultSettings(): Settings {
  const useAbsolutePaths = process.env.CROCDESK_USE_ABSOLUTE_PATHS === "true";
  
  if (useAbsolutePaths) {
    return {
      ...DEFAULT_SETTINGS,
      downloadDir: "/downloads",
      libraryDir: "/library"
    };
  }
  
  return DEFAULT_SETTINGS;
}
