import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../lib/api";
import type { JobRecord } from "@crocdesk/shared";
import { useBigPictureStore, useDownloadProgressStore } from "../store";
import { useGamepadNavigation, triggerHapticFeedback } from "../hooks/useGamepadNavigation";
import DownloadCard from "../components/DownloadCard";
import "./BigPictureDownloadsPage.css";

type JobPreview = {
  slug: string;
  title: string;
  platform: string;
  boxart_url?: string;
};
type JobWithPreview = JobRecord & { preview?: JobPreview };

export default function BigPictureDownloadsPage() {
  const navigate = useNavigate();
  const [focusedIndex, setFocusedIndex] = useState(0);
  
  // Store
  const bigPictureStore = useBigPictureStore();
  const progressByJobId = useDownloadProgressStore((state) => state.progressByJobId);
  const speedDataByJobId = useDownloadProgressStore((state) => state.speedDataByJobId);
  const bytesByJobId = useDownloadProgressStore((state) => state.bytesByJobId);
  
  const jobsQuery = useQuery({
    queryKey: ["jobs"],
    queryFn: () => apiGet<JobWithPreview[]>("/jobs")
  });
  
  const activeDownloads = (jobsQuery.data ?? []).filter(
    (job) => job.type === "download_and_install" && (job.status === "running" || job.status === "queued" || job.status === "paused")
  );
  
  // Haptic feedback helper
  const triggerHaptic = useCallback((type: "light" | "medium" | "heavy" = "light") => {
    if (!bigPictureStore.hapticFeedbackEnabled) return;
    
    const gamepads = navigator.getGamepads?.() || [];
    const gamepad = Array.from(gamepads).find(gp => gp !== null);
    
    if (gamepad) {
      const magnitudes = {
        light: { weak: 0.2, strong: 0.2, duration: 50 },
        medium: { weak: 0.5, strong: 0.5, duration: 100 },
        heavy: { weak: 0.8, strong: 0.8, duration: 150 }
      };
      
      const config = magnitudes[type];
      triggerHapticFeedback(gamepad, {
        weakMagnitude: config.weak,
        strongMagnitude: config.strong,
        duration: config.duration
      }).catch(() => {
        // Silently handle haptic failure
      });
    }
  }, [bigPictureStore.hapticFeedbackEnabled]);
  
  const moveUp = useCallback(() => {
    setFocusedIndex((prev) => {
      const newIndex = Math.max(0, prev - 1);
      if (newIndex !== prev) triggerHaptic("light");
      return newIndex;
    });
  }, [triggerHaptic]);
  
  const moveDown = useCallback(() => {
    setFocusedIndex((prev) => {
      const newIndex = Math.min(activeDownloads.length - 1, prev + 1);
      if (newIndex !== prev) triggerHaptic("light");
      return newIndex;
    });
  }, [activeDownloads.length, triggerHaptic]);
  
  const goBack = useCallback(() => {
    triggerHaptic("light");
    navigate("/big-picture");
  }, [navigate, triggerHaptic]);
  
  // Gamepad navigation
  useGamepadNavigation({
    enabled: bigPictureStore.enabled,
    deadzone: bigPictureStore.deadzone,
    buttonMapping: {
      UP: moveUp,
      DOWN: moveDown,
      B: goBack,
      START: goBack
    }
  });
  
  // Enter fullscreen on mount
  useEffect(() => {
    if (bigPictureStore.enabled && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        // Fullscreen request failed, continue anyway
      });
    }
    
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {
          // Exit fullscreen failed
        });
      }
    };
  }, [bigPictureStore.enabled]);
  
  return (
    <div className="bp-downloads-page" data-big-picture="true">
      {/* Header */}
      <header className="bp-header">
        <button className="bp-back-button" onClick={goBack}>
          ← Back
        </button>
        <h1>Active Downloads</h1>
        <div className="bp-count">
          {activeDownloads.length} {activeDownloads.length === 1 ? "download" : "downloads"}
        </div>
      </header>
      
      {/* Main content */}
      <main className="bp-main">
        {activeDownloads.length === 0 ? (
          <div className="bp-empty">
            <p>No active downloads</p>
            <button onClick={goBack}>Go Back</button>
          </div>
        ) : (
          <div className="bp-downloads-list">
            {activeDownloads.map((job, index) => {
              const isFocused = index === focusedIndex;
              
              return (
                <div
                  key={job.id}
                  className={`bp-download-item ${isFocused ? "focused" : ""}`}
                >
                  <DownloadCard
                    job={job}
                    speedHistory={speedDataByJobId[job.id] || []}
                    currentBytes={bytesByJobId[job.id]}
                    currentProgress={progressByJobId[job.id]}
                  />
                </div>
              );
            })}
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bp-footer">
        <div className="bp-hints">
          <span>D-Pad: Navigate</span>
          <span>B: Back</span>
        </div>
      </footer>
    </div>
  );
}
