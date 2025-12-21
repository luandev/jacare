export type CrocdbLink = {
  name: string;
  type: string;
  format: string;
  url: string;
  filename: string;
  host: string;
  size: number;
  size_str?: string;
  source_url?: string;
};

export type CrocdbEntry = {
  slug: string;
  rom_id?: string | null;
  title: string;
  platform: string;
  boxart_url?: string;
  regions: string[];
  links: CrocdbLink[];
};

export type CrocdbSearchRequest = {
  search_key?: string;
  platforms?: string[];
  regions?: string[];
  rom_id?: string;
  max_results?: number;
  page?: number;
};

export type CrocdbSearchResponseData = {
  results: CrocdbEntry[];
  current_results: number;
  total_results: number;
  current_page: number;
  total_pages: number;
};

export type CrocdbEntryResponseData = {
  entry: CrocdbEntry;
};

export type CrocdbPlatformsResponseData = {
  platforms: Record<string, { brand: string; name: string }>;
};

export type CrocdbRegionsResponseData = {
  regions: Record<string, string>;
};

export type CrocdbInfoResponseData = {
  total_entries: number;
};

export type CrocdbApiResponse<T> = {
  info: Record<string, unknown>;
  data: T;
};

export type LibraryRoot = {
  id: string;
  path: string;
  platform?: string;
};

export type Settings = {
  libraryRoots: LibraryRoot[];
  downloadDir: string;
  stagingDir?: string;
  queue?: {
    maxConcurrentDownloads?: number;
    maxConcurrentTransfers?: number;
  };
};

export type PlatformProfile = {
  root: string;
  format?: string;
  naming?: string;
};

export type Profile = {
  id: string;
  name: string;
  platforms: Record<string, PlatformProfile>;
  transferTargetId?: string;
  postActions?: {
    writeManifest?: boolean;
    writePlaylists?: boolean;
  };
};

export type ManifestArtifact = {
  path: string;
  hash?: string;
  size: number;
};

export type Manifest = {
  schema: 1;
  crocdb: {
    slug: string;
    title: string;
    platform: string;
    regions: string[];
  };
  artifacts: ManifestArtifact[];
  profileId: string;
  createdAt: string;
};

export type LibraryItem = {
  id: number;
  path: string;
  size: number;
  mtime: number;
  hash?: string | null;
  platform?: string | null;
  gameSlug?: string | null;
  source: "local" | "remote";
  deviceId?: string | null;
};

export type DeviceType = "usb" | "smb";

export type DeviceRecord = {
  id: string;
  type: DeviceType;
  path: string;
  name: string;
  volumeSerial?: string | null;
  volumeLabel?: string | null;
  lastSeenAt?: number | null;
  connected: boolean;
  createdAt: number;
  updatedAt: number;
};

export type DeviceItemRecord = {
  id: number;
  libraryItemId: number;
  deviceId: string;
  devicePath: string;
  checksum?: string | null;
  lastSeenAt?: number | null;
  status: "present" | "missing";
};

export type JobType = "scan_local" | "download_and_install" | "transfer";
export type JobStatus =
  | "queued"
  | "running"
  | "waiting-device"
  | "paused"
  | "done"
  | "failed";

export type JobRecord = {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  payload: Record<string, unknown>;
  sourceRef?: string | null;
  targetRef?: string | null;
  deviceId?: string | null;
  attempts: number;
  error?: string | null;
  createdAt: number;
  updatedAt: number;
};

export type JobStepRecord = {
  id: number;
  jobId: string;
  step: string;
  status: JobStatus;
  progress: number;
  message?: string;
  updatedAt: number;
};

export type JobEventType =
  | "JOB_CREATED"
  | "STEP_STARTED"
  | "STEP_PROGRESS"
  | "STEP_LOG"
  | "STEP_DONE"
  | "JOB_DONE"
  | "JOB_FAILED";

export type JobEvent = {
  jobId: string;
  type: JobEventType;
  step?: string;
  progress?: number;
  message?: string;
  ts: number;
};

export type DeviceStatusEvent = {
  type: "device.status";
  device: DeviceRecord;
  ts: number;
};

export type ServerEvent = JobEvent | DeviceStatusEvent;
