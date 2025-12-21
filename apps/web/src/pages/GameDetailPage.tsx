import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiGet, apiPost, API_URL } from "../lib/api";
import type { CrocdbApiResponse, CrocdbEntryResponseData, Profile, LibraryItem, JobEvent } from "@crocdesk/shared";

export default function GameDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const entryQuery = useQuery({
    queryKey: ["entry", slug],
    queryFn: () =>
      apiPost<CrocdbApiResponse<CrocdbEntryResponseData>>("/crocdb/entry", { slug }),
    enabled: Boolean(slug)
  });

  const profilesQuery = useQuery({
    queryKey: ["profiles"],
    queryFn: () => apiGet<Profile[]>("/profiles")
  });

  const ownedQuery = useQuery({
    queryKey: ["library-items"],
    queryFn: () => apiGet<LibraryItem[]>("/library/items")
  });

  const [selectedProfileId, setSelectedProfileId] = useState<string>("");

  useEffect(() => {
    if (!selectedProfileId && profilesQuery.data?.length) {
      setSelectedProfileId(profilesQuery.data[0].id);
    }
  }, [profilesQuery.data, selectedProfileId]);

  const downloadMutation = useMutation({
    mutationFn: (payload: { slug: string; profileId: string }) =>
      apiPost("/jobs/download", payload)
  });

  const entry = entryQuery.data?.data.entry;
  const profileId = selectedProfileId;
  const isOwned = !!ownedQuery.data?.some((item) => item.gameSlug === entry?.slug);
  const ownedItems = (ownedQuery.data ?? []).filter((item) => item.gameSlug === entry?.slug);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    const source = new EventSource(`${API_URL}/events`);
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as JobEvent;
        if (data.slug && data.slug === entry?.slug) {
          if (data.type === "STEP_PROGRESS" && typeof data.progress === "number") {
            setIsDownloading(true);
            setProgress(data.progress);
          }
          if (data.type === "JOB_DONE" || data.type === "JOB_FAILED") {
            setIsDownloading(false);
          }
        }
      } catch {}
    };
    return () => source.close();
  }, [entry?.slug]);

  if (!entry) {
    return (
      <section className="card">
        <h3>Loading entry...</h3>
      </section>
    );
  }

  return (
    <div className="grid" style={{ gap: "20px" }}>
      <section className="hero">
        <h1>{entry.title}</h1>
        <p>
          {entry.platform.toUpperCase()} - {entry.regions.join(", ")}
        </p>
        {entry.boxart_url && (
          <img
            src={entry.boxart_url}
            alt={`${entry.title} cover art`}
            className="hero-img"
            loading="lazy"
            style={{ maxWidth: "240px", aspectRatio: "3 / 4", objectFit: "cover", borderRadius: "12px", marginTop: "12px" }}
          />
        )}
      </section>

      <section className="card">
        <div className="row">
          <h3>Download links</h3>
          <span className="status">{entry.links.length} sources</span>
        </div>
        <div className="controls" style={{ marginTop: "12px" }}>
          <div>
            <label>Profile</label>
            <select
              value={selectedProfileId}
              onChange={(event) => setSelectedProfileId(event.target.value)}
            >
              {(profilesQuery.data ?? []).map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="list" style={{ marginTop: "12px" }}>
          {entry.links.map((link) => (
            <div className="row" key={link.url}>
              <div>
                <strong>{link.name}</strong>
                <div className="status">
                  {link.host} - {link.format} - {link.size_str}
                </div>
              </div>
              {!isOwned && !isDownloading ? (
                <button
                  onClick={() =>
                    profileId &&
                    downloadMutation.mutate({ slug: entry.slug, profileId })
                  }
                  disabled={!profileId}
                >
                  Queue Download
                </button>
              ) : (
                <div className="row" style={{ gap: 8, alignItems: "center" }}>
                  {isOwned ? <span className="status">Already in library</span> : <span className="status">Downloading…</span>}
                  {ownedItems[0]?.path && (
                    <a
                      className="link"
                      href={toFileHref(ownedItems[0].path)}
                      onClick={(e) => {
                        const p = ownedItems[0].path;
                        if (window.crocdesk?.revealInFolder) {
                          e.preventDefault();
                          window.crocdesk.revealInFolder(p);
                        }
                      }}
                    >
                      Show in Folder
                    </a>
                  )}
                </div>
              )}
              {isDownloading && (
                <div className="progress" style={{ marginTop: 8, width: "100%" }}>
                  <span style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="row">
          <h3>Media</h3>
          <span className="status">Screenshots & cover</span>
        </div>
        <MediaGrid
          coverUrl={entry.boxart_url}
          screenshots={entry.screenshots ?? []}
        />
      </section>
    </div>
  );
}

function toFileHref(p: string): string {
  const normalized = p.replace(/\\/g, "/");
  if (/^[A-Za-z]:\//.test(normalized)) {
    return `file:///${encodeURI(normalized)}`;
  }
  return `file://${encodeURI(normalized)}`;
}

function MediaGrid({ coverUrl, screenshots }: { coverUrl?: string; screenshots: string[] }) {
  const [active, setActive] = useState<string | null>(null);
  const limit = 2 * 3; // 2 per platform, up to 3 platforms (fallback: first 6)
  const items = [coverUrl, ...screenshots].filter(Boolean).slice(0, limit) as string[];

  return (
    <div>
      <div className="media-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {items.map((src) => (
          <img
            key={src}
            src={src}
            alt="Game media"
            loading="lazy"
            className="thumb"
            style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: "8px", cursor: "pointer" }}
            onClick={() => setActive(src)}
          />
        ))}
        {items.length === 0 && (
          <div className="status">No media available</div>
        )}
      </div>
      {active && (
        <div
          className="lightbox"
          onClick={() => setActive(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <img src={active} alt="Expanded media" style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: "12px" }} />
        </div>
      )}
    </div>
  );
}
