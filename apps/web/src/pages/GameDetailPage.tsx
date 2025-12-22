import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiGet, apiPost, API_URL } from "../lib/api";
import type { CrocdbApiResponse, CrocdbEntryResponseData, LibraryItem, JobEvent } from "@crocdesk/shared";
import { DetailLayout } from "../components/DetailLayout";
import { MediaGrid } from "../components/MediaGrid";

export default function GameDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const entryQuery = useQuery({
    queryKey: ["entry", slug],
    queryFn: () =>
      apiPost<CrocdbApiResponse<CrocdbEntryResponseData>>("/crocdb/entry", { slug }),
    enabled: Boolean(slug)
  });

  const ownedQuery = useQuery({
    queryKey: ["library-items"],
    queryFn: () => apiGet<LibraryItem[]>("/library/items")
  });

  const downloadMutation = useMutation({
    mutationFn: (payload: { slug: string; linkIndex?: number }) =>
      apiPost("/jobs/download", payload)
  });

  const entry = entryQuery.data?.data.entry;
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
    <DetailLayout
      title={entry.title}
      subtitle={`${entry.platform.toUpperCase()} - ${entry.regions.join(", ")}`}
      heroMedia={
        entry.boxart_url && (
          <img
            src={entry.boxart_url}
            alt={`${entry.title} cover art`}
            className="hero-img"
            loading="lazy"
            style={{
              maxWidth: "240px",
              aspectRatio: "3 / 4",
              objectFit: "cover",
              borderRadius: "12px",
              marginTop: "12px"
            }}
          />
        )
      }
      headerActions={
        <div className="row">
          <h3>Download links</h3>
          <span className="status">{entry.links.length} sources</span>
        </div>
      }
      sidebar={
        <>
          <div className="row">
            <h3>Media</h3>
            <span className="status">Screenshots & cover</span>
          </div>
          <MediaGrid coverUrl={entry.boxart_url} screenshots={entry.screenshots ?? []} />
        </>
      }
    >
      <div className="list" style={{ marginTop: "12px" }}>
        {entry.links.map((link, idx) => (
          <div className="row" key={link.url}>
            <div>
              <strong>{link.name}</strong>
              <div className="status">
                {link.host} - {link.format} - {link.size_str}
              </div>
            </div>
            {!isOwned && !isDownloading ? (
              <button onClick={() => downloadMutation.mutate({ slug: entry.slug, linkIndex: idx })}>
                Queue Download
              </button>
            ) : (
              <div className="row" style={{ gap: 8, alignItems: "center" }}>
                {isOwned ? (
                  <span className="status">Already in library</span>
                ) : (
                  <span className="status">Downloading…</span>
                )}
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
    </DetailLayout>
  );
}

function toFileHref(p: string): string {
  const normalized = p.replace(/\\/g, "/");
  if (/^[A-Za-z]:\//.test(normalized)) {
    return `file:///${encodeURI(normalized)}`;
  }
  return `file://${encodeURI(normalized)}`;
}
