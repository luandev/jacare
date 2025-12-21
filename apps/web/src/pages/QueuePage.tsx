import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, API_URL } from "../lib/api";
import type { JobRecord, ServerEvent } from "@crocdesk/shared";

type JobWithPreview = JobRecord & {
  preview?: {
    title?: string;
    platform?: string;
    region?: string;
  };
};

function PlatformIcon({ platform }: { platform?: string }) {
  if (!platform) {
    return <span className="badge">?</span>;
  }

  return <span className="badge">{platform.toUpperCase()}</span>;
}

export default function QueuePage() {
  const queryClient = useQueryClient();
  const [lastEvent, setLastEvent] = useState<ServerEvent | null>(null);

  const jobsQuery = useQuery({
    queryKey: ["jobs"],
    queryFn: () => apiGet<JobWithPreview[]>("/jobs")
  });

  useEffect(() => {
    const source = new EventSource(`${API_URL}/events`);
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ServerEvent;
        setLastEvent(data);
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
        {lastEvent && "jobId" in lastEvent && (
          <>
            <div className="status">
              {lastEvent.jobId} {"step" in lastEvent && lastEvent.step ? `- ${lastEvent.step}` : ""}
            </div>
            {"progress" in lastEvent && typeof lastEvent.progress === "number" && (
              <div className="progress" style={{ marginTop: "8px" }}>
                <span style={{ width: `${(lastEvent.progress ?? 0) * 100}%` }} />
              </div>
            )}
          </>
        )}
        {lastEvent && lastEvent.type === "device.status" && (
          <div className="status">
            {lastEvent.device.name} is {lastEvent.device.connected ? "connected" : "disconnected"}
          </div>
        )}
      </section>

      <section className="list">
        {(jobsQuery.data ?? []).map((job) => (
          <article className="card" key={job.id}>
            <div className="row">
              <h3>{job.type.replace(/_/g, " ")}</h3>
              <span className="badge">{job.status}</span>
            </div>
            <div className="status">Job id: {job.id}</div>
            <div className="status">Updated: {new Date(job.updatedAt).toLocaleString()}</div>
            {job.preview && (
              <div className="row" style={{ gap: "10px", alignItems: "center", marginTop: "8px" }}>
                <PlatformIcon platform={job.preview.platform} />
                <div>
                  <div className="status">{job.preview.title ?? "Pending metadata"}</div>
                  {job.preview.region && <div className="status">{job.preview.region}</div>}
                </div>
              </div>
            )}
            <div className="progress" style={{ marginTop: "8px" }}>
              <span style={{ width: `${(job.progress ?? 0) * 100}%` }} />
            </div>
            {job.deviceId && <div className="status">Device: {job.deviceId}</div>}
            {job.error && <div className="status">Error: {job.error}</div>}
          </article>
        ))}
      </section>
    </div>
  );
}
