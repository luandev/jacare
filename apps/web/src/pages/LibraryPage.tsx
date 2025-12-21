import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import type { LibraryItem, Manifest } from "@crocdesk/shared";
import GameCard from "../components/GameCard";

export default function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [manifests, setManifests] = useState<Record<string, Manifest | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<LibraryItem[]>("/library/downloads/items");
        if (!cancelled) {
          setItems(data);
          // For each item, try to load its manifest
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
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="card">Loading library…</div>;
  }

  if (error) {
    return <div className="card">Error: {error}</div>;
  }

  if (items.length === 0) {
    return <div className="card">No items found in downloads.</div>;
  }

  return (
    <div className="grid cols-3">
      {items.map((item) => {
        const manifest = manifests[item.path];
        if (!manifest) return null;
        // Find artifact path relative to manifest
        const artifact = manifest.artifacts[0];
        const artifactPath = artifact ? joinPath(dirname(item.path), artifact.path) : item.path;
        return (
          <GameCard
            key={item.path}
            manifest={manifest}
            artifactPath={artifactPath}
            onShowInFolder={() => {
              if (window.crocdesk?.revealInFolder) {
                window.crocdesk.revealInFolder(item.path);
              }
            }}
          />
        );
      })}
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
