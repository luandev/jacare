import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UIState } from "../types";

type UIActions = {
  setGridColumns: (columns: number) => void;
  setStickyPlatform: (platform: string) => void;
  setStickyRegion: (region: string) => void;
};

export type UIStore = UIState & UIActions;

const initialState: UIState = {
  gridColumns: 3,
  stickyPlatform: "",
  stickyRegion: ""
};

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      ...initialState,
      
      setGridColumns: (columns) => set({ gridColumns: columns }),
      setStickyPlatform: (platform) => set({ stickyPlatform: platform }),
      setStickyRegion: (region) => set({ stickyRegion: region })
    }),
    {
      name: "crocdesk-ui-storage",
      partialize: (state) => ({
        stickyPlatform: state.stickyPlatform,
        stickyRegion: state.stickyRegion,
        gridColumns: state.gridColumns
      })
    }
  )
);
