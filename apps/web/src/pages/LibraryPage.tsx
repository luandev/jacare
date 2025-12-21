import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DeviceItemRecord, DeviceRecord, LibraryItem } from "@crocdesk/shared";
import { apiGet, apiPost } from "../lib/api";

export default function LibraryPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>("");

  const libraryQuery = useQuery({
    queryKey: ["library-items"],
    queryFn: () => apiGet<LibraryItem[]>("/library/items")
  });

  const devicesQuery = useQuery({
    queryKey: ["devices"],
    queryFn: () => apiGet<DeviceRecord[]>("/device/status"),
    refetchInterval: 5000
  });

  const deviceItemsQuery = useQuery({
    queryKey: ["device-items"],
    queryFn: () => apiGet<DeviceItemRecord[]>("/device/items")
  });

  const connectedDevices = useMemo(
    () => (devicesQuery.data ?? []).filter((device) => device.connected),
    [devicesQuery.data]
  );

  const transferMutation = useMutation({
    mutationFn: (payload: { libraryItemId: number; deviceId: string }) =>
      apiPost("/jobs/transfer", payload),
    onSuccess: () => {
      setStatus("Transfer queued");
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (error) => setStatus(error instanceof Error ? error.message : "Transfer failed")
  });

  const primaryDevice = connectedDevices[0];

  return (
    <div className="grid" style={{ gap: "20px" }}>
      <section className="hero">
        <h1>Library</h1>
        <p>Local files, device mirrors, and queued transfers.</p>
      </section>

      {status && <div className="status">{status}</div>}

      <section className="card">
        <div className="row">
          <h3>Devices</h3>
          <span className="badge">{devicesQuery.data?.length ?? 0}</span>
        </div>
        <div className="list" style={{ marginTop: "8px" }}>
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
          {(devicesQuery.data ?? []).length === 0 && <div className="status">No devices registered</div>}
        </div>
      </section>

      <section className="card">
        <div className="row">
          <h3>Local Library</h3>
          <span className="badge">{libraryQuery.data?.length ?? 0} items</span>
        </div>
        <div className="list" style={{ marginTop: "12px" }}>
          {(libraryQuery.data ?? []).map((item) => (
            <div className="row" key={item.id}>
              <div>
                <strong>{item.path}</strong>
                <div className="status">{item.platform ?? "Unknown"}</div>
              </div>
              <div className="row" style={{ gap: "8px" }}>
                <span className="status">{Math.round(item.size / 1024 / 1024)} MB</span>
                <button
                  type="button"
                  disabled={!primaryDevice}
                  onClick={() =>
                    primaryDevice &&
                    transferMutation.mutate({ libraryItemId: item.id, deviceId: primaryDevice.id })
                  }
                >
                  {primaryDevice ? "Transfer" : "Waiting for device"}
                </button>
              </div>
            </div>
          ))}
          {(libraryQuery.data ?? []).length === 0 && <div className="status">No items indexed yet</div>}
        </div>
      </section>

      <section className="card">
        <div className="row">
          <h3>Device Items (last known)</h3>
          <span className="badge">{deviceItemsQuery.data?.length ?? 0}</span>
        </div>
        <div className="list" style={{ marginTop: "12px" }}>
          {(deviceItemsQuery.data ?? []).map((item) => (
            <div className="row" key={item.id}>
              <div>
                <strong>{item.devicePath}</strong>
                <div className="status">Device: {item.deviceId}</div>
              </div>
              <span className="status">{item.status}</span>
            </div>
          ))}
          {(deviceItemsQuery.data ?? []).length === 0 && <div className="status">No device inventory yet</div>}
        </div>
      </section>
    </div>
  );
}
