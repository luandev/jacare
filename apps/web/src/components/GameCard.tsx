import React from "react";
import { Link, type Location } from "react-router-dom";
import PlatformIcon from "./PlatformIcon";
import DownloadProgress from "./DownloadProgress";
import type { Manifest, CrocdbEntry, CrocdbPlatformsResponseData } from "@crocdesk/shared";
import { API_URL } from "../lib/api";
import type { SpeedDataPoint } from "../hooks/useDownloadProgress";

export type GameCardProps = {
  // Data source - either entry (BrowsePage) or manifest (LibraryPage)
  entry?: CrocdbEntry;
  manifest?: Manifest;
  artifactPath?: string;
  
  // State
  isOwned?: boolean;
  isDownloading?: boolean;
  downloadProgress?: number;
  downloadSpeedHistory?: SpeedDataPoint[];
  downloadBytes?: { downloaded: number; total: number } | null;
  
  // Handlers
  onDownload?: () => void;
  onShowInFolder?: () => void;
  actions?: React.ReactNode;
  
  // Additional data
  platformsData?: CrocdbPlatformsResponseData;
  location?: Location;
  
  // Styling
  style?: React.CSSProperties;
};

export default function GameCard({
  entry,
  manifest,
  artifactPath,
  isOwned = false,
  isDownloading = false,
  downloadProgress,
  downloadSpeedHistory = [],
  downloadBytes = null,
  onDownload,
  onShowInFolder,
  actions,
  platformsData,
  location,
  style
}: GameCardProps) {
  // Normalize data from either source
  const title = entry?.title ?? manifest?.crocdb.title ?? "";
  const platform = entry?.platform ?? manifest?.crocdb.platform ?? "";
  const regions = entry?.regions ?? manifest?.crocdb.regions ?? [];
  const slug = entry?.slug ?? manifest?.crocdb.slug ?? "";
  const boxartUrl = entry?.boxart_url;
  
  // Determine cover image source
  const [imgIndex, setImgIndex] = React.useState(0);
  const [imgError, setImgError] = React.useState(false);
  
  let coverUrl: string | undefined;
  let coverUrls: string[] = [];
  
  if (entry && boxartUrl) {
    // BrowsePage: use boxart_url directly
    coverUrl = boxartUrl;
  } else if (manifest && artifactPath) {
    // LibraryPage: try local cover files
    const baseDir = dirname(artifactPath);
    const coverCandidates = ["cover.jpg", "cover.png", "cover.webp", "boxart.jpg", "boxart.png"];
    const version = manifest.createdAt ?? "";
    coverUrls = coverCandidates.map((name) => 
      `${API_URL}/file?path=${encodeURIComponent(joinPath(baseDir, name))}&v=${encodeURIComponent(version)}`
    );
    coverUrl = coverUrls[imgIndex];
  }
  
  const platformName = platformsData?.platforms?.[platform]?.name ?? platform;
  const platformBrand = platformsData?.platforms?.[platform]?.brand;
  
  const handleImageError = () => {
    if (coverUrls.length > 0 && imgIndex < coverUrls.length - 1) {
      setImgIndex((i) => i + 1);
    } else {
      setImgError(true);
    }
  };
  
  // Determine detail link - prefer entry link (BrowsePage) over manifest link (LibraryPage)
  const detailLink = entry && slug ? `/game/${slug}` : undefined;
  const libraryDetailLink = !entry && manifest && artifactPath ? `/library/item?dir=${encodeURIComponent(dirname(artifactPath))}` : undefined;
  const linkTo = detailLink || libraryDetailLink;
  
  return (
    <article className="card" style={{ minWidth: 0, maxWidth: 320, margin: "0 auto", ...style }}>
      <div className="thumb-wrapper">
        {linkTo && location ? (
          <Link
            to={linkTo}
            state={{ backgroundLocation: location }}
            aria-label={`Open ${title} details`}
          >
            {!imgError && coverUrl ? (
              <img
                src={coverUrl}
                alt={`${title} cover art`}
                className="thumb cover-img"
                loading="lazy"
                onError={handleImageError}
              />
            ) : (
              <div className="thumb-placeholder">
                <PlatformIcon
                  platform={platform}
                  brand={platformBrand}
                  label={title}
                  size={42}
                />
              </div>
            )}
          </Link>
        ) : (
          <>
            {!imgError && coverUrl ? (
              <img
                src={coverUrl}
                alt={`${title} cover art`}
                className="thumb cover-img"
                loading="lazy"
                onError={handleImageError}
              />
            ) : (
              <div className="thumb-placeholder">
                <PlatformIcon
                  platform={platform}
                  brand={platformBrand}
                  label={title}
                  size={42}
                />
              </div>
            )}
          </>
        )}
        <div className="platform-badge" title={platform.toUpperCase()}>
          <PlatformIcon
            platform={platform}
            brand={platformBrand}
            label={platformName}
            size={24}
          />
        </div>
      </div>
      <div className="row">
        <h3 style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {linkTo && location ? (
            <Link to={linkTo} state={{ backgroundLocation: location }}>
              {title}
            </Link>
          ) : (
            title
          )}
        </h3>
        {isOwned && <span className="badge">Owned</span>}
        {!isOwned && isDownloading && <span className="badge">Downloading…</span>}
      </div>
      <div className="status">{platform.toUpperCase()}</div>
      {regions.length > 0 && <div className="status">{regions.join(", ")}</div>}
      
      {/* Library-specific: artifact path */}
      {manifest && artifactPath && (
        <div className="row" style={{ marginTop: 8 }}>
          <span className="status">{manifest.artifacts[0]?.path}</span>
          {onShowInFolder && (
            <button className="link" onClick={onShowInFolder} style={{ marginLeft: 8 }}>
              Show in Folder
            </button>
          )}
        </div>
      )}
      
      {/* Actions */}
      <div className="row" style={{ marginTop: 8, flexWrap: "wrap", gap: 8 }}>
        {actions ? (
          actions
        ) : (
          <>
            {!isOwned && !isDownloading && onDownload && (
              <button onClick={onDownload}>
                Queue Download
              </button>
            )}
            {linkTo && location && (
              <Link
                className="link"
                to={linkTo}
                state={{ backgroundLocation: location }}
              >
                Details
              </Link>
            )}
            {isOwned && onShowInFolder && (
              <a
                className="link"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onShowInFolder();
                }}
              >
                Show in Folder
              </a>
            )}
          </>
        )}
      </div>
      
      {/* Download progress */}
      {isDownloading && (
        <div style={{ marginTop: 8 }}>
          <DownloadProgress
            speedHistory={downloadSpeedHistory}
            currentBytes={downloadBytes}
            currentProgress={downloadProgress}
            compact={true}
          />
        </div>
      )}
    </article>
  );
}

function dirname(p: string): string {
  const idx = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  return idx >= 0 ? p.slice(0, idx) : ".";
}

function joinPath(a: string, b: string): string {
  if (a.endsWith("/") || a.endsWith("\\")) return a + b;
  return a + "/" + b;
}
