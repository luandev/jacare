import { useMemo } from "react";

export type SpeedChartProps = {
  speeds: number[]; // MB/s values
  maxBars?: number;
};

const MB_TO_BYTES = 1048576;

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
          borderRadius: "6px",
          padding: "8px"
        }}
      >
        <span className="status" style={{ fontSize: 11 }}>No data</span>
      </div>
    );
  }

  return (
    <div 
      className="speed-chart" 
      style={{ 
        height: 40,
        backgroundColor: "var(--progress-bg)",
        borderRadius: "6px",
        padding: "8px",
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
              borderRadius: "3px 3px 0 0",
              transition: "height 0.2s ease"
            }}
            title={`${speed.toFixed(2)} MB/s`}
          />
        );
      })}
    </div>
  );
}


