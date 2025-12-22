import React, { useId } from "react";

type BrandKey =
  | "nintendo"
  | "sony"
  | "xbox"
  | "sega"
  | "pc"
  | "atari"
  | "commodore"
  | "nec"
  | null;

type Palette = {
  bg1: string;
  bg2: string;
  text: string;
  ring1: string;
  ring2: string;
  gloss: string;
  accent1: string;
  accent2: string;
  neutral: string;
};

export type PlatformIconProps = {
  platform: string;
  brand?: string;
  label?: string;
  size?: number;
};

// Brand-inspired minimalist initials badge (no logos or wordmarks)
export default function PlatformIcon({ platform, brand, label, size = 28 }: PlatformIconProps) {
  const uid = useId();
  const brandKey = getBrandKey(brand ?? platform);
  const palette = getBrandPalette(brandKey);
  const initials = getInitials(label ?? platform);
  const fontSize = Math.max(10, Math.round(size * 0.42));
  const radius = Math.round(size * 0.28);
  const bgId = `bg-${uid}`;
  const ringId = `ring-${uid}`;
  const shadowId = `shadow-${uid}`;
  const accentId = `accent-${uid}`;
  const ariaLabel = `${label ?? platform} ${brandKey ? "brand icon" : "platform badge"}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      data-brand={brandKey ?? "generic"}
      aria-label={ariaLabel}
      role="img"
    >
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette.bg1} />
          <stop offset="100%" stopColor={palette.bg2} />
        </linearGradient>
        <linearGradient id={ringId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette.ring1} />
          <stop offset="100%" stopColor={palette.ring2} />
        </linearGradient>
        <linearGradient id={accentId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette.accent1} />
          <stop offset="100%" stopColor={palette.accent2} />
        </linearGradient>
        <filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="rgba(0,0,0,0.25)" />
        </filter>
      </defs>
      <g filter={`url(#${shadowId})`}>
        <rect x="4" y="4" rx={radius} ry={radius} width="24" height="24" fill={`url(#${bgId})`} stroke={`url(#${ringId})`} strokeWidth="1.2" />
        <rect x="4" y="4" rx={radius} ry={radius} width="24" height="24" fill={palette.gloss} opacity="0.08" />
        {renderBrandMark(brandKey, palette, accentId) ?? (
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
        )}
      </g>
    </svg>
  );
}

