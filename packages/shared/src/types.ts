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
  screenshots?: string[];
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

// Generic metadata provider interface
export type SourceProvider = "crocdb" | "myrient";

export type ProviderPlatform = {
  id: string;
  name: string;
  brand?: string;
  collection?: string; // e.g., "No-Intro", "Redump"
};

export type ProviderEntry = {
  id: string; // Unique identifier for this entry (slug, filename, etc.)
  title: string;
  platform: string;
  regions: string[];
  filename?: string;
  size?: number;
  url?: string;
  metadata?: Record<string, unknown>; // Provider-specific additional data
};

export type ProviderSearchRequest = {
  query?: string;
  platforms?: string[];
  regions?: string[];
  collection?: string;
  maxResults?: number;
  page?: number;
};

export type ProviderSearchResponse = {
  results: ProviderEntry[];
  total: number;
  page: number;
  totalPages: number;
};

export type ProviderListRequest = {
  platform: string;
  collection?: string;
  page?: number;
  limit?: number;
};

// Metadata provider interface that all providers must implement
export interface IMetadataProvider {
  listPlatforms(): Promise<ProviderPlatform[]>;
  listEntries(request: ProviderListRequest): Promise<ProviderSearchResponse>;
  search(request: ProviderSearchRequest): Promise<ProviderSearchResponse>;
  getEntry(id: string): Promise<ProviderEntry | null>;
}

export type Settings = {
  /**
   * Directory where temporary zip files are downloaded.
   * Zip files are deleted after extraction.
   */
  downloadDir: string;
  /**
   * Root directory where extracted game files are stored.
   * All scanning and library operations work from this root.
   */
  libraryDir: string;
  queue?: {
    concurrency?: number;
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
};

export type JobType = "scan_local" | "download_and_install";
export type JobStatus = "queued" | "running" | "paused" | "done" | "failed";

export type JobRecord = {
  id: string;
  type: JobType;
  status: JobStatus;
  payload: Record<string, unknown>;
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
  | "JOB_FAILED"
  // Emitted with additional payload when a job produces artifacts/results
  | "JOB_RESULT";

export type JobEvent = {
  jobId: string;
  type: JobEventType;
  step?: string;
  progress?: number;
  message?: string;
  // Optional result and linkage details
  files?: string[];
  slug?: string;
  libraryItemId?: number;
  // Byte-level progress for download speed calculation
  bytesDownloaded?: number;
  totalBytes?: number;
  ts: number;
};
