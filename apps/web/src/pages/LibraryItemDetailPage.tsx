import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { apiGet, API_URL } from "../lib/api";
import type { Manifest } from "@crocdesk/shared";
import { DetailLayout } from "../components/DetailLayout";
import { MediaGrid } from "../components/MediaGrid";

export default function LibraryItemDetailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const _location = useLocation();
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
      } catch {
        setManifest(null);
      }
    })();
  }, [manifestPath]);

  if (!dir) {
    return <section className="card"><div className="status">Missing dir</div></section>;
  }

  const coverCandidates = ["cover.jpg", "cover.png", "cover.webp", "boxart.jpg", "boxart.png"];
  const version = manifest?.createdAt ?? "";
  const coverUrls = coverCandidates.map(
    (name) =>
      `${API_URL}/file?path=${encodeURIComponent(
        joinPath(dir, name)
      )}&v=${encodeURIComponent(version)}`
  );
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

  const title = manifest?.crocdb?.title ?? dir;
  const subtitle = manifest?.crocdb
    ? `${manifest.crocdb.platform.toUpperCase()}${
        manifest.crocdb.regions?.length ? ` - ${manifest.crocdb.regions.join(", ")}` : ""
      }`
    : dir;

  const screenshots: string[] = []; // For now, library items only have local cover; no extra screenshots stored.

  return (
    <DetailLayout
      title={title}
      subtitle={subtitle}
      heroMedia={
        coverUrl ? (
          <img
            src={coverUrl}
            alt="Cover"
            style={{
              width: "200px",
              aspectRatio: "3 / 4",
              objectFit: "cover",
              borderRadius: 8,
              marginTop: 12
            }}
          />
        ) : null
      }
      headerActions={
        <div className="row">
          <strong>Library item</strong>
          {status && <span className="status">{status}</span>}
        </div>
      }
      sidebar={
        <>
          <div className="row">
            <h3>Media</h3>
            <span className="status">Local cover</span>
          </div>
          <MediaGrid coverUrl={coverUrl} screenshots={screenshots} />
        </>
      }
    >
      <div className="list">
        <div className="row">
          <strong>Folder</strong>
          <span className="status">{dir}</span>
        </div>
        <div className="row">
          <strong>Artifacts</strong>
          <span className="status">
            {manifest?.artifacts?.map((a) => a.path).join(", ") ?? "N/A"}
          </span>
        </div>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <button className="secondary" onClick={handleReveal}>
          Show in Folder
        </button>
        <button onClick={handleDelete}>Delete</button>
      </div>
    </DetailLayout>
  );
}

function joinPath(a: string, b: string): string {
  if (a.endsWith("/") || a.endsWith("\\")) return a + b;
  return a + "/" + b;
}
