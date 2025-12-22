import { useMemo, useCallback, memo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "../lib/api";
import type { JobRecord, Settings } from "@crocdesk/shared";
import SpeedChart from "./SpeedChart";
import { useDownloadProgress } from "../hooks/useDownloadProgress";
import DownloadProgress from "./DownloadProgress";
import type { SpeedDataPoint } from "../hooks/useDownloadProgress";
import { useDownloadProgressStore } from "../store";
import { Card, Button, Badge } from "./ui";
import { spacing } from "../lib/design-tokens";
import { getPlatformLabel } from "../lib/platforms";

type JobPreview = {
  slug: string;
  title: string;
  platform: string;
  boxart_url?: string;
};
type JobWithPreview = JobRecord & { preview?: JobPreview };

const MB_TO_BYTES = 1048576;

export type DownloadCardProps = {
  job: JobWithPreview;
  speedHistory: SpeedDataPoint[];
  currentBytes?: { downloaded: number; total: number };
  currentProgress?: number;
  settings?: Settings;
};

function DownloadCard({ job, speedHistory: propSpeedHistory, currentBytes: propCurrentBytes, currentProgress: propCurrentProgress, settings }: DownloadCardProps) {
  const queryClient = useQueryClient();
  
  // Get progress data from store if not provided via props
  const speedDataByJobId = useDownloadProgressStore((state) => state.speedDataByJobId);
  const bytesByJobId = useDownloadProgressStore((state) => state.bytesByJobId);
  const progressByJobId = useDownloadProgressStore((state) => state.progressByJobId);
  
  // Use props if provided, otherwise fall back to store
  const speedHistory = propSpeedHistory.length > 0 ? propSpeedHistory : (speedDataByJobId[job.id] || []);
  const currentBytes = propCurrentBytes ?? bytesByJobId[job.id] ?? null;
  const currentProgress = propCurrentProgress ?? progressByJobId[job.id] ?? 0;

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
  const platformLabel = preview ? getPlatformLabel(preview.platform, { settings }) : "";

  return (
    <Card>
      <div className="row" style={{ gap: spacing.lg, alignItems: "flex-start" }}>
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
          <div className="row" style={{ marginBottom: spacing.sm }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16 }}>{preview?.title || job.id}</h3>
              {preview?.platform && (
                <div className="status" style={{ marginTop: spacing.xs }}>
                  {platformLabel}
                </div>
              )}
            </div>
            <Badge>{job.status}</Badge>
          </div>

          <DownloadProgress
            speedHistory={speedHistory}
            currentBytes={currentBytes}
            currentProgress={currentProgress}
          />

          <SpeedChart speeds={speeds} />

          <div className="row" style={{ marginTop: spacing.md, justifyContent: "flex-end", gap: spacing.sm }}>
            {job.status === "paused" ? (
              <Button
                onClick={handleResume}
                disabled={resumeMutation.isPending}
              >
                {resumeMutation.isPending ? "Resuming..." : "Resume"}
              </Button>
            ) : job.status === "running" ? (
              <Button
                variant="secondary"
                onClick={handlePause}
                disabled={pauseMutation.isPending}
              >
                {pauseMutation.isPending ? "Pausing..." : "Pause"}
              </Button>
            ) : null}
            <Button
              variant="secondary"
              onClick={handleCancel}
              disabled={cancelMutation.isPending || (job.status !== "running" && job.status !== "paused")}
            >
              {cancelMutation.isPending ? "Cancelling..." : "Cancel"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default memo(DownloadCard);
