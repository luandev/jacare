import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, API_URL } from "../lib/api";
import type { JobRecord, ServerEvent } from "@crocdesk/shared";

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
              <h3>{job.type.replace(/_/g, " ")}</h3>
              <span className="badge">{job.status}</span>
            </div>
            <div className="status">Job id: {job.id}</div>
            <div className="status">Updated: {new Date(job.updatedAt).toLocaleString()}</div>
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
