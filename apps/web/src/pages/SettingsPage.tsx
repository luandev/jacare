import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiGet, apiPut } from "../lib/api";
import type { CrocdbApiResponse, CrocdbPlatformsResponseData, Settings } from "@crocdesk/shared";
import { useUIStore } from "../store";
import { useTheme } from "../components/ThemeProvider";
import { Card, Input, Button } from "../components/ui";
import { spacing } from "../lib/design-tokens";
import { useSettings } from "../hooks/useSettings";

export default function SettingsPage() {
  const settingsQuery = useSettings();

  const platformsQuery = useQuery({
    queryKey: ["platforms"],
    queryFn: () => apiGet<CrocdbApiResponse<CrocdbPlatformsResponseData>>("/crocdb/platforms")
  });

  const [draft, setDraft] = useState<Settings | null>(null);
  const [status, setStatus] = useState<string>("");
  
  const theme = useUIStore((state) => state.theme);
  const setThemePreference = useUIStore((state) => state.setTheme);
  const { setTheme: setThemeObject } = useTheme();

  useEffect(() => {
    if (settingsQuery.data) {
      setDraft(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (nextSettings: Settings) => apiPut("/settings", nextSettings),
    onSuccess: () => setStatus("Settings saved")
  });

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setThemePreference(newTheme);
    // Mark that user has explicitly set a theme preference
    localStorage.setItem("jacare:theme-explicit", "true");
    // ThemeProvider will pick up the change automatically
  };

  const updatePlatformShortName = (platform: string, value: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...(prev.platformShortNames ?? {}) };
      if (value.trim()) {
        next[platform] = value;
      } else {
        delete next[platform];
      }
      return { ...prev, platformShortNames: next };
    });
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
        <h3>Platform Short Names</h3>
        <p className="status" style={{ marginBottom: spacing.sm, fontSize: "12px" }}>
          Override how platform labels appear across the app (badges, queue, detail views). Leave a field blank to fall back to
          the Crocdb name.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
          {platformsQuery.isPending && <span className="status">Loading platforms…</span>}
          {platformsQuery.isError && <span className="status">Failed to load platforms</span>}
          {platformsQuery.data && (
            <div style={{ display: "grid", gap: spacing.sm }}>
              {Object.entries(platformsQuery.data.data.platforms).map(([id, data]) => {
                const value = draft?.platformShortNames?.[id] ?? "";
                return (
                  <div key={id} style={{ display: "flex", gap: spacing.sm, alignItems: "center" }}>
                    <div style={{ flex: "0 0 180px" }}>
                      <div style={{ fontWeight: 600 }}>{data.name}</div>
                      <div className="status">{id.toUpperCase()}</div>
                    </div>
                    <Input
                      value={value}
                      onChange={(event) => updatePlatformShortName(id, event.target.value)}
                      placeholder={data.name}
                      aria-label={`Short name for ${data.name}`}
                    />
                  </div>
                );
              })}
            </div>
          )}
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
    </div>
  );
}
