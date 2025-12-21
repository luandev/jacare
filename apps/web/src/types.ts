import type { JobRecord } from "@crocdesk/shared";

export type JobPreview = {
  slug: string;
  title: string;
  platform: string;
  boxart_url?: string;
};

export type JobWithPreview = JobRecord & { preview?: JobPreview };
