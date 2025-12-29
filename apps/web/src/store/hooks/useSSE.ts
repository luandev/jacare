import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSSEStore } from "../slices/sseSlice";

/**
 * Hook to ensure SSE connection is active and handle React Query cache invalidation
 */
export function useSSE() {
  const queryClient = useQueryClient();
  const { connect, disconnect: _disconnect, lastEvent, isConnected } = useSSEStore();
  
  useEffect(() => {
    // connect() is async but we don't need to await it
    connect().catch(() => {
      // Silently handle connection errors - SSE will retry automatically
    });
    
    return () => {
      // Don't disconnect on unmount - keep connection alive for other components
      // Only disconnect when app unmounts (handled in main.tsx)
    };
  }, [connect]);
  
  // Invalidate React Query cache when jobs complete
  useEffect(() => {
    if (lastEvent && (lastEvent.type === "JOB_DONE" || lastEvent.type === "JOB_FAILED" || lastEvent.type === "JOB_RESULT")) {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      if (lastEvent.type === "JOB_RESULT") {
        queryClient.invalidateQueries({ queryKey: ["library-items"] });
      }
    }
  }, [lastEvent, queryClient]);
  
  return { isConnected, lastEvent };
}




