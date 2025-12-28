import React, { useState } from "react";
import type { Settings } from "@crocdesk/shared";
import { 
  DEFAULT_PLATFORM_ACRONYMS, 
  DEFAULT_PLATFORM_ICONS,
  VALID_ICON_BRANDS,
  isValidAcronym 
} from "@crocdesk/shared";
import PlatformIcon from "./PlatformIcon";
import { Card, Input, Button } from "./ui";
import { spacing } from "../lib/design-tokens";

type PlatformSettingsProps = {
  settings: Settings;
  onUpdate: (updated: Settings) => void;
};

export default function PlatformSettings({ settings, onUpdate }: PlatformSettingsProps) {
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(new Set());
  
  // Get all platforms from defaults
  const allPlatforms = Object.keys(DEFAULT_PLATFORM_ACRONYMS).sort();
  
  // Get effective acronym for a platform
  const getEffectiveAcronym = (platform: string): string => {
    return settings.platformAcronyms?.[platform] || DEFAULT_PLATFORM_ACRONYMS[platform] || platform;
  };
  
  // Get effective icon for a platform
  const getEffectiveIcon = (platform: string): string => {
    return settings.platformIcons?.[platform] || DEFAULT_PLATFORM_ICONS[platform] || "generic";
  };
  
  // Check if platform has custom settings
  const hasCustomSettings = (platform: string): boolean => {
    return !!(settings.platformAcronyms?.[platform] || settings.platformIcons?.[platform]);
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
  
  // Update icon for a platform
  const updateIcon = (platform: string, icon: string) => {
    const updated = {
      ...settings,
      platformIcons: {
        ...settings.platformIcons,
        [platform]: icon
      }
    };
    onUpdate(updated);
  };
  
  // Reset platform to defaults
  const resetPlatform = (platform: string) => {
    const updatedAcronyms = { ...settings.platformAcronyms };
    const updatedIcons = { ...settings.platformIcons };
    delete updatedAcronyms[platform];
    delete updatedIcons[platform];
    
    const updated = {
      ...settings,
      platformAcronyms: updatedAcronyms,
      platformIcons: updatedIcons
    };
    onUpdate(updated);
  };
  
  // Toggle platform expansion
  const togglePlatform = (platform: string) => {
    const newExpanded = new Set(expandedPlatforms);
    if (newExpanded.has(platform)) {
      newExpanded.delete(platform);
    } else {
      newExpanded.add(platform);
    }
    setExpandedPlatforms(newExpanded);
  };
  
  return (
    <Card>
      <h3>Platform Configuration</h3>
      <p className="status" style={{ marginBottom: spacing.md, fontSize: "12px" }}>
        Customize how platforms appear in your library. Acronyms are used for folder names during unpacking.
        Icons control the visual appearance in the UI.
      </p>
      
      <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
        {allPlatforms.map((platform) => {
          const isExpanded = expandedPlatforms.has(platform);
          const isCustom = hasCustomSettings(platform);
          const acronym = getEffectiveAcronym(platform);
          const icon = getEffectiveIcon(platform);
          const acronymValue = settings.platformAcronyms?.[platform] || "";
          const isAcronymValid = !acronymValue || isValidAcronym(acronymValue);
          
          return (
            <div
              key={platform}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "6px",
                overflow: "hidden"
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: spacing.sm,
                  padding: spacing.sm,
                  cursor: "pointer",
                  backgroundColor: isCustom ? "var(--surface-active)" : "transparent"
                }}
                onClick={() => togglePlatform(platform)}
              >
                <PlatformIcon platform={platform} brand={icon} size={24} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: "14px" }}>
                    {platform}
                    {isCustom && (
                      <span style={{ 
                        marginLeft: spacing.xs, 
                        fontSize: "11px", 
                        color: "var(--primary)",
                        fontWeight: 600 
                      }}>
                        (Customized)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                    Folder: <code style={{ 
                      backgroundColor: "var(--surface-active)", 
                      padding: "2px 6px", 
                      borderRadius: "3px" 
                    }}>{acronym}/Game Name</code>
                  </div>
                </div>
                <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                  {isExpanded ? "▼" : "▶"}
                </div>
              </div>
              
              {isExpanded && (
                <div style={{ 
                  padding: spacing.md, 
                  borderTop: "1px solid var(--border)",
                  backgroundColor: "var(--surface)"
                }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
                    <div>
                      <label 
                        htmlFor={`acronym-${platform}`}
                        style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: spacing.xs }}
                      >
                        Folder Acronym
                      </label>
                      <div style={{ display: "flex", gap: spacing.xs, alignItems: "start" }}>
                        <div style={{ flex: 1 }}>
                          <Input
                            id={`acronym-${platform}`}
                            value={acronymValue}
                            onChange={(e) => updateAcronym(platform, e.target.value)}
                            placeholder={DEFAULT_PLATFORM_ACRONYMS[platform] || platform}
                            style={{
                              borderColor: isAcronymValid ? undefined : "var(--error, #ef4444)"
                            }}
                          />
                          {!isAcronymValid && (
                            <div style={{ 
                              fontSize: "11px", 
                              color: "var(--error, #ef4444)", 
                              marginTop: "4px" 
                            }}>
                              Must be 2-12 characters (a-z, 0-9, -, _)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label 
                        htmlFor={`icon-${platform}`}
                        style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: spacing.xs }}
                      >
                        Icon Brand
                      </label>
                      <select
                        id={`icon-${platform}`}
                        value={settings.platformIcons?.[platform] || ""}
                        onChange={(e) => updateIcon(platform, e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          backgroundColor: "var(--surface)",
                          color: "var(--text)",
                          fontSize: "14px",
                          cursor: "pointer"
                        }}
                      >
                        <option value="">Default ({DEFAULT_PLATFORM_ICONS[platform] || "generic"})</option>
                        {VALID_ICON_BRANDS.map((brand) => (
                          <option key={brand} value={brand}>
                            {brand}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div style={{ display: "flex", gap: spacing.sm }}>
                      {isCustom && (
                        <Button
                          type="button"
                          onClick={() => resetPlatform(platform)}
                          style={{
                            fontSize: "12px",
                            padding: "6px 12px",
                            backgroundColor: "var(--surface-active)",
                            color: "var(--text)"
                          }}
                        >
                          Reset to Defaults
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
