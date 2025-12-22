import React from "react";
import PlatformIcon from "./PlatformIcon";
import type { Manifest } from "@crocdesk/shared";
import { API_URL } from "../lib/api";

export type GameCardProps = {
  manifest: Manifest;
  artifactPath: string;
  onShowInFolder?: () => void;
  actions?: React.ReactNode;
};

export default function GameCard({ manifest, artifactPath, onShowInFolder, actions }: GameCardProps) {
  const { crocdb } = manifest;
  const baseDir = dirname(artifactPath);
  const coverCandidates = ["cover.jpg", "cover.png", "cover.webp", "boxart.jpg", "boxart.png"];
  const version = manifest.createdAt ?? "";
  const coverUrls = coverCandidates.map((name) => `${API_URL}/file?path=${encodeURIComponent(joinPath(baseDir, name))}&v=${encodeURIComponent(version)}`);
  const [imgIndex, setImgIndex] = React.useState(0);
  const [imgError, setImgError] = React.useState(false);
  const currentCoverUrl = coverUrls[imgIndex];
  return (
    <article className="card" style={{ minWidth: 0 }}>
      <div className="thumb-wrapper">
        {!imgError && currentCoverUrl ? (
          <img
            src={currentCoverUrl}
            alt={`${crocdb.title} cover art`}
            className="thumb cover-img"
            loading="lazy"
            onError={() => {
              if (imgIndex < coverUrls.length - 1) {
                setImgIndex((i) => i + 1);
              } else {
                setImgError(true);
              }
            }}
          />
        ) : (
          <div className="thumb-placeholder">
            <PlatformIcon
              platform={crocdb.platform}
              label={crocdb.title}
              size={42}
            />
          </div>
        )}
        <div className="platform-badge" title={crocdb.platform.toUpperCase()}>
          <PlatformIcon platform={crocdb.platform} size={24} />
        </div>
      </div>
      <div className="row">
        <h3 className="card-title">{crocdb.title}</h3>
      </div>
      <div className="status">{crocdb.platform.toUpperCase()}</div>
      <div className="status">{crocdb.regions?.join(", ")}</div>
      <div className="row" style={{ marginTop: "12px" }}>
        <span className="status">{manifest.artifacts[0]?.path}</span>
        <button className="link" onClick={onShowInFolder} style={{ marginLeft: 8 }}>
          Show in Folder
        </button>
      </div>
      {actions && (
        <div className="row" style={{ marginTop: 8 }}>
          {actions}
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
