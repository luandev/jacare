import type { Theme } from "./theme-types";

/**
 * Light Theme
 * Warm beige/cream base with orange accent
 */
export const lightTheme: Theme = {
  name: "light",
  vars: {
    // Core surfaces & text
    "--bg": "#f6f2ea",
    "--bg-alt": "#efe7da",
    "--ink": "#1b1a16",
    "--muted": "#6c665f",
    
    // Accents
    "--accent": "#e68a2e",
    "--accent-strong": "#cc6c1f",
    "--accent-hover": "#d67a25",
    "--accent-active": "#b85a15",
    
    // Surfaces
    "--card": "#fffaf2",
    "--card-hover": "#fff8f0",
    "--border": "#e0d6c6",
    "--border-strong": "#d4c5b0",
    
    // Shadows
    "--shadow-color": "0 12px 32px rgba(27, 26, 22, 0.12)",
    "--shadow-sm": "0 2px 8px rgba(27, 26, 22, 0.08)",
    "--shadow-md": "0 4px 12px rgba(27, 26, 22, 0.12)",
    
    // Shell
    "--sidebar-bg": "#201c16",
    "--sidebar-ink": "#f8f3ec",
    "--nav-pill": "rgba(255, 255, 255, 0.06)",
    "--nav-pill-active": "#e68a2e",
    
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
    "--button-primary-bg": "#e68a2e",
    "--button-primary-border": "#cc6c1f",
    "--button-primary-ink": "#1b1a16",
    "--button-primary-hover": "#d67a25",
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
    "--progress-fill": "linear-gradient(90deg, var(--accent), #f2c26b)",
    
    // Inputs
    "--input-bg": "#ffffff",
    "--input-border": "#e0d6c6",
    "--input-border-focus": "#e68a2e",
    "--input-ink": "#1b1a16",
    "--input-placeholder": "#9b9388",
    
    // Links
    "--link-color": "#e68a2e",
    "--link-hover": "#cc6c1f",
    
    // Fixed cover sizes
    "--cover-w": "200px",
    "--cover-h": "266px"
  }
};

/**
 * Dark Theme
 * Dark gray/charcoal base with brighter orange accent for better contrast
 */
export const darkTheme: Theme = {
  name: "dark",
  vars: {
    // Core surfaces & text
    "--bg": "#1a1a1a",
    "--bg-alt": "#0f0f0f",
    "--ink": "#e0e0e0",
    "--muted": "#9b9b9b",
    
    // Accents (brighter for better contrast)
    "--accent": "#ff9d4d",
    "--accent-strong": "#ff8c33",
    "--accent-hover": "#ffad66",
    "--accent-active": "#ff7a1a",
    
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
    "--sidebar-bg": "#0f0f0f",
    "--sidebar-ink": "#e0e0e0",
    "--nav-pill": "rgba(255, 255, 255, 0.08)",
    "--nav-pill-active": "#ff9d4d",
    
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
    "--button-primary-bg": "#ff9d4d",
    "--button-primary-border": "#ff8c33",
    "--button-primary-ink": "#1a1a1a",
    "--button-primary-hover": "#ffad66",
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
    "--progress-fill": "linear-gradient(90deg, var(--accent), #ffb366)",
    
    // Inputs
    "--input-bg": "#2a2a2a",
    "--input-border": "#3a3a3a",
    "--input-border-focus": "#ff9d4d",
    "--input-ink": "#e0e0e0",
    "--input-placeholder": "#6b6b6b",
    
    // Links
    "--link-color": "#ff9d4d",
    "--link-hover": "#ffad66",
    
    // Fixed cover sizes
    "--cover-w": "200px",
    "--cover-h": "266px"
  }
};
