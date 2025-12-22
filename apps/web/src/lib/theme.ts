import type { Theme } from "./theme-types";

/**
 * Light Theme
 * Warm beige/cream base with cool green accent
 */
export const lightTheme: Theme = {
  name: "light",
  vars: {
    // Core surfaces & text
    "--bg": "#f6f2ea",
    "--bg-alt": "#efe7da",
    "--ink": "#1b1a16",
    "--muted": "#6c665f",
    
    // Accents (cool green)
    "--accent": "#2d8659",
    "--accent-strong": "#1f6b47",
    "--accent-hover": "#259965",
    "--accent-active": "#1a5a3a",
    
    // Surfaces
    "--card": "#fffaf2",
    "--card-hover": "#fff8f0",
    "--border": "#e0d6c6",
    "--border-strong": "#d4c5b0",
    
    // Shadows
    "--shadow-color": "0 12px 32px rgba(27, 26, 22, 0.12)",
    "--shadow-sm": "0 2px 8px rgba(27, 26, 22, 0.08)",
    "--shadow-md": "0 4px 12px rgba(27, 26, 22, 0.12)",
    
    // Shell (very dark vibrant green for maximum visibility in light theme)
    "--sidebar-bg": "#0d2818",
    "--sidebar-ink": "#646464ff",
    "--nav-pill": "rgba(255, 255, 255, 0.18)",
    "--nav-pill-active": "#2d8659",
    
    // Badges & pills
    "--badge-bg": "#f1e2d1",
    "--badge-ink": "#5c3b1c",
    "--badge-success-bg": "#d4edda",
    "--badge-success-ink": "#155724",
    "--badge-warning-bg": "#fff3cd",
    "--badge-warning-ink": "#856404",
    "--badge-error-bg": "#f8d7da",
    "--badge-error-ink": "#721c24",
    
    // Buttons
    "--button-primary-bg": "#2d8659",
    "--button-primary-border": "#1f6b47",
    "--button-primary-ink": "#ffffff",
    "--button-primary-hover": "#259965",
    "--button-secondary-bg": "#f3e3cf",
    "--button-secondary-border": "#e2c8a3",
    "--button-secondary-ink": "#1b1a16",
    "--button-secondary-hover": "#ede0c8",
    "--button-tertiary-bg": "transparent",
    "--button-tertiary-border": "transparent",
    "--button-tertiary-ink": "#6c665f",
    "--button-tertiary-hover": "rgba(27, 26, 22, 0.05)",
    
    // Progress
    "--progress-bg": "#ece4d9",
    "--progress-fill": "linear-gradient(90deg, var(--accent), #4da876)",
    
    // Inputs
    "--input-bg": "#ffffff",
    "--input-border": "#e0d6c6",
    "--input-border-focus": "#2d8659",
    "--input-ink": "#1b1a16",
    "--input-placeholder": "#9b9388",
    
    // Links
    "--link-color": "#2d8659",
    "--link-hover": "#1f6b47",
    
    // Fixed cover sizes
    "--cover-w": "200px",
    "--cover-h": "266px"
  }
};

/**
 * Dark Theme
 * Dark gray/charcoal base with cool green accent for better contrast
 */
export const darkTheme: Theme = {
  name: "dark",
  vars: {
    // Core surfaces & text
    "--bg": "#1a1a1a",
    "--bg-alt": "#0f0f0f",
    "--ink": "#e0e0e0",
    "--muted": "#9b9b9b",
    
    // Accents (cool green, brighter for better contrast)
    "--accent": "#3db875",
    "--accent-strong": "#2d8659",
    "--accent-hover": "#4dc885",
    "--accent-active": "#259965",
    
    // Surfaces
    "--card": "#252525",
    "--card-hover": "#2a2a2a",
    "--border": "#3a3a3a",
    "--border-strong": "#4a4a4a",
    
    // Shadows
    "--shadow-color": "0 12px 32px rgba(0, 0, 0, 0.4)",
    "--shadow-sm": "0 2px 8px rgba(0, 0, 0, 0.3)",
    "--shadow-md": "0 4px 12px rgba(0, 0, 0, 0.35)",
    
    // Shell
    "--sidebar-bg": "#0f1a14",
    "--sidebar-ink": "#e0e0e0",
    "--nav-pill": "rgba(255, 255, 255, 0.08)",
    "--nav-pill-active": "#3db875",
    
    // Badges & pills
    "--badge-bg": "#3a3a3a",
    "--badge-ink": "#e0e0e0",
    "--badge-success-bg": "#2d4a2d",
    "--badge-success-ink": "#90ee90",
    "--badge-warning-bg": "#4a3d1f",
    "--badge-warning-ink": "#ffd700",
    "--badge-error-bg": "#4a1f1f",
    "--badge-error-ink": "#ff6b6b",
    
    // Buttons
    "--button-primary-bg": "#3db875",
    "--button-primary-border": "#2d8659",
    "--button-primary-ink": "#ffffff",
    "--button-primary-hover": "#4dc885",
    "--button-secondary-bg": "#3a3a3a",
    "--button-secondary-border": "#4a4a4a",
    "--button-secondary-ink": "#e0e0e0",
    "--button-secondary-hover": "#454545",
    "--button-tertiary-bg": "transparent",
    "--button-tertiary-border": "transparent",
    "--button-tertiary-ink": "#9b9b9b",
    "--button-tertiary-hover": "rgba(255, 255, 255, 0.1)",
    
    // Progress
    "--progress-bg": "#3a3a3a",
    "--progress-fill": "linear-gradient(90deg, var(--accent), #5dd99a)",
    
    // Inputs
    "--input-bg": "#2a2a2a",
    "--input-border": "#3a3a3a",
    "--input-border-focus": "#3db875",
    "--input-ink": "#e0e0e0",
    "--input-placeholder": "#6b6b6b",
    
    // Links
    "--link-color": "#3db875",
    "--link-hover": "#4dc885",
    
    // Fixed cover sizes
    "--cover-w": "200px",
    "--cover-h": "266px"
  }
};



