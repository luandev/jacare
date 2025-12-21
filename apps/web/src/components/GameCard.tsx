import React from "react";
import PlatformIcon from "./PlatformIcon";
import type { Manifest } from "@crocdesk/shared";

export type GameCardProps = {
  manifest: Manifest;
  artifactPath: string;
  onShowInFolder?: () => void;
};

export default function GameCard({ manifest, artifactPath, onShowInFolder }: GameCardProps) {
  const { crocdb } = manifest;
  return (
    <article className="card" style={{ minWidth: 0 }}>
      <div className="thumb-wrapper">
        <div className="thumb-placeholder">
          <PlatformIcon
            platform={crocdb.platform}
            label={crocdb.title}
            size={42}
          />
        </div>
        <div className="platform-badge" title={crocdb.platform.toUpperCase()}>
          <PlatformIcon platform={crocdb.platform} size={24} />
        </div>
      </div>
      <div className="row">
        <h3 style={{ margin: 0 }}>{crocdb.title}</h3>
      </div>
      <div className="status">{crocdb.platform.toUpperCase()}</div>
      <div className="status">{crocdb.regions?.join(", ")}</div>
      <div className="row" style={{ marginTop: "12px" }}>
        <span className="status">{manifest.artifacts[0]?.path}</span>
        <button className="link" onClick={onShowInFolder} style={{ marginLeft: 8 }}>
          Show in Folder
        </button>
      </div>
    </article>
  );
}
