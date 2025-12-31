import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPut } from "../lib/api";
import type { Settings } from "@crocdesk/shared";
import { useUIStore, useBigPictureStore } from "../store";
import { useTheme } from "../components/ThemeProvider";
import { Card, Input, Button } from "../components/ui";
import { spacing } from "../lib/design-tokens";

export default function SettingsPage() {
  const navigate = useNavigate();
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiGet<Settings>("/settings")
  });

  // Use query data as source of truth, with draft for unsaved edits
  const [draft, setDraft] = useState<Settings | null>(settingsQuery.data ?? null);
  const [status, setStatus] = useState<string>("");
  
  const theme = useUIStore((state) => state.theme);
  const setThemePreference = useUIStore((state) => state.setTheme);
  const { setTheme: _setThemeObject } = useTheme();
  
  // Big Picture mode settings
  const setBigPictureEnabled = useBigPictureStore((state) => state.setEnabled);
  const hapticFeedbackEnabled = useBigPictureStore((state) => state.hapticFeedbackEnabled);
  const setHapticFeedbackEnabled = useBigPictureStore((state) => state.setHapticFeedbackEnabled);
  const gridSize = useBigPictureStore((state) => state.gridSize);
  const setGridSize = useBigPictureStore((state) => state.setGridSize);

  // Sync draft with query data when it changes (e.g., after refetch)
  // This is a valid pattern for syncing external data with local state
  useEffect(() => {
    if (settingsQuery.data) {
      setDraft(settingsQuery.data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (nextSettings: Settings) => apiPut("/settings", nextSettings),
    onSuccess: () => {
      setStatus("Settings saved");
      // Refetch will trigger the sync above
      void settingsQuery.refetch();
    }
  });

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setThemePreference(newTheme);
    // Mark that user has explicitly set a theme preference
    localStorage.setItem("jacare:theme-explicit", "true");
    // ThemeProvider will pick up the change automatically
  };

  return (
    <div className="grid" style={{ gap: "20px" }}>
      <section className="hero">
        <h1>Settings</h1>
        <p>Manage your Jacare directories, theme, and queue behavior.</p>
      </section>

      <Card>
        <h3>Theme</h3>
        <p className="status" style={{ marginBottom: "12px", fontSize: "12px" }}>
          Choose your preferred color theme for the application.
        </p>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input
              type="radio"
              name="theme"
              value="light"
              checked={theme === "light"}
              onChange={() => handleThemeChange("light")}
              style={{ cursor: "pointer" }}
            />
            <span>Light</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={theme === "dark"}
              onChange={() => handleThemeChange("dark")}
              style={{ cursor: "pointer" }}
            />
            <span>Dark</span>
          </label>
        </div>
      </Card>

      <Card>
        <h3>Download Directory</h3>
        <p className="status" style={{ marginBottom: spacing.sm, fontSize: "12px" }}>
          Temporary directory for zip file downloads. Files are deleted after extraction.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs }}>
          <label htmlFor="download-dir-input">Download Directory</label>
          <Input
            id="download-dir-input"
            value={draft?.downloadDir ?? ""}
            onChange={(event) =>
              draft && setDraft({ ...draft, downloadDir: event.target.value })
            }
            placeholder="./downloads"
          />
        </div>
      </Card>

      <Card>
        <h3>Library Directory</h3>
        <p className="status" style={{ marginBottom: spacing.sm, fontSize: "12px" }}>
          Root directory where extracted game files are stored. All scanning and library operations work from this root.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs, marginBottom: spacing.md }}>
          <label htmlFor="library-dir-input">Library Directory</label>
          <Input
            id="library-dir-input"
            value={draft?.libraryDir ?? ""}
            onChange={(event) =>
              draft && setDraft({ ...draft, libraryDir: event.target.value })
            }
            placeholder="./library"
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs }}>
          <label htmlFor="save-settings-button" style={{ visibility: "hidden" }}>Save Settings</label>
          <div style={{ display: "flex", gap: spacing.sm, alignItems: "center" }}>
            <Button
              id="save-settings-button"
              type="button"
              onClick={() => draft && saveMutation.mutate(draft)}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
            {status && <span className="status">{status}</span>}
          </div>
        </div>
      </Card>

      <Card>
        <h3>Big Picture Mode</h3>
        <p className="status" style={{ marginBottom: spacing.sm, fontSize: "12px" }}>
          Controller-friendly interface designed for TVs and couch gaming.
        </p>
        
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
          {/* Launch Big Picture Mode */}
          <div style={{ display: "flex", gap: spacing.sm, alignItems: "center" }}>
            <Button
              type="button"
              onClick={() => {
                setBigPictureEnabled(true);
                navigate("/big-picture");
              }}
            >
              🎮 Launch Big Picture Mode
            </Button>
          </div>
          
          {/* Haptic Feedback */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: spacing.sm, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={hapticFeedbackEnabled}
                onChange={(e) => setHapticFeedbackEnabled(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              <span>Enable haptic feedback (controller vibration)</span>
            </label>
          </div>
          
          {/* Grid Size */}
          <div>
            <label htmlFor="grid-size-select" style={{ display: "block", marginBottom: spacing.xs }}>
              Grid Size
            </label>
            <select
              id="grid-size-select"
              value={gridSize}
              onChange={(e) => setGridSize(e.target.value as "small" | "medium" | "large" | "auto")}
              style={{
                padding: "8px 12px",
                borderRadius: "4px",
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--ink)",
                cursor: "pointer"
              }}
            >
              <option value="auto">Auto (Dynamic)</option>
              <option value="small">Small (3 columns)</option>
              <option value="medium">Medium (4 columns)</option>
              <option value="large">Large (5 columns)</option>
            </select>
          </div>
          
          <div className="status" style={{ fontSize: "12px", lineHeight: 1.6 }}>
            <p style={{ margin: 0 }}>
              <strong>Controls:</strong> Use D-Pad or Left Stick to navigate, A to select, B to go back, X to search, Y for menu, LB/RB for pages.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h3>About</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
          <div>
            <p style={{ margin: 0, marginBottom: spacing.sm, fontSize: "14px", lineHeight: 1.6 }}>
              <strong>Jacare</strong> (Portuguese for "caiman") is an open-source desktop ROM library manager that brings your retro game collection to life.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs, fontSize: "12px", color: "var(--muted)" }}>
              <div>
                <strong style={{ color: "var(--text)" }}>Copyright © 2024 Jacare Contributors</strong>
              </div>
              <div>
                Licensed under the{" "}
                <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>
                  MIT License
                </a>
              </div>
              <div style={{ marginTop: spacing.xs }}>
                <a href="https://github.com/luandev/jacare" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>
                  View on GitHub
                </a>
              </div>
            </div>
          </div>
          <div style={{ paddingTop: spacing.sm, borderTop: "1px solid var(--border)" }}>
            <p style={{ margin: 0, marginBottom: spacing.xs, fontSize: "12px", fontWeight: 600, color: "var(--muted)" }}>
              Third-Party Attribution
            </p>
            <p style={{ margin: 0, fontSize: "12px", lineHeight: 1.6, color: "var(--muted)" }}>
              This project utilizes metadata from{" "}
              <a href="https://crocdb.net" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>
                Crocdb
              </a>{" "}
              (https://api.crocdb.net), a game metadata service. Crocdb-related code and packages are licensed under the ISC License. We acknowledge and thank the Crocdb project for providing this valuable service to the retro gaming community.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
