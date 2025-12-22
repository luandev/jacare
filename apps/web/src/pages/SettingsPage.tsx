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
        <p>Manage your CrocDesk download directory and queue behavior.</p>
      </section>

      <section className="card">
        <h3>Download Directory</h3>
        <input
          value={draft?.downloadDir ?? ""}
          onChange={(event) =>
            draft && setDraft({ ...draft, downloadDir: event.target.value })
          }
          placeholder="./downloads"
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
