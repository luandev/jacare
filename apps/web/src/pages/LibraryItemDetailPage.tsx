import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { apiGet } from "../lib/api";
import type { Manifest } from "@crocdesk/shared";

export default function LibraryItemDetailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dir = params.get("dir") || "";
  const manifestPath = useMemo(() => (dir ? joinPath(dir, ".crocdesk.json") : ""), [dir]);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        if (!manifestPath) return;
        const m = await apiGet<Manifest>(`/file?path=${encodeURIComponent(manifestPath)}`);
        setManifest(m);
      } catch (e) {
        setManifest(null);
      }
    })();
  }, [manifestPath]);

  if (!dir) {
    return <section className="card"><div className="status">Missing dir</div></section>;
  }

  const coverCandidates = ["cover.jpg", "cover.png", "cover.webp", "boxart.jpg", "boxart.png"];
  const version = manifest?.createdAt ?? "";
  const coverUrls = coverCandidates.map((name) => `/file?path=${encodeURIComponent(joinPath(dir, name))}&v=${encodeURIComponent(version)}`);
  const coverUrl = coverUrls[0];

  async function handleReveal() {
    if (window.crocdesk?.revealInFolder) {
      window.crocdesk.revealInFolder(dir);
    }
  }

  async function handleDelete() {
    setStatus("Deleting...");
    try {
      const resp = await fetch(`/library/item?dir=${encodeURIComponent(dir)}`, { method: "DELETE" });
      if (!resp.ok) throw new Error("Delete failed");
      setStatus("Deleted");
      navigate(-1);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="grid" style={{ gap: 20 }}>
      <section className="hero">
        <h1>{manifest?.crocdb?.title ?? dir}</h1>
        <p>{manifest?.crocdb?.platform?.toUpperCase()}{manifest?.crocdb?.regions?.length ? ` - ${manifest!.crocdb!.regions.join(", ")}` : ""}</p>
      </section>
      <section className="card">
        <div className="row">
          <div className="thumb-wrapper" style={{ width: 200 }}>
            {coverUrl ? (
              <img src={coverUrl} alt="Cover" style={{ width: "100%", aspectRatio: "3 / 4", objectFit: "cover", borderRadius: 8 }} />
            ) : (
              <div className="thumb-placeholder" />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div className="list">
              <div className="row"><strong>Folder</strong><span className="status">{dir}</span></div>
              <div className="row"><strong>Artifacts</strong><span className="status">{manifest?.artifacts?.map(a => a.path).join(", ") ?? "N/A"}</span></div>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="secondary" onClick={handleReveal}>Show in Folder</button>
              <button onClick={handleDelete}>Delete</button>
              {status && <span className="status">{status}</span>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function joinPath(a: string, b: string): string {
  if (a.endsWith("/") || a.endsWith("\\")) return a + b;
  return a + "/" + b;
}
