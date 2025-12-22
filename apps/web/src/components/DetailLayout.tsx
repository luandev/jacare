import React from "react";
import { Card } from "./ui";
import { spacing, radius } from "../lib/design-tokens";

type DetailLayoutProps = {
  title: string;
  subtitle?: React.ReactNode;
  heroMedia?: React.ReactNode;
  headerActions?: React.ReactNode;
  children?: React.ReactNode;
  sidebar?: React.ReactNode;
};

export function DetailLayout({
  title,
  subtitle,
  heroMedia,
  headerActions,
  children,
  sidebar
}: DetailLayoutProps) {
  return (
    <Card style={{ padding: spacing["3xl"] }}>
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "minmax(280px, 380px) 1fr", 
        gap: spacing["3xl"],
        alignItems: "flex-start"
      }}
      className="detail-layout-grid"
      >
        {/* Left Column: Large Game Cover */}
        <div style={{ position: "sticky", top: spacing.xl }}>
          {heroMedia ? (
            <div style={{ 
              width: "100%",
              display: "flex",
              justifyContent: "center"
            }}>
              {React.isValidElement(heroMedia) ? (
                React.cloneElement(heroMedia as React.ReactElement<any>, {
                  style: {
                    width: "100%",
                    maxWidth: "100%",
                    aspectRatio: "3 / 4",
                    objectFit: "cover",
                    borderRadius: radius.lg,
                    boxShadow: "var(--shadow-md)",
                    ...((heroMedia as React.ReactElement<any>).props?.style || {})
                  }
                })
              ) : (
                <div style={{
                  width: "100%",
                  aspectRatio: "3 / 4",
                  borderRadius: radius.lg,
                  overflow: "hidden",
                  boxShadow: "var(--shadow-md)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "var(--bg-alt)"
                }}>
                  {heroMedia}
                </div>
              )}
            </div>
          ) : (
            <div style={{
              width: "100%",
              aspectRatio: "3 / 4",
              borderRadius: radius.lg,
              backgroundColor: "var(--bg-alt)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--muted)"
            }}>
              No cover available
            </div>
          )}
        </div>

        {/* Right Column: All Information */}
        <div style={{ display: "flex", flexDirection: "column", gap: spacing["2xl"], minWidth: 0 }}>
          {/* Title and Subtitle */}
          <div>
            <h1 style={{ margin: 0, marginBottom: spacing.sm, fontSize: "28px", lineHeight: 1.2 }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "14px" }}>
                {subtitle}
              </p>
            )}
          </div>

          {/* Download Links Section */}
          {children && (
            <div>
              {headerActions && (
                <div className="row" style={{ marginBottom: spacing.lg, alignItems: "center" }}>
                  {headerActions}
                </div>
              )}
              {children}
            </div>
          )}

          {/* Media Section */}
          {sidebar && (
            <div>
              {sidebar}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}







