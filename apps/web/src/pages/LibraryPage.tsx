import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LibraryItem, JobEvent } from "@crocdesk/shared";
import PlatformIcon from "../components/PlatformIcon";
import { API_URL, apiGet } from "../lib/api";
import type { JobWithPreview } from "../types";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function LibraryPage() {
  const queryClient = useQueryClient();
  const [jobProgress, setJobProgress] = useState<Record<string, number>>({});

  const libraryQuery = useQuery({
    queryKey: ["library-items"],
    queryFn: () => apiGet<LibraryItem[]>("/library/items")
  });

  const jobsQuery = useQuery({
    queryKey: ["jobs"],
    queryFn: () => apiGet<JobWithPreview[]>("/jobs")
  });

  useEffect(() => {
    const source = new EventSource(`${API_URL}/events`);
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as JobEvent;
        if (typeof data.progress === "number") {
          setJobProgress((prev) => ({ ...prev, [data.jobId]: data.progress }));
        }
        queryClient.invalidateQueries({ queryKey: ["jobs"] });
        queryClient.invalidateQueries({ queryKey: ["library-items"] });
      } catch {
        // Ignore malformed SSE payloads.
      }
    };

    return () => source.close();
  }, [queryClient]);

  const downloadingJobs = useMemo(
    () =>
      (jobsQuery.data ?? []).filter(
        (job) =>
          job.type === "download_and_install" &&
          (job.status === "queued" || job.status === "running")
      ),
    [jobsQuery.data]
  );

  const libraryItems = useMemo(() => {
    return (libraryQuery.data ?? []).slice().sort((a, b) => {
      const platformA = a.platform ?? "";
      const platformB = b.platform ?? "";
      if (platformA === platformB) {
        return a.path.localeCompare(b.path);
      }
      return platformA.localeCompare(platformB);
    });
  }, [libraryQuery.data]);

  return (
    <div className="grid" style={{ gap: "20px" }}>
      <section className="hero">
        <h1>Library</h1>
        <p>See everything you own and track downloads in progress.</p>
      </section>

      <section className="card">
        <div className="row">
          <h3>Downloading</h3>
          <span className="status">
            {downloadingJobs.length ? `${downloadingJobs.length} active` : "No active downloads"}
          </span>
        </div>
        <div className="list">
          {downloadingJobs.length === 0 && (
            <div className="status">No downloads are running right now.</div>
          )}
          {downloadingJobs.map((job) => {
            const progress = jobProgress[job.id] ?? (job.status === "running" ? 0 : undefined);
            return (
              <article className="card" key={job.id}>
                {job.preview && (
                  <div className="thumb-wrapper" style={{ float: "right", marginLeft: "12px", maxWidth: "140px" }}>
                    {job.preview.boxart_url ? (
                      <img
                        src={job.preview.boxart_url}
                        alt={`${job.preview.title} cover art`}
                        className="thumb"
                        loading="lazy"
                        style={{ width: "100%", aspectRatio: "3 / 4", objectFit: "cover", borderRadius: "8px" }}
                      />
                    ) : (
                      <div className="thumb-placeholder">
                        <PlatformIcon platform={job.preview.platform} label={job.preview.platform.toUpperCase()} size={34} />
                      </div>
                    )}
                    <div className="platform-badge" title={job.preview.platform.toUpperCase()}>
                      <PlatformIcon platform={job.preview.platform} label={job.preview.platform.toUpperCase()} size={22} />
                    </div>
                  </div>
                )}
                <div className="row">
                  <h3>{job.preview?.title ?? job.id}</h3>
                  <span className="badge">{job.status}</span>
                </div>
                <div className="status">Job id: {job.id}</div>
                {job.preview && (
                  <div className="status" style={{ marginTop: "4px" }}>
                    {job.preview.slug} • {job.preview.platform.toUpperCase()}
                  </div>
                )}
                {typeof progress === "number" && (
                  <div className="progress" style={{ marginTop: "8px" }}>
                    <span style={{ width: `${Math.min(1, Math.max(0, progress)) * 100}%` }} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="row" style={{ marginBottom: "12px" }}>
          <h3>Ready to play</h3>
          <span className="status">{libraryItems.length} items</span>
        </div>
        <div className="list">
          {libraryItems.length === 0 && (
            <div className="status">No games in your library yet. Start a download to fill it.</div>
          )}
          {libraryItems.map((item) => (
            <article className="card" key={item.id}>
              <div className="row">
                <div>
                  <div className="status">
                    {item.platform ? item.platform.toUpperCase() : "Unknown platform"}
                  </div>
                  <h3>{item.gameSlug ?? item.path.split("/").pop()}</h3>
                </div>
                <span className="badge">{item.source === "remote" ? "Downloaded" : "Local"}</span>
              </div>
              <div className="status">Path: {item.path}</div>
              <div className="status">Size: {formatSize(item.size)}</div>
              <div className="status">Updated: {new Date(item.mtime).toLocaleString()}</div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
