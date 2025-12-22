import { useMemo, useCallback, memo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "../lib/api";
import type { JobRecord } from "@crocdesk/shared";
import SpeedChart from "./SpeedChart";
import { useDownloadProgress } from "../hooks/useDownloadProgress";
import DownloadProgress from "./DownloadProgress";

type JobPreview = {
  slug: string;
  title: string;
  platform: string;
  boxart_url?: string;
};
type JobWithPreview = JobRecord & { preview?: JobPreview };

import type { SpeedDataPoint } from "../hooks/useDownloadProgress";

const MB_TO_BYTES = 1048576;

export type DownloadCardProps = {
  job: JobWithPreview;
  speedHistory: SpeedDataPoint[];
  currentBytes?: { downloaded: number; total: number };
  currentProgress?: number;
};

function DownloadCard({ job, speedHistory, currentBytes: propCurrentBytes, currentProgress: propCurrentProgress }: DownloadCardProps) {
  const queryClient = useQueryClient();
  const currentBytes = propCurrentBytes || null;
  const currentProgress = propCurrentProgress ?? 0;

  // Use shared hook for calculations
  const { currentSpeed, eta } = useDownloadProgress(speedHistory, currentBytes, currentProgress);

  // Calculate speeds array for chart (MB/s over time)
  const speeds = useMemo(() => {
    if (speedHistory.length < 2) return [];
    
    const speeds: number[] = [];
    for (let i = 1; i < speedHistory.length; i++) {
      const prev = speedHistory[i - 1];
      const curr = speedHistory[i];
      const timeDelta = (curr.timestamp - prev.timestamp) / 1000;
      const bytesDelta = curr.bytes - prev.bytes;
      
      if (timeDelta > 0) {
        speeds.push((bytesDelta / timeDelta) / MB_TO_BYTES);
      }
    }
    return speeds;
  }, [speedHistory]);


  const cancelMutation = useMutation({
    mutationFn: () => apiPost(`/jobs/${job.id}/cancel`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    }
  });

  const pauseMutation = useMutation({
    mutationFn: () => apiPost(`/jobs/${job.id}/pause`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    }
  });

  const resumeMutation = useMutation({
    mutationFn: () => apiPost(`/jobs/${job.id}/resume`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    }
  });

  const handleCancel = useCallback(() => {
    if (confirm(`Cancel download: ${job.preview?.title || job.id}?`)) {
      cancelMutation.mutate();
    }
  }, [job, cancelMutation]);

  const handlePause = useCallback(() => {
    pauseMutation.mutate();
  }, [pauseMutation]);

  const handleResume = useCallback(() => {
    resumeMutation.mutate();
  }, [resumeMutation]);

  const preview = job.preview;

  return (
    <article className="card">
      <div className="row" style={{ gap: 16, alignItems: "flex-start" }}>
        {preview?.boxart_url && (
          <div className="thumb-wrapper" style={{ width: 80, flexShrink: 0 }}>
            <img
              src={preview.boxart_url}
              alt={`${preview.title} cover`}
              className="cover-img"
              style={{ width: 80, height: 106 }}
            />
          </div>
        )}
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row" style={{ marginBottom: 8 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16 }}>{preview?.title || job.id}</h3>
              {preview?.platform && (
                <div className="status" style={{ marginTop: 4 }}>
                  {preview.platform.toUpperCase()}
                </div>
              )}
            </div>
            <span className="badge">{job.status}</span>
          </div>

          <DownloadProgress
            speedHistory={speedHistory}
            currentBytes={currentBytes}
            currentProgress={currentProgress}
          />

          <SpeedChart speeds={speeds} />

          <div className="row" style={{ marginTop: 12, justifyContent: "flex-end", gap: 8 }}>
            {job.status === "paused" ? (
              <button
                onClick={handleResume}
                className="primary"
                disabled={resumeMutation.isPending}
              >
                {resumeMutation.isPending ? "Resuming..." : "Resume"}
              </button>
            ) : job.status === "running" ? (
              <button
                onClick={handlePause}
                className="secondary"
                disabled={pauseMutation.isPending}
              >
                {pauseMutation.isPending ? "Pausing..." : "Pause"}
              </button>
            ) : null}
            <button
              onClick={handleCancel}
              className="secondary"
              disabled={cancelMutation.isPending || (job.status !== "running" && job.status !== "paused")}
            >
              {cancelMutation.isPending ? "Cancelling..." : "Cancel"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default memo(DownloadCard);
