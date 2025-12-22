import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../lib/api";
import type { JobRecord } from "@crocdesk/shared";
import DownloadCard from "../components/DownloadCard";
import { useDownloadProgressStore } from "../store";
import { useSSE } from "../store/hooks/useSSE";

type JobPreview = {
  slug: string;
  title: string;
  platform: string;
  boxart_url?: string;
};
type JobWithPreview = JobRecord & { preview?: JobPreview };

export default function DownloadsPage() {
  // Ensure SSE connection is active
  useSSE();
  
  // Get progress data from store
  const progressByJobId = useDownloadProgressStore((state) => state.progressByJobId);
  const speedDataByJobId = useDownloadProgressStore((state) => state.speedDataByJobId);
  const bytesByJobId = useDownloadProgressStore((state) => state.bytesByJobId);

  const jobsQuery = useQuery({
    queryKey: ["jobs"],
    queryFn: () => apiGet<JobWithPreview[]>("/jobs")
  });

  // Filter to only active download jobs (including paused)
  const activeDownloads = useMemo(() => {
    return (jobsQuery.data ?? []).filter(
      (job) => job.type === "download_and_install" && (job.status === "running" || job.status === "queued" || job.status === "paused")
    );
  }, [jobsQuery.data]);

  if (activeDownloads.length === 0) {
    return (
      <div className="grid" style={{ gap: "20px" }}>
        <section className="hero">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1>Downloads</h1>
              <p>Active download jobs will appear here.</p>
            </div>
            <PauseResumeControls />
          </div>
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
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1>Downloads</h1>
            <p>Monitor and control active download jobs in real-time.</p>
          </div>
          <PauseResumeControls />
        </div>
      </section>

      <section className="list">
        {activeDownloads.map((job) => (
          <DownloadCard
            key={job.id}
            job={job}
            speedHistory={speedDataByJobId[job.id] || []}
            currentBytes={bytesByJobId[job.id]}
            currentProgress={progressByJobId[job.id]}
          />
        ))}
      </section>
    </div>
  );
}

function PauseResumeControls() {
  const queryClient = useQueryClient();
  const jobsQuery = useQuery({
    queryKey: ["jobs"],
    queryFn: () => apiGet<JobWithPreview[]>("/jobs")
  });

  const pauseAllMutation = useMutation({
    mutationFn: () => apiPost("/jobs/pause-all", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    }
  });

  const resumeAllMutation = useMutation({
    mutationFn: () => apiPost("/jobs/resume-all", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    }
  });

  const jobs = jobsQuery.data ?? [];
  const runningDownloads = jobs.filter(j => j.type === "download_and_install" && j.status === "running");
  const pausedDownloads = jobs.filter(j => j.type === "download_and_install" && j.status === "paused");

  if (runningDownloads.length === 0 && pausedDownloads.length === 0) {
    return null;
  }

  return (
    <div className="row" style={{ gap: 8 }}>
      {runningDownloads.length > 0 && (
        <button
          onClick={() => pauseAllMutation.mutate()}
          className="secondary"
          disabled={pauseAllMutation.isPending}
        >
          {pauseAllMutation.isPending ? "Pausing..." : `Pause All (${runningDownloads.length})`}
        </button>
      )}
      {pausedDownloads.length > 0 && (
        <button
          onClick={() => resumeAllMutation.mutate()}
          className="primary"
          disabled={resumeAllMutation.isPending}
        >
          {resumeAllMutation.isPending ? "Resuming..." : `Resume All (${pausedDownloads.length})`}
        </button>
      )}
    </div>
  );
}

