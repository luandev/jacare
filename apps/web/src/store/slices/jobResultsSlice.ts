import { create } from "zustand";
import type { JobResultsState } from "../types";

type JobResultsActions = {
  setJobResult: (jobId: string, result: { files?: string[]; slug?: string; libraryItemId?: number }) => void;
  clearJobResult: (jobId: string) => void;
  clearAll: () => void;
};

export type JobResultsStore = JobResultsState & JobResultsActions;

const initialState: JobResultsState = {
  resultByJob: {}
};

export const useJobResultsStore = create<JobResultsStore>((set) => ({
  ...initialState,
  
  setJobResult: (jobId, result) =>
    set((state) => ({
      resultByJob: { ...state.resultByJob, [jobId]: result }
    })),
  
  clearJobResult: (jobId) =>
    set((state) => {
      const { [jobId]: _, ...resultByJob } = state.resultByJob;
      return { resultByJob };
    }),
  
  clearAll: () => set(initialState)
}));



