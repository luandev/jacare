import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, API_URL } from "../lib/api";
import type { JobEvent, JobRecord } from "@crocdesk/shared";
import PlatformIcon from "../components/PlatformIcon";
import DownloadCard from "../components/DownloadCard";
import DownloadProgress from "../components/DownloadProgress";

type JobPreview = {
  slug: string;
  title: string;
  platform: string;
  boxart_url?: string;
};
type JobWithPreview = JobRecord & { preview?: JobPreview };

export default function QueuePage() {
  const queryClient = useQueryClient();
  const [lastEvent, setLastEvent] = useState<JobEvent | null>(null);
  const [progressByJob, setProgressByJob] = useState<Record<string, number>>({});
  const [resultByJob, setResultByJob] = useState<Record<string, { files?: string[]; slug?: string; libraryItemId?: number }>>({});
  const [speedDataByJob, setSpeedDataByJob] = useState<Record<string, { bytes: number; timestamp: number }[]>>({});
  const [bytesByJob, setBytesByJob] = useState<Record<string, { downloaded: number; total: number }>>({});

  const jobsQuery = useQuery({
    queryKey: ["jobs"],
    queryFn: () => apiGet<JobWithPreview[]>("/jobs")
  });

  useEffect(() => {
    const source = new EventSource(`${API_URL}/events`);
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as JobEvent;
        setLastEvent(data);
        if (data.type === "STEP_PROGRESS") {
          if (typeof data.progress === "number") {
            setProgressByJob((prev) => ({ ...prev, [data.jobId]: data.progress ?? 0 }));
          }
          // Track byte-level progress for download speed calculation
          if (data.bytesDownloaded !== undefined && data.totalBytes !== undefined) {
            setBytesByJob((prev) => ({
              ...prev,
              [data.jobId]: { downloaded: data.bytesDownloaded!, total: data.totalBytes! }
            }));
            setSpeedDataByJob((prev) => {
              const history = prev[data.jobId] || [];
              const newHistory = [...history, { bytes: data.bytesDownloaded!, timestamp: data.ts }].slice(-30); // Keep last 30 samples
              return { ...prev, [data.jobId]: newHistory };
            });
          }
        }
        if (data.type === "JOB_DONE") {
          // Reset progress when done; details may arrive via JOB_RESULT next
          setProgressByJob((prev) => ({ ...prev, [data.jobId]: 1 }));
        }
        if (data.type === "JOB_RESULT") {
          setResultByJob((prev) => ({
            ...prev,
            [data.jobId]: { files: data.files, slug: data.slug, libraryItemId: data.libraryItemId }
          }));
        }
        // Remove completed/failed jobs from tracking
        if (data.type === "JOB_DONE" || data.type === "JOB_FAILED") {
          setSpeedDataByJob((prev) => {
            const next = { ...prev };
            delete next[data.jobId];
            return next;
          });
          setBytesByJob((prev) => {
            const next = { ...prev };
            delete next[data.jobId];
            return next;
          });
        }
        queryClient.invalidateQueries({ queryKey: ["jobs"] });
      } catch {
        // Ignore malformed SSE payloads.
      }
    };

    return () => source.close();
  }, [queryClient]);

  return (
    <div className="grid" style={{ gap: "20px" }}>
      <section className="hero">
        <h1>Queue</h1>
        <p>Track job progress from downloads, scans, and pipelines.</p>
      </section>

      <section className="card">
        <div className="row">
          <h3>Latest event</h3>
          <span className="status">{lastEvent?.type ?? "No events yet"}</span>
        </div>
        {lastEvent && (() => {
          // Find the job for this event
          const eventJob = (jobsQuery.data ?? []).find(j => j.id === lastEvent.jobId);
          const isDownloadJob = eventJob?.type === "download_and_install";
          
          if (isDownloadJob && eventJob) {
            // Show compact download preview for download jobs
            return (
              <>
                {eventJob.preview && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{eventJob.preview.title}</div>
                    <div className="status" style={{ marginTop: 2 }}>
                      {eventJob.preview.platform.toUpperCase()}
                    </div>
                  </div>
                )}
                <DownloadProgress
                  speedHistory={speedDataByJob[lastEvent.jobId] || []}
                  currentBytes={bytesByJob[lastEvent.jobId]}
                  currentProgress={progressByJob[lastEvent.jobId]}
                  compact={true}
                />
              </>
            );
          }
          
          // Default display for non-download jobs
          return (
            <>
              <div className="status">
                {lastEvent.jobId} {lastEvent.step ? `- ${lastEvent.step}` : ""}
              </div>
              {typeof lastEvent.progress === "number" && (
                <div className="progress" style={{ marginTop: "8px" }}>
                  <span style={{ width: `${lastEvent.progress * 100}%` }} />
                </div>
              )}
            </>
          );
        })()}
      </section>

      <section className="list">
        {(jobsQuery.data ?? []).map((job) => {
          const jobProgress = progressByJob[job.id];
          const jobResult = resultByJob[job.id];
          const slug = jobResult?.slug || job.preview?.slug || (job.payload?.slug as string | undefined);
          const fileLinks = jobResult?.files ?? [];
          
          // Use DownloadCard for download_and_install jobs
          if (job.type === "download_and_install") {
            return (
              <DownloadCard
                key={job.id}
                job={job}
                speedHistory={speedDataByJob[job.id] || []}
                currentBytes={bytesByJob[job.id]}
                currentProgress={jobProgress}
              />
            );
          }
          
          // Use standard card for other job types
          return (
            <article className="card" key={job.id}>
              {job.preview && (
                <div className="thumb-wrapper" style={{ float: "right", marginLeft: "12px", maxWidth: "140px" }}>
                  {job.preview.boxart_url ? (
                    <img
                      src={job.preview.boxart_url}
                      alt={`${job.preview.title} cover art`}
                      className="thumb cover-img"
                      loading="lazy"
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
                <h3>{job.type.replace(/_/g, " ")}</h3>
                <span className="badge">{job.status}</span>
              </div>
              <div className="status">Job id: {job.id}</div>
              <div className="status">Updated: {new Date(job.updatedAt).toLocaleString()}</div>
              {job.preview && (
                <div className="status" style={{ marginTop: "8px" }}>
                  {job.preview.title} • {job.preview.platform.toUpperCase()} • {job.preview.slug}
                </div>
              )}
              {job.status === "running" && typeof jobProgress === "number" && (
                <div className="progress" style={{ marginTop: 8 }}>
                  <span style={{ width: `${Math.max(0, Math.min(1, jobProgress)) * 100}%` }} />
                </div>
              )}
              {job.status === "done" && (slug || fileLinks.length > 0) && (
                <div style={{ marginTop: 12 }}>
                  {slug && (
                    <div className="row" style={{ alignItems: "center", gap: 8 }}>
                      <a className="link" href={`/game/${slug}`}>View in Browse</a>
                    </div>
                  )}
                  {fileLinks.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div className="status" style={{ marginBottom: 6 }}>Files</div>
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {fileLinks.map((p) => {
                          const href = toFileHref(p);
                          return (
                            <li key={p}>
                              <a
                                className="link"
                                href={href}
                                title={p}
                                onClick={(e) => {
                                  if (window.crocdesk?.revealInFolder) {
                                    e.preventDefault();
                                    window.crocdesk.revealInFolder(p);
                                  }
                                }}
                              >
                                {shortenPath(p)}
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}

function toFileHref(p: string): string {
  // Convert Windows paths to file:// URLs safely
  const normalized = p.replace(/\\/g, "/");
  if (/^[A-Za-z]:\//.test(normalized)) {
    return `file:///${encodeURI(normalized)}`;
  }
  return `file://${encodeURI(normalized)}`;
}

function shortenPath(p: string): string {
  // Show just the trailing segments for readability
  const parts = p.split(/\\|\//);
  if (parts.length <= 2) return p;
  return `${parts.slice(0, -2).join("/")}/…/${parts.slice(-2).join("/")}`;
}
