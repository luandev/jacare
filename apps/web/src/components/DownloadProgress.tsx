import { useMemo } from "react";
import { useDownloadProgress, type SpeedDataPoint } from "../hooks/useDownloadProgress";

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
      <div className="progress" style={{ marginBottom: compact ? 6 : 8, width: "100%" }}>
        <span style={{ width: `${progressValue}%` }} />
      </div>

      <div className="row" style={{ gap: compact ? 12 : 16, marginBottom: compact ? 4 : 8, flexWrap: "wrap" }}>
        {currentSpeed > 0 && (
          <div>
            <span className="status" style={{ fontSize: compact ? 10 : 11 }}>Speed:</span>
            <strong style={{ marginLeft: 4, fontSize: compact ? 11 : 12 }}>
              {currentSpeed.toFixed(2)} MB/s
            </strong>
          </div>
        )}
        {currentBytes && (
          <div>
            <span className="status" style={{ fontSize: compact ? 10 : 11 }}>Progress:</span>
            <strong style={{ marginLeft: 4, fontSize: compact ? 11 : 12 }}>
              {(currentBytes.downloaded / MB_TO_BYTES).toFixed(2)} MB / {(currentBytes.total / MB_TO_BYTES).toFixed(2)} MB
            </strong>
          </div>
        )}
        {eta && (
          <div>
            <span className="status" style={{ fontSize: compact ? 10 : 11 }}>ETA:</span>
            <strong style={{ marginLeft: 4, fontSize: compact ? 11 : 12 }}>{eta}</strong>
          </div>
        )}
      </div>

      {showCancel && onCancel && (
        <div className="row" style={{ marginTop: compact ? 6 : 8, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            className="secondary"
            style={{ fontSize: compact ? 11 : 12, padding: compact ? "4px 8px" : "6px 12px" }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
