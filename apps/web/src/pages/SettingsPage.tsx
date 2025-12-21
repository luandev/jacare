import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut } from "../lib/api";
import type { DeviceRecord, LibraryRoot, Profile, Settings } from "@crocdesk/shared";

function createRoot(): LibraryRoot {
  return {
    id: crypto.randomUUID(),
    path: "",
    platform: ""
  };
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiGet<Settings>("/settings")
  });
  const profilesQuery = useQuery({
    queryKey: ["profiles"],
    queryFn: () => apiGet<Profile[]>("/profiles")
  });
  const devicesQuery = useQuery({
    queryKey: ["devices"],
    queryFn: () => apiGet<DeviceRecord[]>("/device/status"),
    refetchInterval: 5000
  });

  const [draft, setDraft] = useState<Settings | null>(null);
  const [status, setStatus] = useState<string>("");
  const [deviceForm, setDeviceForm] = useState<{ name: string; path: string; type: "usb" | "smb" }>(
    { name: "", path: "", type: "usb" }
  );

  useEffect(() => {
    if (settingsQuery.data) {
      setDraft(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (nextSettings: Settings) => apiPut("/settings", nextSettings),
    onSuccess: () => setStatus("Settings saved")
  });

  const registerDeviceMutation = useMutation({
    mutationFn: () => apiPost("/device/register", deviceForm),
    onSuccess: () => {
      setStatus("Device registered");
      setDeviceForm({ name: "", path: "", type: "usb" });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
    onError: (error) => setStatus(error instanceof Error ? error.message : "Failed to register")
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
        <label style={{ marginTop: "12px" }}>Staging Directory</label>
        <input
          value={draft?.stagingDir ?? ""}
          onChange={(event) =>
            draft && setDraft({ ...draft, stagingDir: event.target.value })
          }
          placeholder="./tmp"
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
        <h3>Queue Limits</h3>
        <div className="grid cols-2" style={{ gap: "12px" }}>
          <div>
            <label>Downloads</label>
            <input
              type="number"
              min={1}
              value={draft?.queue?.maxConcurrentDownloads ?? 2}
              onChange={(event) =>
                draft &&
                setDraft({
                  ...draft,
                  queue: {
                    ...draft.queue,
                    maxConcurrentDownloads: Number(event.target.value)
                  }
                })
              }
            />
          </div>
          <div>
            <label>Transfers</label>
            <input
              type="number"
              min={1}
              value={draft?.queue?.maxConcurrentTransfers ?? 1}
              onChange={(event) =>
                draft &&
                setDraft({
                  ...draft,
                  queue: {
                    ...draft.queue,
                    maxConcurrentTransfers: Number(event.target.value)
                  }
                })
              }
            />
          </div>
        </div>
      </section>

      <section className="card">
        <h3>Devices</h3>
        <div className="grid cols-3" style={{ gap: "8px", marginTop: "8px" }}>
          <div>
            <label>Name</label>
            <input
              value={deviceForm.name}
              onChange={(event) => setDeviceForm({ ...deviceForm, name: event.target.value })}
              placeholder="SD Card"
            />
          </div>
          <div>
            <label>Path</label>
            <input
              value={deviceForm.path}
              onChange={(event) => setDeviceForm({ ...deviceForm, path: event.target.value })}
              placeholder="F:\\ or \\SERVER\\Share"
            />
          </div>
          <div>
            <label>Type</label>
            <select
              value={deviceForm.type}
              onChange={(event) =>
                setDeviceForm({ ...deviceForm, type: event.target.value as "usb" | "smb" })
              }
            >
              <option value="usb">USB / Drive Letter</option>
              <option value="smb">SMB Share</option>
            </select>
          </div>
        </div>
        <div className="controls" style={{ marginTop: "8px" }}>
          <button type="button" onClick={() => registerDeviceMutation.mutate()}>
            Register Device
          </button>
        </div>
        <div className="list" style={{ marginTop: "12px" }}>
          {(devicesQuery.data ?? []).map((device) => (
            <div className="row" key={device.id}>
              <div>
                <strong>{device.name}</strong>
                <div className="status">{device.path}</div>
              </div>
              <span className={device.connected ? "badge" : "status"}>
                {device.connected ? "Connected" : "Disconnected"}
              </span>
            </div>
          ))}
          {(devicesQuery.data ?? []).length === 0 && <div className="status">No devices yet</div>}
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
