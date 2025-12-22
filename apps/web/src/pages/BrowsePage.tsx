import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useSearchParams } from "react-router-dom";
import GameCard from "../components/GameCard";
import PaginationBar from "../components/PaginationBar";
import { apiGet, apiPost } from "../lib/api";
import { useDownloadProgressStore, useUIStore } from "../store";
import { useSSE } from "../store/hooks/useSSE";
import { Input, Select, Button } from "../components/ui";
import { spacing } from "../lib/design-tokens";
import type {
  CrocdbApiResponse,
  CrocdbEntry,
  CrocdbPlatformsResponseData,
  CrocdbRegionsResponseData,
  CrocdbSearchResponseData,
  LibraryItem,
  JobEvent
} from "@crocdesk/shared";

const RESULTS_PER_PAGE = 60;

export default function BrowsePage() {
  // Ensure SSE connection is active
  useSSE();
  
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Read state from URL params
  const searchKey = searchParams.get("q") || "";
  const platform = searchParams.get("pf") || "";
  const region = searchParams.get("rg") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  // Get UI state from store
  const stickyPlatform = useUIStore((state) => state.stickyPlatform);
  const stickyRegion = useUIStore((state) => state.stickyRegion);
  const gridColumns = useUIStore((state) => state.gridColumns);
  const setGridColumns = useUIStore((state) => state.setGridColumns);
  const setStickyPlatform = useUIStore((state) => state.setStickyPlatform);
  const setStickyRegion = useUIStore((state) => state.setStickyRegion);
  
  const defaultPlatform = platform || stickyPlatform;
  const defaultRegion = region || stickyRegion;
  
  // Get download progress from store
  const downloadingSlugs = useDownloadProgressStore((state) => state.downloadingSlugs);
  const progressBySlug = useDownloadProgressStore((state) => state.progressBySlug);
  const speedDataBySlug = useDownloadProgressStore((state) => state.speedDataBySlug);
  const bytesBySlug = useDownloadProgressStore((state) => state.bytesBySlug);
  
  const [results, setResults] = useState<CrocdbEntry[]>([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalResults: 0 });
  const [status, setStatus] = useState<string>("");

  const platformsQuery = useQuery({
    queryKey: ["platforms"],
    queryFn: () => apiGet<CrocdbApiResponse<CrocdbPlatformsResponseData>>("/crocdb/platforms")
  });

  const regionsQuery = useQuery({
    queryKey: ["regions"],
    queryFn: () => apiGet<CrocdbApiResponse<CrocdbRegionsResponseData>>("/crocdb/regions")
  });

  const ownedQuery = useQuery({
    queryKey: ["library-items"],
    queryFn: () => apiGet<LibraryItem[]>("/library/items")
  });

  const ownedSlugs = useMemo(() => {
    return new Set(
      (ownedQuery.data ?? [])
        .map((item) => item.gameSlug)
        .filter((slug): slug is string => Boolean(slug))
    );
  }, [ownedQuery.data]);

  const ownedItemsBySlug = useMemo(() => {
    const map = new Map<string, LibraryItem[]>();
    for (const item of ownedQuery.data ?? []) {
      if (item.gameSlug) {
        const list = map.get(item.gameSlug) ?? [];
        list.push(item);
        map.set(item.gameSlug, list);
      }
    }
    return map;
  }, [ownedQuery.data]);

  const searchMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPost<CrocdbApiResponse<CrocdbSearchResponseData>>(
        "/crocdb/search",
        payload
      ),
    onSuccess: (response) => {
      setResults(response.data.results ?? []);
      setPagination({
        currentPage: response.data.current_page ?? 1,
        totalPages: response.data.total_pages ?? 1,
        totalResults: response.data.total_results ?? 0
      });
      setStatus(`Found ${response.data.total_results} results`);
    },
    onError: (error) => {
      setStatus(error instanceof Error ? error.message : "Search failed");
    }
  });

  const downloadMutation = useMutation({
    mutationFn: (payload: { slug: string; linkIndex?: number }) =>
      apiPost("/jobs/download", payload),
    onSuccess: () => {
      setStatus("Download job queued");
      // Download state will be updated via SSE events
    },
    onError: (error) =>
      setStatus(error instanceof Error ? error.message : "Download failed")
  });
  // Auto-search when URL params change
  useEffect(() => {
    if (searchKey || platform || region) {
      searchMutation.mutate({
        search_key: searchKey || undefined,
        platforms: platform ? [platform] : undefined,
        regions: region ? [region] : undefined,
        max_results: RESULTS_PER_PAGE,
        page
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey, platform, region, page]);

  // On first load, if URL lacks pf/rg but sticky values exist, apply them to URL to make filters sticky
  useEffect(() => {
    if (!platform || !region) {
      const hasSticky = (!!stickyPlatform && !platform) || (!!stickyRegion && !region);
      if (hasSticky) {
        const next = new URLSearchParams(searchParams);
        if (!platform && stickyPlatform) next.set("pf", stickyPlatform);
        if (!region && stickyRegion) next.set("rg", stickyRegion);
        if (!next.get("page")) next.set("page", "1");
        setSearchParams(next);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextParams: Record<string, string> = {};
    const q = (formData.get("search") as string) || "";
    const pf = (formData.get("platform") as string) || "";
    const rg = (formData.get("region") as string) || "";
    
    if (q) nextParams.q = q;
    if (pf) nextParams.pf = pf;
    if (rg) nextParams.rg = rg;
    nextParams.page = "1"; // Reset to page 1 on new search
    
    // Persist sticky selections to store
    if (pf) {
      setStickyPlatform(pf);
    } else {
      setStickyPlatform("");
    }
    if (rg) {
      setStickyRegion(rg);
    } else {
      setStickyRegion("");
    }

    setSearchParams(nextParams);
  }

  function handlePageChange(newPage: number) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("page", newPage.toString());
    setSearchParams(nextParams);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="grid" style={{ gap: "20px" }}>
      <section className="hero">
        <h1>Browse Crocdb</h1>
        <p>Search the Crocdb catalog, queue downloads, and track local ownership.</p>
      </section>

      <section className="card">
        <form className="controls" onSubmit={handleSearch} style={{ display: "flex", gap: spacing.md, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: spacing.xs }}>
            <label htmlFor="search-input">Search</label>
            <Input
              id="search-input"
              name="search"
              defaultValue={searchKey}
              placeholder="Croc, Zelda, Metroid"
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs }}>
            <label htmlFor="platform-select">Platform</label>
            <Select id="platform-select" name="platform" defaultValue={defaultPlatform}>
              <option value="">All</option>
              {platformsQuery.data &&
                Object.entries(platformsQuery.data.data.platforms).map(
                  ([id, data]) => (
                    <option key={id} value={id}>
                      {data.name}
                    </option>
                  )
                )}
            </Select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs }}>
            <label htmlFor="region-select">Region</label>
            <Select id="region-select" name="region" defaultValue={defaultRegion}>
              <option value="">All</option>
              {regionsQuery.data &&
                Object.entries(regionsQuery.data.data.regions).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
            </Select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs }}>
            <label htmlFor="search-button" style={{ visibility: "hidden" }}>Search</label>
            <Button id="search-button" type="submit">Search</Button>
          </div>
        </form>
        {status && <div className="status">{status}</div>}
      </section>

      <section className={`grid cols-${gridColumns}`} style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${Math.max(140, 320 - (gridColumns - 3) * 40)}px, 1fr))` }}>
        {results.map((entry) => {
          const isOwned = ownedSlugs.has(entry.slug);
          const isDownloading = downloadingSlugs.has(entry.slug);
          const ownedItem = ownedItemsBySlug.get(entry.slug)?.[0];
          const progress = progressBySlug[entry.slug] ?? 0;
          return (
            <GameCard
              key={entry.slug}
              entry={entry}
              isOwned={isOwned}
              isDownloading={isDownloading}
              downloadProgress={progress}
              downloadSpeedHistory={speedDataBySlug[entry.slug] || []}
              downloadBytes={bytesBySlug[entry.slug]}
              platformsData={platformsQuery.data?.data}
              location={location}
              onDownload={() => {
                const format = getPreferredFormat(entry);
                const linkIndex = findLinkIndex(entry, format);
                downloadMutation.mutate({
                  slug: entry.slug,
                  linkIndex
                });
              }}
              onShowInFolder={ownedItem?.path ? () => {
                if (window.crocdesk?.revealInFolder) {
                  window.crocdesk.revealInFolder(ownedItem.path);
                }
              } : undefined}
            />
          );
        })}
      </section>

      <PaginationBar
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={handlePageChange}
        onColumnsChange={setGridColumns}
        showGridControls={true}
        storageKey="crocdesk:browseGridColumns"
      />
    </div>
  );
}

function getPreferredFormat(entry: CrocdbEntry): string {
  const formats = Array.from(new Set(entry.links.map((l) => (l.format || "").toLowerCase())));
  if (formats.length <= 1) return formats[0] || "";
  
  // Prefer format with Myrient host
  for (const fmt of formats) {
    if (entry.links.some((l) => 
      (l.format || "").toLowerCase() === fmt && 
      (l.host || "").toLowerCase() === "myrient"
    )) {
      return fmt;
    }
  }
  return formats[0] || "";
}

function findLinkIndex(entry: CrocdbEntry, preferredFormat?: string): number | undefined {
  if (!preferredFormat) return undefined;
  
  const candidates = entry.links.filter(
    (l) => (l.format || "").toLowerCase() === preferredFormat.toLowerCase()
  );
  if (candidates.length === 0) return undefined;
  
  // Prefer Myrient
  const myrientIdx = candidates.findIndex((l) => (l.host || "").toLowerCase() === "myrient");
  const chosen = myrientIdx >= 0 ? candidates[myrientIdx] : candidates[0];
  return entry.links.findIndex((l) => l.url === chosen.url);
}

function toFileHref(p: string): string {
  const normalized = p.replace(/\\/g, "/");
  if (/^[A-Za-z]:\//.test(normalized)) {
    return `file:///${encodeURI(normalized)}`;
  }
  return `file://${encodeURI(normalized)}`;
}
