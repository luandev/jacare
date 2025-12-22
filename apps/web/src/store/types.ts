import type { JobEvent } from "@crocdesk/shared";

export type SpeedDataPoint = {
  bytes: number;
  timestamp: number;
};

export type DownloadProgressState = {
  // Progress tracking by jobId
  progressByJobId: Record<string, number>;
  speedDataByJobId: Record<string, SpeedDataPoint[]>;
  bytesByJobId: Record<string, { downloaded: number; total: number }>;
  
  // Progress tracking by slug
  progressBySlug: Record<string, number>;
  speedDataBySlug: Record<string, SpeedDataPoint[]>;
  bytesBySlug: Record<string, { downloaded: number; total: number }>;
  downloadingSlugs: Set<string>;
};

export type SSEState = {
  isConnected: boolean;
  lastEvent: JobEvent | null;
  eventSource: EventSource | null;
};

export type JobResultsState = {
  resultByJob: Record<string, { files?: string[]; slug?: string; libraryItemId?: number }>;
};

export type UIState = {
  gridColumns: number;
  stickyPlatform: string;
  stickyRegion: string;
  theme: "light" | "dark";
};
