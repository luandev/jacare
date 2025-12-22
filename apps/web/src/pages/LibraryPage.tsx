import { useEffect, useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiGet, apiPost } from "../lib/api";
import type { LibraryItem, Manifest } from "@crocdesk/shared";
import GameCard from "../components/GameCard";
import PaginationBar from "../components/PaginationBar";
import { DownloadingGhostCard } from "../components/DownloadingGhostCard";
import { useDownloadProgressStore } from "../store";
import { useSSE } from "../store/hooks/useSSE";
import { useSettings } from "../hooks/useSettings";

export default function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [manifests, setManifests] = useState<Record<string, Manifest | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [gridColumns, setGridColumns] = useState(3);
  
  // Ensure SSE connection is active
  useSSE();

  const settingsQuery = useSettings();
  
  // Get downloading slugs from store
  const downloadingSlugs = useDownloadProgressStore((state) => state.downloadingSlugs);
  
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

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await apiGet<LibraryItem[]>("/library/downloads/items");
        if (!cancelled) {
          setItems(data);
          const manifestMap: Record<string, Manifest | null> = {};
          await Promise.all(
            data.map(async (item) => {
              const manifestPath = findManifestPath(item.path);
              try {
                const manifest = await apiGet<Manifest>(`/file?path=${encodeURIComponent(manifestPath)}`);
                manifestMap[item.path] = manifest;
              } catch {
                manifestMap[item.path] = null;
              }
            })
          );
          setManifests(manifestMap);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load library");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleScan() {
    setStatus("Scanning...");
    try {
      await apiPost("/library/scan/local", {});
      setStatus("Scan job queued");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Scan failed");
    }
  }
  
  const location = useLocation();
  
  if (loading) {
    return <div className="card">Loading library…</div>;
  }

  if (error) {
    return <div className="card">Error: {error}</div>;
  }
  
  if (items.length === 0 && downloadingSlugsArray.length === 0) {
    return (
      <div className="grid" style={{ gap: 20 }}>
        <section className="card">
          <div className="row">
            <h3>Library</h3>
            <div className="row" style={{ gap: 8 }}>
              <button className="secondary" type="button" onClick={handleScan}>Scan Local Library</button>
              {status && <span className="status">{status}</span>}
            </div>
          </div>
        </section>
        <div className="card">No items found in library.</div>
      </div>
    );
  }

  return (
    <div className="grid" style={{ gap: 20 }}>
      <section className="hero">
        <h1>Local Library</h1>
        <p>Manage your locally downloaded games and their manifests.</p>
      </section>
      <section className="card">
        <div className="row">
          <div className="row" style={{ gap: 8 }}>
              <button className="secondary" type="button" onClick={handleScan}>Scan Local Library</button>
            {status && <span className="status">{status}</span>}
          </div>
        </div>
      </section>
      <div className={`grid cols-${gridColumns}`} style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${Math.max(140, 320 - (gridColumns - 3) * 40)}px, 1fr))` }}>
        {/* Ghost cards for downloading items */}
        {downloadingSlugsArray.map((slug) => (
          <DownloadingGhostCard key={`ghost-${slug}`} slug={slug} location={location} />
        ))}
        
        {/* Actual library items */}
        {items.map((item) => {
          const manifest = manifests[item.path];
          if (!manifest) return null;
          const artifact = manifest.artifacts[0];
          const artifactPath = artifact ? joinPath(dirname(item.path), artifact.path) : item.path;
          return (
            <GameCard
              key={item.path}
              manifest={manifest}
              artifactPath={artifactPath}
              settings={settingsQuery.data}
              location={location}
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
