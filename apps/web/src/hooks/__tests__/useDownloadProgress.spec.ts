import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDownloadProgress } from '../useDownloadProgress';
import type { SpeedDataPoint } from '../useDownloadProgress';

describe('useDownloadProgress', () => {
  it('calculates current speed from recent history', () => {
    const speedHistory: SpeedDataPoint[] = [
      { bytes: 100, timestamp: Date.now() - 2000 },
      { bytes: 300, timestamp: Date.now() - 1000 },
      { bytes: 500, timestamp: Date.now() }
    ];
    
    const { result } = renderHook(() => 
      useDownloadProgress(speedHistory, { downloaded: 500, total: 1000 }, 0.5)
    );
    
    // Should calculate speed based on recent bytes
    expect(result.current.currentSpeed).toBeGreaterThan(0);
  });

  it('calculates ETA when speed and remaining bytes are available', () => {
    const speedHistory: SpeedDataPoint[] = [
      { bytes: 0, timestamp: Date.now() - 1000 },
      { bytes: 100, timestamp: Date.now() }
    ];
    
    const { result } = renderHook(() => 
      useDownloadProgress(speedHistory, { downloaded: 100, total: 1000 }, 0.1)
    );
    
    // ETA should be calculated
    expect(result.current.eta).toBeDefined();
  });

  it('returns null ETA when speed is zero', () => {
    const speedHistory: SpeedDataPoint[] = [];
    
    const { result } = renderHook(() => 
      useDownloadProgress(speedHistory, { downloaded: 0, total: 1000 }, 0)
    );
    
    expect(result.current.eta).toBeNull();
  });

  it('handles empty speed history', () => {
    const { result } = renderHook(() => 
      useDownloadProgress([], { downloaded: 500, total: 1000 }, 0.5)
    );
    
    expect(result.current.currentSpeed).toBe(0);
    expect(result.current.eta).toBeNull();
  });
});
