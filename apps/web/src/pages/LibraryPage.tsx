import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PlatformIcon from "../components/PlatformIcon";
import { apiGet } from "../lib/api";
import type { LibraryItem } from "@crocdesk/shared";

export default function LibraryPage() {
  const location = useLocation();
  const [platformFilter, setPlatformFilter] = useState<string>("");

  const libraryQuery = useQuery({
    queryKey: ["library-items"],
    queryFn: () => apiGet<LibraryItem[]>("/library/items")
  });

  const platforms = useMemo(() => {
    const set = new Set<string>();
    for (const item of libraryQuery.data ?? []) {
      if (item.platform) set.add(item.platform);
    }
    return Array.from(set).sort();
  }, [libraryQuery.data]);

  const filteredItems = useMemo(() => {
    if (!platformFilter) return libraryQuery.data ?? [];
    return (libraryQuery.data ?? []).filter((item) => item.platform === platformFilter);
  }, [libraryQuery.data, platformFilter]);

  const totalSize = useMemo(() => {
    return (libraryQuery.data ?? []).reduce((sum, item) => sum + (item.size || 0), 0);
  }, [libraryQuery.data]);

  return (
    <div className="grid" style={{ gap: "20px" }}>
      <section className="hero">
        <h1>Library</h1>
        <p>Everything currently indexed in your library.</p>
      </section>

      <section className="card">
        <div className="row" style={{ alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h3>Summary</h3>
            <div className="status">{libraryQuery.data?.length ?? 0} items</div>
            <div className="status">{formatBytes(totalSize)}</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
            <label htmlFor="platform-filter" className="status">
              Platform
            </label>
            <select
              id="platform-filter"
              value={platformFilter}
              onChange={(event) => setPlatformFilter(event.target.value)}
            >
              <option value="">All</option>
              {platforms.map((platform) => (
                <option key={platform} value={platform}>
                  {platform.toUpperCase()}
                </option>
              ))}
            </select>
            <button className="secondary" type="button" onClick={() => libraryQuery.refetch()}>
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="list">
        {libraryQuery.isLoading && <div className="status">Loading library…</div>}
        {!libraryQuery.isLoading && filteredItems.length === 0 && (
          <div className="status">No items found.</div>
        )}
        {filteredItems.map((item) => (
          <article className="card" key={item.id}>
            <div className="row" style={{ alignItems: "center", gap: 12 }}>
              <div className="row" style={{ alignItems: "center", gap: 10 }}>
                <div style={{ width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.platform ? (
                    <PlatformIcon platform={item.platform} label={item.platform.toUpperCase()} size={32} />
                  ) : (
                    <div className="thumb-placeholder" style={{ width: 42, height: 42 }}>ROM</div>
                  )}
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>
                    {item.gameSlug ? (
                      <Link to={`/game/${item.gameSlug}`} state={{ backgroundLocation: location }}>
                        {item.gameSlug}
                      </Link>
                    ) : (
                      <span>{fileName(item.path)}</span>
                    )}
                  </h3>
                  <div className="status">
                    {item.platform ? item.platform.toUpperCase() : "Unlabeled"} • {item.source === "remote" ? "Downloaded" : "Local"}
                  </div>
                </div>
              </div>
              <span className="badge">{formatBytes(item.size)}</span>
            </div>

            <div className="status" style={{ marginTop: 8 }}>
              Path: {" "}
              <a
                className="link"
                href={toFileHref(item.path)}
                title={item.path}
                onClick={(e) => {
                  if (window.crocdesk?.revealInFolder) {
                    e.preventDefault();
                    window.crocdesk.revealInFolder(item.path);
                  }
                }}
              >
                {shortenPath(item.path)}
              </a>
            </div>
            <div className="status">Modified: {new Date(item.mtime).toLocaleString()}</div>
          </article>
        ))}
      </section>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes || Number.isNaN(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function fileName(p: string): string {
  const parts = p.split(/\\|\//);
  return parts[parts.length - 1] || p;
}

function shortenPath(p: string): string {
  const parts = p.split(/\\|\//);
  if (parts.length <= 3) return p;
  return `${parts.slice(0, -3).join("/")}/…/${parts.slice(-2).join("/")}`;
}

function toFileHref(p: string): string {
  const normalized = p.replace(/\\/g, "/");
  if (/^[A-Za-z]:\//.test(normalized)) {
    return `file:///${encodeURI(normalized)}`;
  }
  return `file://${encodeURI(normalized)}`;
}
