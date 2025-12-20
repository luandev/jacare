import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiGet, apiPut } from "../lib/api";
import type { LibraryRoot, Profile, Settings } from "@crocdesk/shared";

function createRoot(): LibraryRoot {
  return {
    id: crypto.randomUUID(),
    path: "",
    platform: ""
  };
}

export default function SettingsPage() {
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiGet<Settings>("/settings")
  });
  const profilesQuery = useQuery({
    queryKey: ["profiles"],
    queryFn: () => apiGet<Profile[]>("/profiles")
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

  function updateRoot(index: number, next: LibraryRoot) {
    if (!draft) return;
    const roots = [...draft.libraryRoots];
    roots[index] = next;
    setDraft({ ...draft, libraryRoots: roots });
  }

  function addRoot() {
    if (!draft) return;
    setDraft({ ...draft, libraryRoots: [...draft.libraryRoots, createRoot()] });
  }

  return (
    <div className="grid" style={{ gap: "20px" }}>
      <section className="hero">
        <h1>Settings</h1>
        <p>Manage local roots, download paths, and profiles.</p>
      </section>

      <section className="card">
        <h3>Library Roots</h3>
        <div className="list" style={{ marginTop: "12px" }}>
          {(draft?.libraryRoots ?? []).map((root, index) => (
            <div className="grid cols-2" key={root.id}>
              <div>
                <label>Path</label>
                <input
                  value={root.path}
                  onChange={(event) =>
                    updateRoot(index, { ...root, path: event.target.value })
                  }
                  placeholder="D:\\roms"
                />
              </div>
              <div>
                <label>Platform (optional)</label>
                <input
                  value={root.platform ?? ""}
                  onChange={(event) =>
                    updateRoot(index, { ...root, platform: event.target.value })
                  }
                  placeholder="ps1"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="controls" style={{ marginTop: "12px" }}>
          <button className="secondary" type="button" onClick={addRoot}>
            Add Root
          </button>
        </div>
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

      <section className="card">
        <h3>Profiles</h3>
        <div className="list" style={{ marginTop: "12px" }}>
          {(profilesQuery.data ?? []).map((profile) => (
            <div className="row" key={profile.id}>
              <div>
                <strong>{profile.name}</strong>
                <div className="status">{profile.id}</div>
              </div>
              <span className="badge">
                {Object.keys(profile.platforms ?? {}).length} platforms
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
