import React from "react";

export type PlatformIconProps = {
  platform: string;
  brand?: string;
  label?: string;
  size?: number;
};

// Brand-inspired minimalist initials badge (no logos or wordmarks)
export default function PlatformIcon({ platform, brand, label, size = 28 }: PlatformIconProps) {
  const palette = getBrandPalette(brand);
  const initials = getInitials(label ?? platform);
  const fontSize = Math.max(10, Math.round(size * 0.42));
  const radius = Math.round(size * 0.28);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`${label ?? platform} (${initials}) platform badge`}
      role="img"
    >
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette.bg1} />
          <stop offset="100%" stopColor={palette.bg2} />
        </linearGradient>
        <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette.ring1} />
          <stop offset="100%" stopColor={palette.ring2} />
        </linearGradient>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="rgba(0,0,0,0.25)" />
        </filter>
      </defs>
      <g filter="url(#shadow)">
        <rect x="4" y="4" rx={radius} ry={radius} width="24" height="24" fill="url(#bg)" stroke="url(#ring)" strokeWidth="1.2" />
        <rect x="4" y="4" rx={radius} ry={radius} width="24" height="24" fill={palette.gloss} opacity="0.08" />
        <text
          x="16"
          y="19.5"
          textAnchor="middle"
          fontSize={fontSize}
          fontWeight={700}
          fill={palette.text}
          letterSpacing="0.04em"
        >
          {initials}
        </text>
      </g>
    </svg>
  );
}

function getInitials(input: string): string {
  const s = (input || "").trim();
  // If it's already an acronym up to 4 chars, keep it as-is (uppercased)
  if (s.length <= 4 && /^[A-Za-z0-9]+$/.test(s) && s.toUpperCase() === s) {
    return s.toUpperCase();
  }
  // Take first letters of up to 3 words
  const words = s.split(/\s+|\//).filter(Boolean);
  if (words.length >= 2) {
    return words.slice(0, 3).map((w) => w[0]?.toUpperCase() ?? "").join("");
  }
  // Otherwise take first 2-3 characters
  const up = s.toUpperCase();
  return up.slice(0, Math.min(3, up.length));
}

function getBrandPalette(brand?: string) {
  const b = (brand || "").toLowerCase();
  // Brand-inspired colors (generic, no logos)
  if (b.includes("nintendo")) {
    return palette("#e60012", "#ff3b3b", "#ffffff", "#b3000e", "#ff6b6b");
  }
  if (b.includes("sony") || b.includes("playstation")) {
    return palette("#003791", "#1e4bb8", "#ffffff", "#0b2a6f", "#3f62c9");
  }
  if (b.includes("microsoft") || b.includes("xbox")) {
    return palette("#107c10", "#1fae1f", "#ffffff", "#0b5a0b", "#34c634");
  }
  if (b.includes("sega")) {
    return palette("#0047ab", "#1a66d1", "#ffffff", "#003a8f", "#3d7ee0");
  }
  if (b.includes("pc") || b.includes("windows") || b.includes("computer")) {
    return palette("#6d28d9", "#7c3aed", "#ffffff", "#4c1d95", "#a78bfa");
  }
  if (b.includes("atari")) {
    return palette("#a41e22", "#c93b3f", "#ffffff", "#7f191c", "#e06367");
  }
  if (b.includes("commodore")) {
    return palette("#003b6f", "#265c8f", "#ffffff", "#002c53", "#4a78a5");
  }
  if (b.includes("nec") || b.includes("pc-engine") || b.includes("turbo")) {
    return palette("#ff6f00", "#ff8f1f", "#ffffff", "#c25700", "#ffb866");
  }
  // Default accent
  return palette("#cc6c1f", "#e68a2e", "#1b1a16", "#a45819", "#f2c26b");
}

function palette(bg1: string, bg2: string, text: string, ring1: string, ring2: string) {
  return {
    bg1,
    bg2,
    text,
    ring1,
    ring2,
    gloss: "#ffffff"
  } as const;
}
