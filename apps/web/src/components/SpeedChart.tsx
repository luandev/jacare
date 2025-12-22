import { useMemo } from "react";
import { spacing, radius, transitions } from "../lib/design-tokens";

export type SpeedChartProps = {
  speeds: number[]; // MB/s values
  maxBars?: number;
};

export default function SpeedChart({ speeds, maxBars = 20 }: SpeedChartProps) {
  const displaySpeeds = useMemo(() => {
    return speeds.slice(-maxBars);
  }, [speeds, maxBars]);

  const maxSpeed = useMemo(() => {
    if (displaySpeeds.length === 0) return 1;
    return Math.max(...displaySpeeds, 0.1); // Minimum 0.1 MB/s for scaling
  }, [displaySpeeds]);

  if (displaySpeeds.length === 0) {
    return (
      <div 
        className="speed-chart" 
        style={{ 
          height: 40, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          backgroundColor: "var(--progress-bg)",
          borderRadius: radius.sm,
          padding: spacing.sm
        }}
      >
        <span className="status" style={{ fontSize: "11px" }}>No data</span>
      </div>
    );
  }

  return (
    <div 
      className="speed-chart" 
      style={{ 
        height: 40,
        backgroundColor: "var(--progress-bg)",
        borderRadius: radius.sm,
        padding: spacing.sm,
        display: "flex",
        alignItems: "flex-end",
        gap: 3
      }}
    >
      {displaySpeeds.map((speed, idx) => {
        const height = (speed / maxSpeed) * 100;
        return (
          <div
            key={idx}
            style={{
              flex: 1,
              minWidth: 4,
              height: `${Math.max(height, 4)}%`,
              backgroundColor: "var(--accent)",
              borderRadius: `${radius.xs} ${radius.xs} 0 0`,
              transition: `height ${transitions.normal}`
            }}
            title={`${speed.toFixed(2)} MB/s`}
          />
        );
      })}
    </div>
  );
}





