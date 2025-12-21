import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import type { LibraryItem } from "@crocdesk/shared";

export default function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<LibraryItem[]>("/library/downloads/items");
        if (!cancelled) {
          setItems(data);
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
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Library</h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {items.map((item) => (
          <li key={item.id} style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div style={{ maxWidth: "70%" }}>
                <div style={{ fontWeight: 600 }}>{basename(item.path)}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{item.path}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12 }}>{item.platform ?? "unknown"}</div>
                <div style={{ fontSize: 12 }}>{formatSize(item.size)}</div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function basename(p: string): string {
  const idx = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  return idx >= 0 ? p.slice(idx + 1) : p;
}

function formatSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"]; 
  let i = 0; 
  let n = bytes; 
  while (n >= 1024 && i < units.length - 1) { 
    n /= 1024; 
    i++; 
  } 
  return `${n.toFixed(1)} ${units[i]}`;
}