function renderBrandMark(brand: BrandKey, palette: Palette, accentId: string) {
  switch (brand) {
    case "nintendo":
      return (
        <>
          <rect x="7.5" y="10" width="17" height="12" rx="6" ry="6" fill="none" stroke={palette.accent1} strokeWidth="2" />
          <rect x="10" y="12.5" width="12" height="7" rx="3.5" fill={`url(#${accentId})`} opacity="0.28" />
          <circle cx="11" cy="12.5" r="1.1" fill={palette.gloss} opacity="0.78" />
        </>
      );
    case "sony":
      return (
        <>
          <path d="M13 9.5c2.6-.9 5.6-.3 7 .7v12.6l-2.2-.7v-5.2c-1.5-.5-3.3-.3-4.6.4-1.7.8-1.8 2.5-.2 3.3l5.6 2.6c1.8.9 4.1.3 5-1.4.4-.7.5-1.5.4-2.3-.5 1-1.4 1.7-2.5 1.9-.7.1-1.4 0-2-.3l-4.1-1.9c-1.6-.7-1.3-2.3.7-2.9 1.4-.4 2.7-.2 4 .4V12c-1.9-.9-4.3-1.1-6.1-.5z" fill={`url(#${accentId})`} />
          <path d="M13 10.6c2.4-.8 4.7-.1 4.7 1.5 0 1.3-1.5 1.9-3.3 1.6-.6-.1-1.3-.3-2.1-.6z" fill={palette.accent2} opacity="0.85" />
          <path d="M11.3 19.3c1.2-1.2 3.5-1.8 5.5-1l4.7 2c.9.4 1.2 1.2.9 1.8-.3.7-1.2.9-2.1.6l-5.1-2.2c-1.7-.7-3.1-.1-3.4 1.1-.1.4-.1.9 0 1.3-.8-1.3-.7-2.7-.5-3.6z" fill={palette.neutral} opacity="0.7" />
        </>
      );
    case "xbox":
      return (
        <>
          <circle cx="16" cy="16" r="7.8" fill={`url(#${accentId})`} opacity="0.2" stroke={palette.accent1} strokeWidth="1.4" />
          <path d="M11.4 12.6c1.1-1.8 3-3.1 4.6-3.1 1.8 0 3.6 1.2 4.6 3.1l1.5-1.3C20.7 9.2 18.5 8 16 8c-2.5 0-4.8 1.2-6.1 3.3z" fill={palette.gloss} opacity="0.85" />
          <path d="M12.1 13.8 16 17.2l3.9-3.4 1.7 1.5-4 3.4 2.6 2.8-2.1 1.1-2.1-2.4-2.1 2.4-2.1-1.1 2.6-2.8-4-3.4z" fill={palette.text} opacity="0.96" />
        </>
      );
    case "sega":
      return (
        <>
          <rect x="9" y="11" width="14" height="2.1" rx="1.05" fill={palette.accent1} />
          <rect x="9" y="15" width="14" height="2.1" rx="1.05" fill={palette.accent1} />
          <rect x="9" y="19" width="14" height="2.1" rx="1.05" fill={palette.accent1} />
          <path d="M11 12.2c3 .4 6 .4 9 0v1c-3 .4-6 .4-9 0zM11 16.2c3 .4 6 .4 9 0v1c-3 .4-6 .4-9 0zM11 20.2c3 .4 6 .4 9 0v1c-3 .4-6 .4-9 0z" fill={palette.accent2} opacity="0.65" />
        </>
      );
    case "pc":
      return (
        <>
          <path d="M10.6 20.6v-8.2h4.2c2.5 0 4.1 1.4 4.1 3.4s-1.6 3.4-4.1 3.4h-2.2v1.4z" fill={`url(#${accentId})`} />
          <path d="M12.6 13.8v3.2h2c1.2 0 2-.7 2-1.6 0-.9-.8-1.6-2-1.6z" fill={palette.gloss} opacity="0.7" />
          <path d="M19.5 12.6 23 12v8.2h-2.2v-5.4l-1.3.3z" fill={palette.accent2} />
          <path d="M10.6 21.8c3.6 1.1 7.8 1 12.4-.2l-1-.9c-3.5.8-6.8.9-9.7.1z" fill={palette.neutral} opacity="0.45" />
        </>
      );
    case "atari":
      return (
        <>
          <path d="M14.2 21.5c0-3 .5-9 1.8-9 1.3 0 1.9 6 1.9 9 0 .9-.7 1.5-1.8 1.5s-1.9-.6-1.9-1.5z" fill={palette.accent1} />
          <path d="M12 21.3c.2-3.5 1-8.5 2.6-9.8l-1.6-.5c-1.6 1.7-2.8 6.6-2.9 10.3-.1.8.6 1.4 1.5 1.4.6 0 1.1-.5 1.1-1.4zM20 21.3c-.2-3.5-1-8.5-2.6-9.8l1.6-.5c1.6 1.7 2.8 6.6 2.9 10.3.1.8-.6 1.4-1.5 1.4-.6 0-1.1-.5-1.1-1.4z" fill={palette.accent2} />
          <path d="M14 12.5c1.3-.7 2.7-.7 4 0v1c-1.3-.6-2.7-.6-4 0z" fill={palette.neutral} opacity="0.5" />
        </>
      );
    case "commodore":
      return (
        <>
          <path d="M20.4 11.3c-1.7-1.6-4.6-1.7-6.5-.2-2.1 1.6-2.6 4.6-.8 6.9 1.8 2.3 5.2 2.7 7.5 1l1.7-1.2-2-1.3-1.3.9c-1.5 1-3.4.6-4.3-.7-.9-1.3-.6-3.1.9-4.1 1.6-1 3.3-.5 4.1.7l2.1-1.5z" fill={`url(#${accentId})`} />
          <path d="M21.3 15.4 24 14v2l-2.7 1.3z" fill={palette.accent2} />
          <path d="M13.8 12.4c1.8-1.1 4.3-1 6 .2l.8-.6c-2-1.8-5.1-2-7.3-.6-2.6 1.6-3.4 5.1-1.6 7.6l.7-.5c-1.2-2-.4-4.9 1.4-6.1z" fill={palette.neutral} opacity="0.5" />
        </>
      );
    case "nec":
      return (
        <>
          <path d="M10.5 20.5v-7.8h3.7c2.2 0 3.6 1.2 3.6 3s-1.4 3-3.6 3h-1.8v1.8z" fill={`url(#${accentId})`} />
          <path d="M12.4 14.7v2.8h1.8c1 0 1.6-.6 1.6-1.4 0-.8-.6-1.4-1.6-1.4z" fill={palette.gloss} opacity="0.7" />
          <path d="M19.4 12.9 22.4 12v7.8h-2v-5.1l-1.4.3z" fill={palette.accent2} />
          <path d="M18.4 17.8c1.6-.5 3.2-.3 4 .3v1.4c-.8-.7-2.3-.9-3.8-.4-1.8.6-2.7 2-2.1 3.1-1.4-.8-1.4-3.2 1.9-4.4z" fill={palette.neutral} opacity="0.5" />
        </>
      );
    default:
      return null;
  }
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

function getBrandPalette(brand: BrandKey): Palette {
  switch (brand) {
    case "nintendo":
      return palette("#e60012", "#ff3b3b", "#ffffff", "#b3000e", "#ff6b6b", "#ffffff", "#ffd1d1");
    case "sony":
      return palette("#003791", "#1e4bb8", "#f5f7ff", "#0b2a6f", "#3f62c9", "#00b6ff", "#ffcb00", "#091f52");
    case "xbox":
      return palette("#0e5c0e", "#1fae1f", "#e9ffef", "#0b5a0b", "#34c634", "#b3ffbf", "#2bff6b", "#0d340d");
    case "sega":
      return palette("#0047ab", "#1a66d1", "#e7f0ff", "#003a8f", "#3d7ee0", "#d9e8ff", "#7fb5ff", "#0a2b63");
    case "pc":
      return palette("#5b21b6", "#7c3aed", "#f6f5ff", "#4c1d95", "#a78bfa", "#7bd0ff", "#2d8cf0", "#1f1247");
    case "atari":
      return palette("#a41e22", "#c93b3f", "#fff2f2", "#7f191c", "#e06367", "#ffe0e0", "#ff8a8f", "#3f0f11");
    case "commodore":
      return palette("#003b6f", "#265c8f", "#f2f7ff", "#002c53", "#4a78a5", "#f93838", "#63a8ff", "#11263c");
    case "nec":
      return palette("#ff6f00", "#ff8f1f", "#fff7ed", "#c25700", "#ffb866", "#fff1d6", "#ff9640", "#5f2b00");
    default:
      return palette("#cc6c1f", "#e68a2e", "#1b1a16", "#a45819", "#f2c26b", "#ffe5b3", "#ffd789", "#2d1b0d");
  }
}

function getBrandKey(input?: string): BrandKey {
  const value = (input ?? "").toLowerCase();
  if (/nintendo|nes|snes|gamecube|switch|wii|gba|game boy|3ds|ds/.test(value)) {
    return "nintendo";
  }
  if (/sony|playstation|ps[1-5]|vita|psp/.test(value)) {
    return "sony";
  }
  if (/microsoft|xbox|series|360/.test(value)) {
    return "xbox";
  }
  if (/sega|genesis|mega drive|saturn|dreamcast|game gear/.test(value)) {
    return "sega";
  }
  if (/pc|windows|dos|computer/.test(value)) {
    return "pc";
  }
  if (/atari|2600|7800|lynx|jaguar/.test(value)) {
    return "atari";
  }
  if (/commodore|amiga|c64/.test(value)) {
    return "commodore";
  }
  if (/nec|pc-engine|turbo/.test(value)) {
    return "nec";
  }
  return null;
}

function palette(
  bg1: string,
  bg2: string,
  text: string,
  ring1: string,
  ring2: string,
  accent1: string,
  accent2: string,
  neutral = "#1b1a16"
): Palette {
  return {
    bg1,
    bg2,
    text,
    ring1,
    ring2,
    gloss: "#ffffff",
    accent1,
    accent2,
    neutral
  } as const;
}
