import React from "react";
import type { Settings } from "@crocdesk/shared";
import { 
  DEFAULT_PLATFORM_ACRONYMS, 
  DEFAULT_PLATFORM_ICONS
} from "@crocdesk/shared";
import PlatformIcon from "./PlatformIcon";
import { Card, Input } from "./ui";
import { spacing } from "../lib/design-tokens";

type PlatformSettingsProps = {
  settings: Settings;
  onUpdate: (updated: Settings) => void;
};

export default function PlatformSettings({ settings, onUpdate }: PlatformSettingsProps) {
  // Show a few example platforms for demonstration
  const examplePlatforms = ["snes", "playstation", "n64", "genesis"];
  
  // Get effective acronym for a platform
  const getEffectiveAcronym = (platform: string): string => {
    return settings.platformAcronyms?.[platform] || DEFAULT_PLATFORM_ACRONYMS[platform] || platform;
  };
  
  // Get effective icon for a platform
  const getEffectiveIcon = (platform: string): string => {
    return settings.platformIcons?.[platform] || DEFAULT_PLATFORM_ICONS[platform] || "generic";
  };
  
  // Update acronym for a platform
  const updateAcronym = (platform: string, acronym: string) => {
    const trimmed = acronym.trim();
    const updated = {
      ...settings,
      platformAcronyms: {
        ...settings.platformAcronyms,
        [platform]: trimmed
      }
    };
    onUpdate(updated);
  };
  
  return (
    <Card>
      <h3>Platform Configuration</h3>
      <p className="status" style={{ marginBottom: spacing.md, fontSize: "12px" }}>
        Customize how platforms appear in your library. Acronyms are used for folder names during unpacking (e.g., <code>snes/Game Name</code>).
      </p>
      
      <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
        {examplePlatforms.map((platform) => {
          const acronym = getEffectiveAcronym(platform);
          const icon = getEffectiveIcon(platform);
          const acronymValue = settings.platformAcronyms?.[platform] || "";
          
          return (
            <div
              key={platform}
              style={{
                display: "flex",
                alignItems: "center",
                gap: spacing.sm,
                padding: spacing.sm,
                border: "1px solid var(--border)",
                borderRadius: "6px"
              }}
            >
              <PlatformIcon platform={platform} brand={icon} size={32} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: "14px", marginBottom: "4px" }}>
                  {platform}
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                  Folder: <code style={{ 
                    backgroundColor: "var(--surface-active)", 
                    padding: "2px 6px", 
                    borderRadius: "3px" 
                  }}>{acronym}/Game Name</code>
                </div>
              </div>
              <div style={{ width: "120px" }}>
                <Input
                  value={acronymValue}
                  onChange={(e) => updateAcronym(platform, e.target.value)}
                  placeholder={DEFAULT_PLATFORM_ACRONYMS[platform] || platform}
                  style={{ fontSize: "13px", padding: "6px 8px" }}
                />
              </div>
            </div>
          );
        })}
        <p style={{ fontSize: "11px", color: "var(--muted)", marginTop: spacing.xs }}>
          Showing {examplePlatforms.length} example platforms. All {Object.keys(DEFAULT_PLATFORM_ACRONYMS).length} platforms can be configured via settings.
        </p>
      </div>
    </Card>
  );
}
