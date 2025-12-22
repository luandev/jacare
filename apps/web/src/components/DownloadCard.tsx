import { useMemo, useCallback, memo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "../lib/api";
import type { JobRecord } from "@crocdesk/shared";
import SpeedChart from "./SpeedChart";

type JobPreview = {
  slug: string;
  title: string;
  platform: string;
  boxart_url?: string;
};
type JobWithPreview = JobRecord & { preview?: JobPreview };

type SpeedDataPoint = {
  bytes: number;
  timestamp: number;
};

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

  // Calculate current speed (MB/s) from recent history
  const currentSpeed = useMemo(() => {
    if (speedHistory.length < 2) return 0;
    
    const recent = speedHistory.slice(-5); // Use last 5 samples for speed calculation
    if (recent.length < 2) return 0;
    
    const first = recent[0];
    const last = recent[recent.length - 1];
    const timeDelta = (last.timestamp - first.timestamp) / 1000; // seconds
    const bytesDelta = last.bytes - first.bytes;
    
    if (timeDelta <= 0) return 0;
    
    const bytesPerSecond = bytesDelta / timeDelta;
    return bytesPerSecond / MB_TO_BYTES; // Convert to MB/s
  }, [speedHistory]);

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

  // Calculate ETA
  const eta = useMemo(() => {
    if (!currentBytes || currentSpeed <= 0) return null;
    
    const remainingBytes = currentBytes.total - currentBytes.downloaded;
    const secondsRemaining = remainingBytes / (currentSpeed * MB_TO_BYTES);
    
    if (secondsRemaining < 0 || !isFinite(secondsRemaining)) return null;
    
    if (secondsRemaining < 60) {
      return `${Math.round(secondsRemaining)}s`;
    } else if (secondsRemaining < 3600) {
      return `${Math.round(secondsRemaining / 60)}m`;
    } else {
      const hours = Math.floor(secondsRemaining / 3600);
      const minutes = Math.round((secondsRemaining % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }, [currentBytes, currentSpeed]);


  const cancelMutation = useMutation({
    mutationFn: () => apiPost(`/jobs/${job.id}/cancel`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    }
  });

  const handleCancel = useCallback(() => {
    if (confirm(`Cancel download: ${job.preview?.title || job.id}?`)) {
      cancelMutation.mutate();
    }
  }, [job, cancelMutation]);

  const preview = job.preview;
  const progressPercent = currentBytes
    ? (currentBytes.downloaded / currentBytes.total) * 100
    : currentProgress * 100;

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

          <div className="progress" style={{ marginBottom: 8, width: "100%" }}>
            <span style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }} />
          </div>

          <div className="row" style={{ gap: 16, marginBottom: 8, flexWrap: "wrap" }}>
            {currentSpeed > 0 && (
              <div>
                <span className="status" style={{ fontSize: 11 }}>Speed:</span>
                <strong style={{ marginLeft: 4 }}>{currentSpeed.toFixed(2)} MB/s</strong>
              </div>
            )}
            {currentBytes && (
              <div>
                <span className="status" style={{ fontSize: 11 }}>Progress:</span>
                <strong style={{ marginLeft: 4 }}>
                  {(currentBytes.downloaded / MB_TO_BYTES).toFixed(2)} MB / {(currentBytes.total / MB_TO_BYTES).toFixed(2)} MB
                </strong>
              </div>
            )}
            {eta && (
              <div>
                <span className="status" style={{ fontSize: 11 }}>ETA:</span>
                <strong style={{ marginLeft: 4 }}>{eta}</strong>
              </div>
            )}
          </div>

          <SpeedChart speeds={speeds} />

          <div className="row" style={{ marginTop: 12, justifyContent: "flex-end" }}>
            <button
              onClick={handleCancel}
              className="secondary"
              disabled={cancelMutation.isPending || job.status !== "running"}
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
