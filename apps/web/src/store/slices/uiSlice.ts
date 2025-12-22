import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UIState } from "../types";

type UIActions = {
  setGridColumns: (columns: number) => void;
  setStickyPlatform: (platform: string) => void;
  setStickyRegion: (region: string) => void;
  setTheme: (theme: "light" | "dark") => void;
};

export type UIStore = UIState & UIActions;

// Detect system theme preference
function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Get initial theme: use saved preference or detect system preference
function getInitialTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  
  // Check if we have a saved preference
  const saved = localStorage.getItem("crocdesk-ui-storage");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.state?.theme) {
        return parsed.state.theme;
      }
    } catch {
      // If parsing fails, fall through to system detection
    }
  }
  
  // No saved preference, use system preference
  return getSystemTheme();
}

const initialState: UIState = {
  gridColumns: 3,
  stickyPlatform: "",
  stickyRegion: "",
  theme: getInitialTheme()
};

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      ...initialState,
      
      setGridColumns: (columns) => set({ gridColumns: columns }),
      setStickyPlatform: (platform) => set({ stickyPlatform: platform }),
      setStickyRegion: (region) => set({ stickyRegion: region }),
      setTheme: (theme) => set({ theme })
    }),
    {
      name: "crocdesk-ui-storage",
      partialize: (state) => ({
        stickyPlatform: state.stickyPlatform,
        stickyRegion: state.stickyRegion,
        gridColumns: state.gridColumns,
        theme: state.theme
      })
    }
  )
);




