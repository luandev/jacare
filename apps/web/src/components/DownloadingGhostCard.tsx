import { useQuery } from "@tanstack/react-query";
import type { Location } from "react-router-dom";
import { apiPost } from "../lib/api";
import type { CrocdbApiResponse, CrocdbEntryResponseData } from "@crocdesk/shared";
import GameCard from "./GameCard";
import { useDownloadProgressStore } from "../store";

type DownloadingGhostCardProps = {
  slug: string;
  location?: Location;
};

export function DownloadingGhostCard({ slug, location }: DownloadingGhostCardProps) {
  const entryQuery = useQuery({
    queryKey: ["entry", slug],
    queryFn: () =>
      apiPost<CrocdbApiResponse<CrocdbEntryResponseData>>("/crocdb/entry", { slug }),
    enabled: Boolean(slug)
  });
  
  const progressBySlug = useDownloadProgressStore((state) => state.progressBySlug);
  const speedDataBySlug = useDownloadProgressStore((state) => state.speedDataBySlug);
  const bytesBySlug = useDownloadProgressStore((state) => state.bytesBySlug);
  
  const entry = entryQuery.data?.data.entry;
  if (!entry) return null;
  
  const progress = progressBySlug[slug] ?? 0;
  const speedHistory = speedDataBySlug[slug] || [];
  const downloadBytes = bytesBySlug[slug];
  
  return (
    <div style={{ opacity: 0.7, position: "relative" }}>
      <GameCard
        entry={entry}
        isDownloading={true}
        downloadProgress={progress}
        downloadSpeedHistory={speedHistory}
        downloadBytes={downloadBytes}
        location={location}
        style={{
          border: "2px dashed var(--border-strong)",
          backgroundColor: "var(--bg-alt)"
        }}
      />
      <div style={{
        position: "absolute",
        top: "8px",
        right: "8px",
        padding: "4px 8px",
        backgroundColor: "var(--badge-warning-bg)",
        color: "var(--badge-warning-ink)",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: 600,
        textTransform: "uppercase",
        boxShadow: "var(--shadow-sm)"
      }}>
        Downloading
      </div>
    </div>
  );
}



