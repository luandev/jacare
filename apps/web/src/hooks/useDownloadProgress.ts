import { useMemo } from "react";

export type SpeedDataPoint = {
  bytes: number;
  timestamp: number;
};

const MB_TO_BYTES = 1048576;

export type UseDownloadProgressResult = {
  currentSpeed: number;
  eta: string | null;
  progressPercent: number;
};

export function useDownloadProgress(
  speedHistory: SpeedDataPoint[],
  currentBytes?: { downloaded: number; total: number } | null,
  currentProgress?: number
): UseDownloadProgressResult {
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

  // Calculate progress percentage
  const progressPercent = useMemo(() => {
    if (currentBytes) {
      return (currentBytes.downloaded / currentBytes.total) * 100;
    }
    return (currentProgress ?? 0) * 100;
  }, [currentBytes, currentProgress]);

  return {
    currentSpeed,
    eta,
    progressPercent
  };
}



