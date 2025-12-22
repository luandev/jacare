import React from "react";

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
    <div className="grid" style={{ gap: 20 }}>
      <section className="hero">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
        {heroMedia}
      </section>

      <section className="card">
        {headerActions && (
          <div className="row" style={{ marginBottom: 12 }}>
            {headerActions}
          </div>
        )}
        {children}
      </section>

      {sidebar && (
        <section className="card">
          {sidebar}
        </section>
      )}
    </div>
  );
}


