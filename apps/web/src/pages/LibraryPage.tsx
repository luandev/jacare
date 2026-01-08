import { useEffect, useState, useMemo } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { apiGet, apiPost } from "../lib/api";
import type { LibraryItem, Manifest, JobEvent, CrocdbApiResponse, CrocdbPlatformsResponseData } from "@crocdesk/shared";
import GameCard from "../components/GameCard";
import PaginationBar from "../components/PaginationBar";
import { DownloadingGhostCard } from "../components/DownloadingGhostCard";
import { ErrorAlert } from "../components/ErrorAlert";
import { useDownloadProgressStore, useSSEStore } from "../store";
import { useSSE } from "../store/hooks/useSSE";
import { Input, Select, Button } from "../components/ui";
import { spacing } from "../lib/design-tokens";
import { useQuery } from "@tanstack/react-query";

type SortOption = "name" | "platform" | "date";
type GroupOption = "none" | "platform" | "status";
type StatusFilter = "all" | "recognized" | "unknown";

export default function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [manifests, setManifests] = useState<Record<string, Manifest | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<string>("");
  const [gridColumns, setGridColumns] = useState(3);
  const [scanJobId, setScanJobId] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanMessage, setScanMessage] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  
  // Search, filter, and sort state from URL params
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  const platformFilter = searchParams.get("pf") || "";
  const statusFilter = (searchParams.get("sf") || "all") as StatusFilter;
  const sortBy = (searchParams.get("sort") || "name") as SortOption;
  const groupBy = (searchParams.get("group") || "none") as GroupOption;
  
  // Ensure SSE connection is active
  useSSE();
  
  // Fetch platforms data for display
  const platformsQuery = useQuery({
    queryKey: ["platforms"],
    queryFn: () => apiGet<CrocdbApiResponse<CrocdbPlatformsResponseData>>("/crocdb/platforms")
  });
  
  // Get downloading slugs from store
  const downloadingSlugs = useDownloadProgressStore((state) => state.downloadingSlugs);
  const lastEvent = useSSEStore((state) => state.lastEvent);
  
  // Listen for scan job events
  useEffect(() => {
    if (!lastEvent || !scanJobId) return;
    
    const event = lastEvent as JobEvent;
    if (event.jobId !== scanJobId) return;
    
    if (event.type === "STEP_PROGRESS") {
      setScanProgress(event.progress ?? 0);
      setScanMessage(event.message ?? "");
    } else if (event.type === "JOB_DONE") {
      setIsScanning(false);
      setScanProgress(1);
      setScanMessage("Scan complete!");
      setStatus("Scan completed successfully");
      setScanJobId(null);
      
      // Reload library items
      setTimeout(() => {
        reloadLibrary();
      }, 1000);
    } else if (event.type === "JOB_FAILED") {
      setIsScanning(false);
      setScanProgress(0);
      setScanMessage("");
      setStatus(`Scan failed: ${event.message || "Unknown error"}`);
      setScanJobId(null);
    }
  }, [lastEvent, scanJobId]);
  
  // Filter out downloading slugs that are already in the library
  const downloadingSlugsArray = useMemo(() => {
    const slugs = Array.from(downloadingSlugs);
    // Filter out slugs that are already in the library
    const ownedSlugs = new Set(items.map(item => {
      const manifest = manifests[item.path];
      return manifest?.crocdb?.slug;
    }).filter(Boolean));
    return slugs.filter(slug => !ownedSlugs.has(slug));
  }, [downloadingSlugs, items, manifests]);
  
  // Filtered and sorted items with enriched data
  const processedItems = useMemo(() => {
    // Enrich items with manifest data
    const enriched = items.map(item => {
      const manifest = manifests[item.path];
      return {
        item,
        manifest,
        title: manifest?.crocdb?.title || "",
        platform: manifest?.crocdb?.platform || "",
        isRecognized: !!manifest
      };
    }).filter(({ manifest }) => manifest !== null);
    
    // Apply search filter
    let filtered = enriched;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(({ title }) => 
        title.toLowerCase().includes(query)
      );
    }
    
    // Apply platform filter
    if (platformFilter) {
      filtered = filtered.filter(({ platform }) => platform === platformFilter);
    }
    
    // Apply status filter
    if (statusFilter === "recognized") {
      filtered = filtered.filter(({ isRecognized }) => isRecognized);
    } else if (statusFilter === "unknown") {
      filtered = filtered.filter(({ isRecognized }) => !isRecognized);
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "name") {
        return a.title.localeCompare(b.title);
      } else if (sortBy === "platform") {
        return a.platform.localeCompare(b.platform) || a.title.localeCompare(b.title);
      } else if (sortBy === "date") {
        return (b.item.mtime || 0) - (a.item.mtime || 0);
      }
      return 0;
    });
    
    return sorted;
  }, [items, manifests, searchQuery, platformFilter, statusFilter, sortBy]);
  
  // Group items if needed
  const groupedItems = useMemo(() => {
    if (groupBy === "none") {
      return { "": processedItems };
    }
    
    const groups: Record<string, typeof processedItems> = {};
    for (const item of processedItems) {
      let key = "";
      if (groupBy === "platform") {
        key = item.platform || "Unknown";
      } else if (groupBy === "status") {
        key = item.isRecognized ? "Recognized" : "Unknown";
      }
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    }
    
    return groups;
  }, [processedItems, groupBy]);
  
  // Extract unique platforms from library items
  const availablePlatforms = useMemo(() => {
    const platforms = new Set<string>();
    items.forEach(item => {
      const manifest = manifests[item.path];
      if (manifest?.crocdb?.platform) {
        platforms.add(manifest.crocdb.platform);
      }
    });
    return Array.from(platforms).sort();
  }, [items, manifests]);

  useEffect(() => {
    reloadLibrary();
  }, []);
  
  async function reloadLibrary() {
    let cancelled = false;
    const load = async () => {
      try {
        console.log("[LibraryPage] Loading library items from /library/downloads/items");
        const data = await apiGet<LibraryItem[]>("/library/downloads/items");
        console.log("[LibraryPage] Loaded library items:", data.length, "items");
        
        if (!cancelled) {
          setItems(data);
          const manifestMap: Record<string, Manifest | null> = {};
          await Promise.all(
            data.map(async (item) => {
              const manifestPath = findManifestPath(item.path);
              try {
                const manifest = await apiGet<Manifest>(`/file?path=${encodeURIComponent(manifestPath)}`);
                manifestMap[item.path] = manifest;
              } catch (manifestError) {
                console.warn(`[LibraryPage] Failed to load manifest for ${item.path}:`, manifestError);
                manifestMap[item.path] = null;
              }
            })
          );
          setManifests(manifestMap);
        }
      } catch (e) {
        console.error("[LibraryPage] Failed to load library:", e);
        if (!cancelled) {
          const error = e instanceof Error ? e : new Error(String(e));
          setError(error);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }

  async function handleScan() {
    setStatus("");
    setIsScanning(true);
    setScanProgress(0);
    setScanMessage("Initializing scan...");
    try {
      console.log("[LibraryPage] Starting library scan");
      const response = await apiPost<{ id: string }>("/library/scan/local", {});
      console.log("[LibraryPage] Scan job created:", response.id);
      setScanJobId(response.id);
    } catch (e) {
      console.error("[LibraryPage] Failed to start scan:", e);
      setIsScanning(false);
      const errorMessage = e instanceof Error ? e.message : "Scan failed";
      setStatus(errorMessage);
    }
  }
  
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    updateSearchParams({ q: value || undefined });
  }
  
  function handlePlatformChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    updateSearchParams({ pf: value || undefined });
  }
  
  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value as StatusFilter;
    updateSearchParams({ sf: value === "all" ? undefined : value });
  }
  
  function handleSortChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value as SortOption;
    updateSearchParams({ sort: value === "name" ? undefined : value });
  }
  
  function handleGroupChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value as GroupOption;
    updateSearchParams({ group: value === "none" ? undefined : value });
  }
  
  function updateSearchParams(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    });
    setSearchParams(next);
  }
  
  function handleClearFilters() {
    setSearchParams({});
  }
  
  const location = useLocation();
  
  if (loading) {
    return <div className="card">Loading library…</div>;
  }

  if (error) {
    return (
      <ErrorAlert
        error={error}
        context="Library View - Failed to load library items"
        onDismiss={() => setError(null)}
      />
    );
  }
  
  if (items.length === 0 && downloadingSlugsArray.length === 0) {
    return (
      <div className="grid" style={{ gap: 20 }}>
        <section className="hero">
          <h1>Local Library</h1>
          <p>Your game library is empty.</p>
        </section>
        <section className="card">
          <div className="row">
            <h3>Library</h3>
            <div className="row" style={{ gap: 8 }}>
              <button className="secondary" type="button" onClick={handleScan} disabled={isScanning}>
                {isScanning ? "Scanning..." : "Scan Local Library"}
              </button>
              {status && <span className="status">{status}</span>}
            </div>
          </div>
          {isScanning && (
            <div style={{ marginTop: 16 }}>
              <div className="progress" style={{ marginBottom: 8 }}>
                <span style={{ width: `${scanProgress * 100}%` }} />
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                {scanMessage || "Processing..."}
              </div>
            </div>
          )}
        </section>
        <div className="card">No items found in library.</div>
      </div>
    );
  }

  const hasActiveFilters = searchQuery || platformFilter || statusFilter !== "all";
  const totalItems = items.length;
  const filteredCount = processedItems.length;

  return (
    <div className="grid" style={{ gap: 20 }}>
      <section className="hero">
        <h1>Local Library</h1>
        <p>Manage your locally downloaded games. {totalItems} {totalItems === 1 ? "game" : "games"} in library.</p>
      </section>
      
      {/* Search and Filter Controls */}
      <section className="card">
        <div style={{ display: "flex", gap: spacing.md, flexWrap: "wrap", alignItems: "flex-end", marginBottom: spacing.md }}>
          <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: spacing.xs }}>
            <label htmlFor="search-input">Search</label>
            <Input
              id="search-input"
              placeholder="Search by title..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs, minWidth: 150 }}>
            <label htmlFor="platform-filter">Platform</label>
            <Select id="platform-filter" value={platformFilter} onChange={handlePlatformChange}>
              <option value="">All Platforms</option>
              {availablePlatforms.map((platform) => {
                const platformName = platformsQuery.data?.data?.platforms?.[platform]?.name || platform;
                return (
                  <option key={platform} value={platform}>
                    {platformName}
                  </option>
                );
              })}
            </Select>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs, minWidth: 150 }}>
            <label htmlFor="status-filter">Status</label>
            <Select id="status-filter" value={statusFilter} onChange={handleStatusChange}>
              <option value="all">All Games</option>
              <option value="recognized">Recognized</option>
              <option value="unknown">Unknown</option>
            </Select>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs, minWidth: 130 }}>
            <label htmlFor="sort-select">Sort By</label>
            <Select id="sort-select" value={sortBy} onChange={handleSortChange}>
              <option value="name">Name</option>
              <option value="platform">Platform</option>
              <option value="date">Date Added</option>
            </Select>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs, minWidth: 130 }}>
            <label htmlFor="group-select">Group By</label>
            <Select id="group-select" value={groupBy} onChange={handleGroupChange}>
              <option value="none">None</option>
              <option value="platform">Platform</option>
              <option value="status">Status</option>
            </Select>
          </div>
          
          {hasActiveFilters && (
            <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs }}>
              <span style={{ visibility: "hidden", fontSize: "14px" }}>Clear</span>
              <Button onClick={handleClearFilters} variant="secondary">
                Clear Filters
              </Button>
            </div>
          )}
        </div>
        
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="status">
            {hasActiveFilters ? `Showing ${filteredCount} of ${totalItems} games` : `${totalItems} games`}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="secondary" type="button" onClick={handleScan} disabled={isScanning}>
              {isScanning ? "Scanning..." : "Scan Local Library"}
            </button>
            {status && <span className="status">{status}</span>}
          </div>
        </div>
        
        {isScanning && (
          <div style={{ marginTop: 16 }}>
            <div className="progress" style={{ marginBottom: 8 }}>
              <span style={{ width: `${scanProgress * 100}%` }} />
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              {scanMessage || "Processing..."}
            </div>
          </div>
        )}
      </section>
      
      {/* Game Grid with Groups */}
      {Object.entries(groupedItems).map(([groupName, groupItems]) => (
        <div key={groupName}>
          {groupName && (
            <section className="card" style={{ marginBottom: spacing.sm }}>
              <h3 style={{ margin: 0 }}>
                {groupName} ({groupItems.length})
              </h3>
            </section>
          )}
          
          <div className={`grid cols-${gridColumns}`} style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${Math.max(140, 320 - (gridColumns - 3) * 40)}px, 1fr))` }}>
            {/* Ghost cards for downloading items - only in first group */}
            {groupName === Object.keys(groupedItems)[0] && downloadingSlugsArray.map((slug) => (
              <DownloadingGhostCard key={`ghost-${slug}`} slug={slug} location={location} />
            ))}
            
            {/* Library items */}
            {groupItems.map(({ item, manifest }) => {
              if (!manifest) return null;
              const artifact = manifest.artifacts[0];
              const artifactPath = artifact ? joinPath(dirname(item.path), artifact.path) : item.path;
              return (
                <GameCard
                  key={item.path}
                  manifest={manifest}
                  artifactPath={artifactPath}
                  location={location}
                  platformsData={platformsQuery.data?.data}
                  onShowInFolder={() => {
                    if (window.crocdesk?.revealInFolder) {
                      window.crocdesk.revealInFolder(item.path);
                    }
                  }}
                  actions={
                    <div className="row" style={{ gap: 8 }}>
                      <Link
                        className="link"
                        to={`/library/item?dir=${encodeURIComponent(dirname(item.path))}`}
                        state={{ backgroundLocation: location }}
                      >
                        Details
                      </Link>
                      <button
                        className="secondary"
                        onClick={async () => {
                          const dir = dirname(item.path);
                          if (!confirm(`Delete this game folder?\n${dir}`)) return;
                          try {
                            const resp = await fetch(`/library/item?dir=${encodeURIComponent(dir)}`, { method: "DELETE" });
                            if (!resp.ok) throw new Error("Delete failed");
                            // Refresh list
                            const data = await apiGet<LibraryItem[]>("/library/downloads/items");
                            setItems(data);
                          } catch (e) {
                            alert(e instanceof Error ? e.message : "Delete failed");
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  }
                />
              );
            })}
          </div>
        </div>
      ))}
      
      {filteredCount === 0 && hasActiveFilters && (
        <section className="card">
          <p>No games match your filters. Try adjusting your search criteria.</p>
        </section>
      )}

      <PaginationBar
        currentPage={1}
        totalPages={1}
        onPageChange={() => {}}
        onColumnsChange={setGridColumns}
        showGridControls={true}
        storageKey="crocdesk:libraryGridColumns"
      />
    </div>
  );
}

function findManifestPath(filePath: string): string {
  // Manifest is always in the same directory as the file, named .crocdesk.json
  return joinPath(dirname(filePath), ".crocdesk.json");
}

function dirname(p: string): string {
  const idx = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  return idx >= 0 ? p.slice(0, idx) : ".";
}

function joinPath(a: string, b: string): string {
  if (a.endsWith("/") || a.endsWith("\\")) return a + b;
  return a + "/" + b;
}
