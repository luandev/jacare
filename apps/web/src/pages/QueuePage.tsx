import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, API_URL } from "../lib/api";
import type { JobEvent, JobRecord } from "@crocdesk/shared";

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
        {lastEvent && (
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
        )}
      </section>

      <section className="list">
        {(jobsQuery.data ?? []).map((job) => (
          <article className="card" key={job.id}>
            {job.preview?.boxart_url && (
              <img
                src={job.preview.boxart_url}
                alt={`${job.preview.title} cover art`}
                className="thumb"
                loading="lazy"
                style={{ width: "100%", maxWidth: "140px", aspectRatio: "3 / 4", objectFit: "cover", borderRadius: "8px", float: "right", marginLeft: "12px" }}
              />
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
          </article>
        ))}
      </section>
    </div>
  );
}
