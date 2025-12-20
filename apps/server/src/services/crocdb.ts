import crypto from "crypto";
import type {
  CrocdbApiResponse,
  CrocdbEntryResponseData,
  CrocdbInfoResponseData,
  CrocdbPlatformsResponseData,
  CrocdbRegionsResponseData,
  CrocdbSearchRequest,
  CrocdbSearchResponseData
} from "@crocdesk/shared";
import {
  getCachedEntry,
  getCachedSearch,
  setCachedEntry,
  setCachedSearch
} from "../db";
import { CROCDB_BASE_URL, CROCDB_CACHE_TTL_MS } from "../config";

function isFresh(updatedAt: number): boolean {
  return Date.now() - updatedAt < CROCDB_CACHE_TTL_MS;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, val]) => val !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries
      .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashPayload(payload: unknown): string {
  const stable = stableStringify(payload);
  return crypto.createHash("sha1").update(stable).digest("hex");
}

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${CROCDB_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Crocdb request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${CROCDB_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Crocdb request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function searchEntries(
  request: CrocdbSearchRequest
): Promise<CrocdbApiResponse<CrocdbSearchResponseData>> {
  const queryHash = hashPayload(request);
  const cached = getCachedSearch(queryHash);
  if (cached && isFresh(cached.updatedAt)) {
    return JSON.parse(cached.json) as CrocdbApiResponse<CrocdbSearchResponseData>;
  }

  const response = await postJson<CrocdbApiResponse<CrocdbSearchResponseData>>(
    "/search",
    request as Record<string, unknown>
  );

  setCachedSearch(queryHash, JSON.stringify(response));
  return response;
}

export async function getEntry(
  slug: string
): Promise<CrocdbApiResponse<CrocdbEntryResponseData>> {
  const cached = getCachedEntry(slug);
  if (cached && isFresh(cached.updatedAt)) {
    return JSON.parse(cached.json) as CrocdbApiResponse<CrocdbEntryResponseData>;
  }

  const response = await postJson<CrocdbApiResponse<CrocdbEntryResponseData>>(
    "/entry",
    { slug }
  );

  setCachedEntry(slug, JSON.stringify(response));
  return response;
}

export async function getPlatforms(): Promise<
  CrocdbApiResponse<CrocdbPlatformsResponseData>
> {
  return getJson<CrocdbApiResponse<CrocdbPlatformsResponseData>>("/platforms");
}

export async function getRegions(): Promise<
  CrocdbApiResponse<CrocdbRegionsResponseData>
> {
  return getJson<CrocdbApiResponse<CrocdbRegionsResponseData>>("/regions");
}

export async function getInfo(): Promise<
  CrocdbApiResponse<CrocdbInfoResponseData>
> {
  return getJson<CrocdbApiResponse<CrocdbInfoResponseData>>("/info");
}
