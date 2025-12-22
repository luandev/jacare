import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiGet, apiPut } from "../lib/api";
import type { Settings } from "@crocdesk/shared";

export default function SettingsPage() {
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiGet<Settings>("/settings")
  });

  const [draft, setDraft] = useState<Settings | null>(null);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    if (settingsQuery.data) {
      setDraft(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (nextSettings: Settings) => apiPut("/settings", nextSettings),
    onSuccess: () => setStatus("Settings saved")
  });

  return (
    <div className="grid" style={{ gap: "20px" }}>
      <section className="hero">
        <h1>Settings</h1>
        <p>Manage your CrocDesk directories and queue behavior.</p>
      </section>

      <section className="card">
        <h3>Download Directory</h3>
        <p className="status" style={{ marginBottom: "8px", fontSize: "12px" }}>
          Temporary directory for zip file downloads. Files are deleted after extraction.
        </p>
        <input
          value={draft?.downloadDir ?? ""}
          onChange={(event) =>
            draft && setDraft({ ...draft, downloadDir: event.target.value })
          }
          placeholder="./downloads"
        />
      </section>

      <section className="card">
        <h3>Library Directory</h3>
        <p className="status" style={{ marginBottom: "8px", fontSize: "12px" }}>
          Root directory where extracted game files are stored. All scanning and library operations work from this root.
        </p>
        <input
          value={draft?.libraryDir ?? ""}
          onChange={(event) =>
            draft && setDraft({ ...draft, libraryDir: event.target.value })
          }
          placeholder="./library"
        />
        <div className="controls" style={{ marginTop: "12px" }}>
          <button
            type="button"
            onClick={() => draft && saveMutation.mutate(draft)}
          >
            Save Settings
          </button>
          {status && <span className="status">{status}</span>}
        </div>
      </section>
    </div>
  );
}
