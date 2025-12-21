import React from "react";

export type PlatformIconProps = {
  platform: string;
  brand?: string;
  label?: string;
  size?: number;
};

// Simple, non-trademark generic controller icon with brand-tinted accent
export default function PlatformIcon({ platform, brand, label, size = 24 }: PlatformIconProps) {
  const tint = getBrandColor(brand);
  const text = label || platform.toUpperCase();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`${text} platform icon`}
      role="img"
    >
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="rgba(0,0,0,0.25)" />
        </filter>
      </defs>
      <g filter="url(#shadow)">
        <rect x="4" y="6" rx="8" ry="8" width="24" height="20" fill="#fff" stroke="#e0d6c6" />
        {/* Grips */}
        <path d="M8 18c-2 0-3.5 1.2-3.5 3s1.5 3 3.5 3c1.8 0 3-1.2 3-3s-1.2-3-3-3z" fill={tint} opacity="0.25" />
        <path d="M24 18c2 0 3.5 1.2 3.5 3s-1.5 3-3.5 3c-1.8 0-3-1.2-3-3s1.2-3 3-3z" fill={tint} opacity="0.25" />
        {/* Buttons */}
        <circle cx="21" cy="14" r="2.4" fill={tint} />
        <circle cx="17" cy="12" r="2.1" fill={tint} opacity="0.8" />
        {/* D-pad */}
        <rect x="10.2" y="12.2" width="6" height="1.8" rx="0.9" fill="#8f877f" />
        <rect x="12.2" y="10.2" width="1.8" height="6" rx="0.9" fill="#8f877f" />
        {/* Label */}
        <rect x="6" y="22" rx="6" ry="6" width="20" height="6" fill={tint} opacity="0.12" />
        <text x="16" y="26.5" textAnchor="middle" fontSize="7" fontWeight={600} fill="#403a33">
          {truncate(text)}
        </text>
      </g>
    </svg>
  );
}

function truncate(s: string) {
  return s.length > 4 ? s.slice(0, 4) : s;
}

function getBrandColor(brand?: string): string {
  const b = (brand || "").toLowerCase();
  if (b.includes("nintendo")) return "#e53935"; // red
  if (b.includes("sony")) return "#1e3a8a"; // deep blue
  if (b.includes("microsoft")) return "#2e7d32"; // green
  if (b.includes("sega")) return "#00838f"; // teal
  if (b.includes("pc") || b.includes("windows")) return "#6d28d9"; // purple
  return "#cc6c1f"; // default accent-ish
}
