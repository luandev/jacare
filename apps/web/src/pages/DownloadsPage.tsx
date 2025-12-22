import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, API_URL } from "../lib/api";
import type { JobEvent, JobRecord } from "@crocdesk/shared";
import DownloadCard from "../components/DownloadCard";

type JobPreview = {
  slug: string;
  title: string;
  platform: string;
  boxart_url?: string;
};
type JobWithPreview = JobRecord & { preview?: JobPreview };

export default function DownloadsPage() {
  const queryClient = useQueryClient();
  const [speedDataByJob, setSpeedDataByJob] = useState<Record<string, { bytes: number; timestamp: number }[]>>({});
  const [bytesByJob, setBytesByJob] = useState<Record<string, { downloaded: number; total: number }>>({});
  const [progressByJob, setProgressByJob] = useState<Record<string, number>>({});

  const jobsQuery = useQuery({
    queryKey: ["jobs"],
    queryFn: () => apiGet<JobWithPreview[]>("/jobs")
  });

  // Filter to only active download jobs
  const activeDownloads = useMemo(() => {
    return (jobsQuery.data ?? []).filter(
      (job) => job.type === "download_and_install" && (job.status === "running" || job.status === "queued")
    );
  }, [jobsQuery.data]);

  useEffect(() => {
    const source = new EventSource(`${API_URL}/events`);
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as JobEvent;
        
        // Track byte-level progress for speed calculation
        if (data.type === "STEP_PROGRESS") {
          if (typeof data.progress === "number") {
            setProgressByJob((prev) => ({ ...prev, [data.jobId]: data.progress! }));
          }
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
          setProgressByJob((prev) => {
            const next = { ...prev };
            delete next[data.jobId];
            return next;
          });
        }
        
        queryClient.invalidateQueries({ queryKey: ["jobs"] });
      } catch {
        // Ignore malformed SSE payloads
      }
    };

    return () => source.close();
  }, [queryClient]);

  if (activeDownloads.length === 0) {
    return (
      <div className="grid" style={{ gap: "20px" }}>
        <section className="hero">
          <h1>Downloads</h1>
          <p>Active download jobs will appear here.</p>
        </section>
        <section className="card">
          <div className="status">No active downloads</div>
        </section>
      </div>
    );
  }

  return (
    <div className="grid" style={{ gap: "20px" }}>
      <section className="hero">
        <h1>Downloads</h1>
        <p>Monitor and control active download jobs in real-time.</p>
      </section>

      <section className="list">
        {activeDownloads.map((job) => (
          <DownloadCard
            key={job.id}
            job={job}
            speedHistory={speedDataByJob[job.id] || []}
            currentBytes={bytesByJob[job.id]}
            currentProgress={progressByJob[job.id]}
          />
        ))}
      </section>
    </div>
  );
}

