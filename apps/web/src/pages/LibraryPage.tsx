import { useEffect, useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiGet, apiPost } from "../lib/api";
import type { LibraryItem, Manifest, JobEvent } from "@crocdesk/shared";
import GameCard from "../components/GameCard";
import PaginationBar from "../components/PaginationBar";
import { DownloadingGhostCard } from "../components/DownloadingGhostCard";
import { ErrorAlert } from "../components/ErrorAlert";
import { useDownloadProgressStore, useSSEStore } from "../store";
import { useSSE } from "../store/hooks/useSSE";

export default function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [manifests, setManifests] = useState<Record<string, Manifest | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [gridColumns, setGridColumns] = useState(3);
  const [scanJobId, setScanJobId] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanMessage, setScanMessage] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  
  // Ensure SSE connection is active
  useSSE();
  
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
          const errorMessage = e instanceof Error ? e.message : "Failed to load library";
          setError(errorMessage);
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

  return (
    <div className="grid" style={{ gap: 20 }}>
      <section className="hero">
        <h1>Local Library</h1>
        <p>Manage your locally downloaded games and their manifests.</p>
      </section>
      <section className="card">
        <div className="row">
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
