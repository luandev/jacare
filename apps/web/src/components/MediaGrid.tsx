import React, { useState } from "react";

export function MediaGrid({ coverUrl, screenshots }: { coverUrl?: string; screenshots: string[] }) {
  const [active, setActive] = useState<string | null>(null);
  const limit = 2 * 3; // 2 per platform, up to 3 platforms (fallback: first 6)
  const items = [coverUrl, ...screenshots].filter(Boolean).slice(0, limit) as string[];

  return (
    <div>
      <div
        className="media-grid"
        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}
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
              borderRadius: "8px",
              cursor: "pointer"
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
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <img
            src={active}
            alt="Expanded media"
            style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: "12px" }}
          />
        </div>
      )}
    </div>
  );
}



