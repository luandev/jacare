import { create } from "zustand";
import type { SSEState } from "../types";
import type { JobEvent } from "@crocdesk/shared";
import { API_URL } from "../../lib/api";
import { useDownloadProgressStore } from "./downloadProgressSlice";
import { useJobResultsStore } from "./jobResultsSlice";

type SSEActions = {
  connect: () => void;
  disconnect: () => void;
  handleEvent: (event: JobEvent) => void;
};

export type SSEStore = SSEState & SSEActions;

const initialState: SSEState = {
  isConnected: false,
  lastEvent: null,
  eventSource: null
};

export const useSSEStore = create<SSEStore>((set, get) => ({
  ...initialState,
  
  connect: () => {
    const state = get();
    if (state.isConnected && state.eventSource) {
      return; // Already connected
    }
    
    const eventSource = new EventSource(`${API_URL}/events`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as JobEvent;
        get().handleEvent(data);
      } catch {
        // Ignore malformed SSE payloads
      }
    };
    
    eventSource.onerror = () => {
      // Connection error - will attempt to reconnect automatically
      console.warn("SSE connection error");
    };
    
    set({
      isConnected: true,
      eventSource
    });
  },
  
  disconnect: () => {
    const state = get();
    if (state.eventSource) {
      state.eventSource.close();
    }
    set({
      isConnected: false,
      eventSource: null,
      lastEvent: null
    });
  },
  
  handleEvent: (event: JobEvent) => {
    // Update last event
    set({ lastEvent: event });
    
    const progressStore = useDownloadProgressStore.getState();
    const resultsStore = useJobResultsStore.getState();
    
    // Handle STEP_PROGRESS events
    if (event.type === "STEP_PROGRESS") {
      if (typeof event.progress === "number") {
        if (event.jobId) {
          progressStore.updateJobProgress(event.jobId, event.progress);
        }
        if (event.slug) {
          progressStore.updateSlugProgress(event.slug, event.progress);
          progressStore.addDownloadingSlug(event.slug);
        }
      }
      
      // Track byte-level progress for speed calculation
      if (event.bytesDownloaded !== undefined && event.totalBytes !== undefined) {
        if (event.jobId) {
          progressStore.updateJobBytes(event.jobId, event.bytesDownloaded, event.totalBytes);
          progressStore.updateJobSpeedData(event.jobId, event.bytesDownloaded, event.ts);
        }
        if (event.slug) {
          progressStore.updateSlugBytes(event.slug, event.bytesDownloaded, event.totalBytes);
          progressStore.updateSlugSpeedData(event.slug, event.bytesDownloaded, event.ts);
        }
      }
    }
    
    // Handle JOB_RESULT events
    if (event.type === "JOB_RESULT") {
      if (event.jobId) {
        resultsStore.setJobResult(event.jobId, {
          files: event.files,
          slug: event.slug,
          libraryItemId: event.libraryItemId
        });
      }
    }
    
    // Handle JOB_DONE events
    if (event.type === "JOB_DONE") {
      if (event.jobId) {
        progressStore.updateJobProgress(event.jobId, 1);
      }
      if (event.slug) {
        progressStore.updateSlugProgress(event.slug, 1);
      }
    }
    
    // Handle JOB_DONE and JOB_FAILED - cleanup
    if (event.type === "JOB_DONE" || event.type === "JOB_FAILED") {
      if (event.jobId) {
        progressStore.clearJob(event.jobId);
      }
      if (event.slug) {
        progressStore.removeDownloadingSlug(event.slug);
        progressStore.clearSlug(event.slug);
      }
      
      // Invalidate React Query cache
      // Note: We need to get queryClient from context, but Zustand doesn't have direct access
      // We'll handle this in the hook that uses the store
    }
  }
}));
