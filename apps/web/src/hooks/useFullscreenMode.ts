import { useEffect, useRef } from "react";

/**
 * Custom hook to manage fullscreen mode
 * Only exits fullscreen if this component was responsible for entering it
 */
export function useFullscreenMode(enabled: boolean) {
  const enteredFullscreenRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const enterFullscreen = async () => {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        try {
          await document.documentElement.requestFullscreen();
          enteredFullscreenRef.current = true;
        } catch (error) {
          console.warn("[Fullscreen] Failed to enter fullscreen:", error);
          // Fullscreen request failed, continue anyway
        }
      }
    };

    enterFullscreen();

    return () => {
      // Only exit fullscreen if we entered it
      if (enteredFullscreenRef.current && document.fullscreenElement) {
        document.exitFullscreen().catch((error) => {
          console.warn("[Fullscreen] Failed to exit fullscreen:", error);
        });
        enteredFullscreenRef.current = false;
      }
    };
  }, [enabled]);
}
