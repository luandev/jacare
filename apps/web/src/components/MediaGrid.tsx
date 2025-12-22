import React, { useState } from "react";
import { spacing, radius } from "../lib/design-tokens";

export function MediaGrid({ coverUrl, screenshots }: { coverUrl?: string; screenshots: string[] }) {
  const [active, setActive] = useState<string | null>(null);
  const limit = 2 * 3; // 2 per platform, up to 3 platforms (fallback: first 6)
  const items = [coverUrl, ...screenshots].filter(Boolean).slice(0, limit) as string[];

  return (
    <div>
      <div
        className="media-grid"
        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: spacing.md }}
      >
        {items.map((src) => (
          <img
            key={src}
            src={src}
            alt="Game media"
            loading="lazy"
            className="thumb"
            style={{
              width: "100%",
              aspectRatio: "16 / 9",
              objectFit: "cover",
              borderRadius: radius.md,
              cursor: "pointer",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              boxShadow: "var(--shadow-sm)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.02)";
              e.currentTarget.style.boxShadow = "var(--shadow-md)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "var(--shadow-sm)";
            }}
            onClick={() => setActive(src)}
          />
        ))}
        {items.length === 0 && <div className="status">No media available</div>}
      </div>
      {active && (
        <div
          className="lightbox"
          onClick={() => setActive(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            cursor: "pointer"
          }}
        >
          <img
            src={active}
            alt="Expanded media"
            style={{ 
              maxWidth: "90vw", 
              maxHeight: "90vh", 
              borderRadius: radius.lg,
              boxShadow: "var(--shadow-lg)",
              objectFit: "contain"
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}







