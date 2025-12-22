export type Theme = {
  name: string;
  vars: Record<string, string>;
};

export const lightTheme: Theme = {
  name: "light",
  vars: {
    "--bg": "#f6f2ea",
    "--bg-alt": "#efe7da",
    "--ink": "#1b1a16",
    "--muted": "#6c665f",
    "--accent": "#e68a2e",
    "--accent-strong": "#cc6c1f",
    "--card": "#fffaf2",
    "--border": "#e0d6c6",
    "--shadow-color": "0 12px 32px rgba(27, 26, 22, 0.12)",
    "--sidebar-bg": "#201c16",
    "--sidebar-ink": "#f8f3ec",
    "--nav-pill": "rgba(255, 255, 255, 0.06)",
    "--badge-bg": "#f1e2d1",
    "--badge-ink": "#5c3b1c",
    "--button-secondary-bg": "#f3e3cf",
    "--button-secondary-border": "#e2c8a3",
    "--button-secondary-ink": "#1b1a16",
    "--progress-bg": "#ece4d9"
  }
};



