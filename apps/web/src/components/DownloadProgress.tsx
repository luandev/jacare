import { useMemo } from "react";
import { useDownloadProgress, type SpeedDataPoint } from "../hooks/useDownloadProgress";
import { spacing, radius } from "../lib/design-tokens";
import { Button } from "./ui";

const MB_TO_BYTES = 1048576;

export type DownloadProgressProps = {
  speedHistory: SpeedDataPoint[];
  currentBytes?: { downloaded: number; total: number } | null;
  currentProgress?: number;
  onCancel?: () => void;
  showCancel?: boolean;
  compact?: boolean;
};

export default function DownloadProgress({
  speedHistory,
  currentBytes,
  currentProgress,
  onCancel,
  showCancel = false,
  compact = false
}: DownloadProgressProps) {
  const { currentSpeed, eta, progressPercent } = useDownloadProgress(
    speedHistory,
    currentBytes,
    currentProgress
  );

  const progressValue = Math.max(0, Math.min(100, progressPercent));

  return (
    <div style={{ width: "100%" }}>
      <div className="progress" style={{ marginBottom: compact ? spacing.xs : spacing.sm, width: "100%" }}>
        <span style={{ width: `${progressValue}%` }} />
      </div>

      <div className="row" style={{ gap: compact ? spacing.md : spacing.lg, marginBottom: compact ? spacing.xs : spacing.sm, flexWrap: "wrap" }}>
        {currentSpeed > 0 && (
          <div>
            <span className="status" style={{ fontSize: compact ? "10px" : "11px" }}>Speed:</span>
            <strong style={{ marginLeft: spacing.xs, fontSize: compact ? "11px" : "12px" }}>
              {currentSpeed.toFixed(2)} MB/s
            </strong>
          </div>
        )}
        {currentBytes && (
          <div>
            <span className="status" style={{ fontSize: compact ? "10px" : "11px" }}>Progress:</span>
            <strong style={{ marginLeft: spacing.xs, fontSize: compact ? "11px" : "12px" }}>
              {(currentBytes.downloaded / MB_TO_BYTES).toFixed(2)} MB / {(currentBytes.total / MB_TO_BYTES).toFixed(2)} MB
            </strong>
          </div>
        )}
        {eta && (
          <div>
            <span className="status" style={{ fontSize: compact ? "10px" : "11px" }}>ETA:</span>
            <strong style={{ marginLeft: spacing.xs, fontSize: compact ? "11px" : "12px" }}>{eta}</strong>
          </div>
        )}
      </div>

      {showCancel && onCancel && (
        <div className="row" style={{ marginTop: compact ? spacing.xs : spacing.sm, justifyContent: "flex-end" }}>
          <Button
            variant="secondary"
            size={compact ? "sm" : "md"}
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
