/**
 * Design Tokens
 * 
 * Centralized design tokens for spacing, typography, colors, shadows, and more.
 * These tokens ensure consistency across the application.
 */

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  "2xl": "24px",
  "3xl": "32px",
  "4xl": "40px",
  "5xl": "48px"
} as const;

export const typography = {
  fontFamily: {
    sans: '"IBM Plex Sans", system-ui, sans-serif',
    display: '"Space Grotesk", sans-serif'
  },
  fontSize: {
    xs: "11px",
    sm: "12px",
    base: "14px",
    md: "16px",
    lg: "18px",
    xl: "20px",
    "2xl": "22px",
    "3xl": "24px"
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75
  }
} as const;

export const radius = {
  sm: "6px",
  md: "10px",
  lg: "16px",
  xl: "20px",
  full: "999px"
} as const;

export const shadows = {
  sm: "0 2px 8px rgba(0, 0, 0, 0.08)",
  md: "0 4px 12px rgba(0, 0, 0, 0.12)",
  lg: "0 12px 32px rgba(0, 0, 0, 0.16)",
  card: "0 12px 32px rgba(27, 26, 22, 0.12)"
} as const;

export const transitions = {
  fast: "0.15s ease",
  normal: "0.2s ease",
  slow: "0.3s ease"
} as const;

export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px"
} as const;

/**
 * Helper function to convert design tokens to CSS custom properties
 */
export function tokensToCSS(tokens: Record<string, any>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(tokens)) {
    const cssKey = prefix ? `${prefix}-${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(result, tokensToCSS(value, cssKey));
    } else {
      result[`--${cssKey}`] = String(value);
    }
  }
  return result;
}



