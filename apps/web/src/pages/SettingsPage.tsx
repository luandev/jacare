import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiGet, apiPut } from "../lib/api";
import type { Settings } from "@crocdesk/shared";
import { useUIStore } from "../store";
import { useTheme } from "../components/ThemeProvider";
import { Card, Input, Button } from "../components/ui";
import { spacing } from "../lib/design-tokens";

export default function SettingsPage() {
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiGet<Settings>("/settings")
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
    // ThemeProvider will pick up the change automatically
  };

  return (
    <div className="grid" style={{ gap: "20px" }}>
      <section className="hero">
        <h1>Settings</h1>
        <p>Manage your CrocDesk directories, theme, and queue behavior.</p>
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
    </div>
  );
}
