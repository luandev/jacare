import path from "path";

const portValue = Number(process.env.CROCDESK_PORT ?? 3333);
export const PORT = Number.isNaN(portValue) ? 3333 : portValue;
export const CROCDESK_DATA_DIR =
  process.env.CROCDESK_DATA_DIR ?? path.resolve(process.cwd(), "data");
export const CROCDESK_STAGING_DIR =
  process.env.CROCDESK_STAGING_DIR ?? path.resolve(process.cwd(), "tmp");
export const CROCDB_BASE_URL =
  process.env.CROCDB_BASE_URL ?? "https://api.crocdb.net";
export const CROCDB_CACHE_TTL_MS = Number(
  process.env.CROCDB_CACHE_TTL_MS ?? 1000 * 60 * 60 * 24
);
export const ENABLE_DOWNLOADS = process.env.CROCDESK_ENABLE_DOWNLOADS === "true";
