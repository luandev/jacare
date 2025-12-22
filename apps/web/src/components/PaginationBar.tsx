import { useEffect, useState } from "react";

export type PaginationBarProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onColumnsChange?: (columns: number) => void;
  showGridControls?: boolean;
  storageKey?: string;
};

const COLUMN_OPTIONS = [2, 3, 4, 5, 6];

export default function PaginationBar({
  currentPage,
  totalPages,
  onPageChange,
  onColumnsChange,
  showGridControls = true,
  storageKey = "crocdesk:gridColumns"
}: PaginationBarProps) {
  const [columns, setColumns] = useState(() => {
    if (showGridControls && onColumnsChange) {
      const saved = localStorage.getItem(storageKey);
      return saved ? parseInt(saved, 10) : 3;
    }
    return 3;
  });

  useEffect(() => {
    if (showGridControls && onColumnsChange) {
      onColumnsChange(columns);
      localStorage.setItem(storageKey, columns.toString());
    }
  }, [columns, showGridControls, onColumnsChange, storageKey]);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function scrollToBottom() {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  }

  if (totalPages <= 1 && !showGridControls) {
    return null;
  }

  return (
    <section className="card pagination-bar">
      <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {showGridControls && onColumnsChange && (
            <div className="row" style={{ gap: 4, alignItems: "center" }}>
              <label style={{ fontSize: 11, margin: 0 }}>Columns:</label>
              <select
                value={columns}
                onChange={(e) => setColumns(parseInt(e.target.value, 10))}
                style={{ minWidth: 60, padding: "6px 8px", fontSize: 13 }}
              >
                {COLUMN_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {totalPages > 1 && (
            <>
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="secondary"
              >
                Previous
              </button>
              <span className="status">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="secondary"
              >
                Next
              </button>
            </>
          )}
        </div>

        <div className="row" style={{ gap: 4 }}>
          <button
            onClick={scrollToTop}
            className="secondary"
            title="Scroll to top"
            style={{ padding: "6px 10px", fontSize: 12 }}
          >
            ↑ Top
          </button>
          <button
            onClick={scrollToBottom}
            className="secondary"
            title="Scroll to bottom"
            style={{ padding: "6px 10px", fontSize: 12 }}
          >
            ↓ Bottom
          </button>
        </div>
      </div>
    </section>
  );
}

