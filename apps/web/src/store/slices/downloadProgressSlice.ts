import { create } from "zustand";
import type { DownloadProgressState } from "../types";

type DownloadProgressActions = {
  // Job-based updates
  updateJobProgress: (jobId: string, progress: number) => void;
  updateJobSpeedData: (jobId: string, bytes: number, timestamp: number) => void;
  updateJobBytes: (jobId: string, downloaded: number, total: number) => void;
  clearJob: (jobId: string) => void;
  
  // Slug-based updates
  updateSlugProgress: (slug: string, progress: number) => void;
  updateSlugSpeedData: (slug: string, bytes: number, timestamp: number) => void;
  updateSlugBytes: (slug: string, downloaded: number, total: number) => void;
  addDownloadingSlug: (slug: string) => void;
  removeDownloadingSlug: (slug: string) => void;
  clearSlug: (slug: string) => void;
  
  // Bulk operations
  clearAll: () => void;
};

export type DownloadProgressStore = DownloadProgressState & DownloadProgressActions;

const initialState: DownloadProgressState = {
  progressByJobId: {},
  speedDataByJobId: {},
  bytesByJobId: {},
  progressBySlug: {},
  speedDataBySlug: {},
  bytesBySlug: {},
  downloadingSlugs: new Set()
};

export const useDownloadProgressStore = create<DownloadProgressStore>((set) => ({
  ...initialState,
  
  updateJobProgress: (jobId, progress) =>
    set((state) => ({
      progressByJobId: { ...state.progressByJobId, [jobId]: progress }
    })),
  
  updateJobSpeedData: (jobId, bytes, timestamp) =>
    set((state) => {
      const history = state.speedDataByJobId[jobId] || [];
      const newHistory = [...history, { bytes, timestamp }].slice(-30); // Keep last 30 samples
      return {
        speedDataByJobId: { ...state.speedDataByJobId, [jobId]: newHistory }
      };
    }),
  
  updateJobBytes: (jobId, downloaded, total) =>
    set((state) => ({
      bytesByJobId: { ...state.bytesByJobId, [jobId]: { downloaded, total } }
    })),
  
  clearJob: (jobId) =>
    set((state) => {
      const { [jobId]: _, ...progressByJobId } = state.progressByJobId;
      const { [jobId]: __, ...speedDataByJobId } = state.speedDataByJobId;
      const { [jobId]: ___, ...bytesByJobId } = state.bytesByJobId;
      return {
        progressByJobId,
        speedDataByJobId,
        bytesByJobId
      };
    }),
  
  updateSlugProgress: (slug, progress) =>
    set((state) => ({
      progressBySlug: { ...state.progressBySlug, [slug]: progress }
    })),
  
  updateSlugSpeedData: (slug, bytes, timestamp) =>
    set((state) => {
      const history = state.speedDataBySlug[slug] || [];
      const newHistory = [...history, { bytes, timestamp }].slice(-30); // Keep last 30 samples
      return {
        speedDataBySlug: { ...state.speedDataBySlug, [slug]: newHistory }
      };
    }),
  
  updateSlugBytes: (slug, downloaded, total) =>
    set((state) => ({
      bytesBySlug: { ...state.bytesBySlug, [slug]: { downloaded, total } }
    })),
  
  addDownloadingSlug: (slug) =>
    set((state) => ({
      downloadingSlugs: new Set(state.downloadingSlugs).add(slug)
    })),
  
  removeDownloadingSlug: (slug) =>
    set((state) => {
      const next = new Set(state.downloadingSlugs);
      next.delete(slug);
      return { downloadingSlugs: next };
    }),
  
  clearSlug: (slug) =>
    set((state) => {
      const { [slug]: _, ...progressBySlug } = state.progressBySlug;
      const { [slug]: __, ...speedDataBySlug } = state.speedDataBySlug;
      const { [slug]: ___, ...bytesBySlug } = state.bytesBySlug;
      const nextSlugs = new Set(state.downloadingSlugs);
      nextSlugs.delete(slug);
      return {
        progressBySlug,
        speedDataBySlug,
        bytesBySlug,
        downloadingSlugs: nextSlugs
      };
    }),
  
  clearAll: () => set(initialState)
}));




