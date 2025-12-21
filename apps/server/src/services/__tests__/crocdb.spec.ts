import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CrocdbApiResponse, CrocdbEntryResponseData, CrocdbSearchResponseData } from '@crocdesk/shared';

// Mock db cache layer
vi.mock('../../db', () => {
  const cacheSearch = new Map<string, { json: string; updatedAt: number }>();
  const cacheEntry = new Map<string, { json: string; updatedAt: number }>();
  return {
    getCachedSearch: (hash: string) => cacheSearch.get(hash) ?? null,
    setCachedSearch: (hash: string, json: string) => cacheSearch.set(hash, { json, updatedAt: Date.now() }),
    getCachedEntry: (slug: string) => cacheEntry.get(slug) ?? null,
    setCachedEntry: (slug: string, json: string) => cacheEntry.set(slug, { json, updatedAt: Date.now() }),
  };
});

// Import after mocks
import { searchEntries, getEntry, getPlatforms, getRegions } from '../crocdb';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch as unknown as typeof fetch);
});

describe('crocdb service', () => {
  it('searchEntries uses cache when fresh', async () => {
    const payload = { search_key: 'metroid', platforms: ['nes'] };
    const response: CrocdbApiResponse<CrocdbSearchResponseData> = {
      info: {},
      data: {
        results: [], current_results: 0, total_results: 0, current_page: 1, total_pages: 1
      }
    };
    // Prime cache via real set (call function to compute hash indirectly)
    // Instead, call once to set cache then call again to hit cache
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => response });
    const first = await searchEntries(payload);
    expect(first.data.results.length).toBe(0);
    // Second call should not hit network
    const second = await searchEntries(payload);
    expect(second.data.total_results).toBe(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('getEntry hits network when not cached then caches', async () => {
    const entryResponse: CrocdbApiResponse<CrocdbEntryResponseData> = {
      info: {},
      data: {
        entry: {
          slug: 'metroid-nes', title: 'Metroid', platform: 'nes', regions: ['us'], links: []
        }
      }
    };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => entryResponse });

    const first = await getEntry('metroid-nes');
    expect(first.data.entry.slug).toBe('metroid-nes');
    // Second call should come from cache
    const second = await getEntry('metroid-nes');
    expect(second.data.entry.title).toBe('Metroid');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('platforms and regions fetch via GET', async () => {
    const platforms: CrocdbApiResponse<{ platforms: Record<string, { brand: string; name: string }> }> = {
      info: {}, data: { platforms: { nes: { brand: 'Nintendo', name: 'NES' } } }
    };
    const regions: CrocdbApiResponse<{ regions: Record<string, string> }> = {
      info: {}, data: { regions: { us: 'United States' } }
    };
    // First call resolves platforms, second resolves regions
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => platforms });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => regions });

    const p = await getPlatforms();
    const r = await getRegions();
    expect(p.data.platforms.nes.name).toBe('NES');
    expect(r.data.regions.us).toBe('United States');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});