import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../lib/api";
import { useUIStore } from "../store";
import { useGamepadNavigation } from "../hooks/useGamepad";
import type { LibraryItem } from "@crocdesk/shared";
import "../styles/big-picture.css";

type NavSection = "home" | "library" | "search" | "downloads" | "settings" | "exit";

// Grid configuration
const ITEMS_PER_ROW = 4; // Matches the CSS grid-template-columns for Big Picture

export default function BigPicturePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setBigPictureMode = useUIStore((state) => state.setBigPictureMode);
  const [activeSection, setActiveSection] = useState<NavSection>("home");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSidebarFocused, setIsSidebarFocused] = useState(true);
  const gridRef = useRef<HTMLDivElement>(null);

  // Fetch library items
  const libraryQuery = useQuery({
    queryKey: ["library-items"],
    queryFn: () => apiGet<LibraryItem[]>("/library/items")
  });

  const libraryItems = useMemo(() => libraryQuery.data || [], [libraryQuery.data]);

  // Enable fullscreen on mount if running in Electron
  useEffect(() => {
    if (typeof window !== "undefined" && "crocdesk" in window) {
      const electron = window.crocdesk as { toggleBigPicture?: (enabled: boolean) => Promise<void> };
      if (electron.toggleBigPicture) {
        electron.toggleBigPicture(true).catch(console.error);
      }
    }
  }, []);

  // Exit Big Picture mode
  const exitBigPicture = useCallback(() => {
    setBigPictureMode(false);
    // Exit fullscreen if running in Electron
    if (typeof window !== "undefined" && "crocdesk" in window) {
      const electron = window.crocdesk as { toggleBigPicture?: (enabled: boolean) => Promise<void> };
      if (electron.toggleBigPicture) {
        electron.toggleBigPicture(false).catch(console.error);
      }
    }
    navigate("/");
  }, [setBigPictureMode, navigate]);

  // Handle navigation
  const handleNavigation = useCallback((direction: "up" | "down" | "left" | "right") => {
    if (isSidebarFocused) {
      // Navigate sidebar
      const sections: NavSection[] = ["home", "library", "search", "downloads", "settings", "exit"];
      const currentIndex = sections.indexOf(activeSection);
      
      if (direction === "up" && currentIndex > 0) {
        setActiveSection(sections[currentIndex - 1]);
      } else if (direction === "down" && currentIndex < sections.length - 1) {
        setActiveSection(sections[currentIndex + 1]);
      } else if (direction === "right") {
        setIsSidebarFocused(false);
        setSelectedIndex(0);
      }
    } else {
      // Navigate content grid
      const itemsPerRow = ITEMS_PER_ROW;
      const totalItems = libraryItems.length;

      if (direction === "left") {
        if (selectedIndex % itemsPerRow === 0) {
          setIsSidebarFocused(true);
        } else {
          setSelectedIndex(Math.max(0, selectedIndex - 1));
        }
      } else if (direction === "right") {
        setSelectedIndex(Math.min(totalItems - 1, selectedIndex + 1));
      } else if (direction === "up") {
        setSelectedIndex(Math.max(0, selectedIndex - itemsPerRow));
      } else if (direction === "down") {
        setSelectedIndex(Math.min(totalItems - 1, selectedIndex + itemsPerRow));
      }
    }
  }, [isSidebarFocused, activeSection, selectedIndex, libraryItems.length]);

  // Handle select
  const handleSelect = useCallback(() => {
    if (isSidebarFocused) {
      if (activeSection === "exit") {
        exitBigPicture();
      } else {
        setIsSidebarFocused(false);
        setSelectedIndex(0);
      }
    } else {
      // Open selected game
      const item = libraryItems[selectedIndex];
      if (item) {
        // Navigate to detail view or launch game
        navigate(`/library/item?id=${item.id}`, { state: { backgroundLocation: location } });
      }
    }
  }, [isSidebarFocused, activeSection, selectedIndex, libraryItems, exitBigPicture, navigate, location]);

  // Handle back
  const handleBack = useCallback(() => {
    if (!isSidebarFocused) {
      setIsSidebarFocused(true);
    } else {
      exitBigPicture();
    }
  }, [isSidebarFocused, exitBigPicture]);

  // Gamepad support
  useGamepadNavigation(handleNavigation, handleSelect, handleBack);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          handleNavigation("up");
          break;
        case "ArrowDown":
          e.preventDefault();
          handleNavigation("down");
          break;
        case "ArrowLeft":
          e.preventDefault();
          handleNavigation("left");
          break;
        case "ArrowRight":
          e.preventDefault();
          handleNavigation("right");
          break;
        case "Enter":
          e.preventDefault();
          handleSelect();
          break;
        case "Escape":
          e.preventDefault();
          handleBack();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNavigation, handleSelect, handleBack]);

  // Scroll selected item into view
  useEffect(() => {
    if (!isSidebarFocused && gridRef.current) {
      const items = gridRef.current.querySelectorAll(".bp-game-card");
      const selectedItem = items[selectedIndex];
      if (selectedItem) {
        selectedItem.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [selectedIndex, isSidebarFocused]);

  return (
    <div className="big-picture-mode">
      <nav className="bp-sidebar">
        <div className="bp-logo">Jacare</div>
        <div className="bp-nav">
          <button
            className={`bp-nav-item ${activeSection === "home" && isSidebarFocused ? "focused" : ""}`}
            onClick={() => {
              setActiveSection("home");
              setIsSidebarFocused(true);
            }}
          >
            <span className="bp-nav-icon">🏠</span>
            <span className="bp-nav-label">Home</span>
          </button>
          <button
            className={`bp-nav-item ${activeSection === "library" && isSidebarFocused ? "focused" : ""}`}
            onClick={() => {
              setActiveSection("library");
              setIsSidebarFocused(true);
            }}
          >
            <span className="bp-nav-icon">📚</span>
            <span className="bp-nav-label">Library</span>
          </button>
          <button
            className={`bp-nav-item ${activeSection === "search" && isSidebarFocused ? "focused" : ""}`}
            onClick={() => {
              setActiveSection("search");
              setIsSidebarFocused(true);
            }}
          >
            <span className="bp-nav-icon">🔍</span>
            <span className="bp-nav-label">Search</span>
          </button>
          <button
            className={`bp-nav-item ${activeSection === "downloads" && isSidebarFocused ? "focused" : ""}`}
            onClick={() => {
              setActiveSection("downloads");
              setIsSidebarFocused(true);
            }}
          >
            <span className="bp-nav-icon">⬇️</span>
            <span className="bp-nav-label">Downloads</span>
          </button>
          <button
            className={`bp-nav-item ${activeSection === "settings" && isSidebarFocused ? "focused" : ""}`}
            onClick={() => {
              setActiveSection("settings");
              setIsSidebarFocused(true);
            }}
          >
            <span className="bp-nav-icon">⚙️</span>
            <span className="bp-nav-label">Settings</span>
          </button>
          <button
            className={`bp-nav-item ${activeSection === "exit" && isSidebarFocused ? "focused" : ""}`}
            onClick={exitBigPicture}
          >
            <span className="bp-nav-icon">🚪</span>
            <span className="bp-nav-label">Exit</span>
          </button>
        </div>
      </nav>

      <main className="bp-content">
        <div className="bp-header">
          <h1 className="bp-title">
            {activeSection === "home" && "Welcome"}
            {activeSection === "library" && "Library"}
            {activeSection === "search" && "Search"}
            {activeSection === "downloads" && "Downloads"}
            {activeSection === "settings" && "Settings"}
          </h1>
        </div>

        {activeSection === "library" && (
          <div className="bp-grid" ref={gridRef}>
            {libraryQuery.isLoading && (
              <div className="bp-loading">Loading library...</div>
            )}
            {libraryItems.length === 0 && !libraryQuery.isLoading && (
              <div className="bp-empty">
                <p>Your library is empty</p>
                <p className="bp-hint">Browse and download games to get started</p>
              </div>
            )}
            {libraryItems.map((item, index) => (
              <div
                key={item.id}
                className={`bp-game-card ${!isSidebarFocused && selectedIndex === index ? "focused" : ""}`}
                onClick={() => {
                  setSelectedIndex(index);
                  setIsSidebarFocused(false);
                  handleSelect();
                }}
              >
                <div className="bp-game-cover">
                  {item.gameSlug ? (
                    <div className="bp-game-placeholder">
                      {item.platform?.toUpperCase() || "?"}
                    </div>
                  ) : (
                    <div className="bp-game-placeholder">
                      {item.platform?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                <div className="bp-game-info">
                  <div className="bp-game-title">{item.path.split("/").pop() || item.path}</div>
                  <div className="bp-game-platform">{item.platform?.toUpperCase() || "Unknown"}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSection === "home" && (
          <div className="bp-welcome">
            <h2>Welcome to Big Picture Mode</h2>
            <p>Use your controller or keyboard to navigate:</p>
            <ul className="bp-controls">
              <li><strong>D-Pad / Arrows:</strong> Navigate</li>
              <li><strong>A / Enter:</strong> Select</li>
              <li><strong>B / Escape:</strong> Back</li>
            </ul>
          </div>
        )}

        {activeSection === "search" && (
          <div className="bp-section-placeholder">
            <p>Search coming soon</p>
          </div>
        )}

        {activeSection === "downloads" && (
          <div className="bp-section-placeholder">
            <p>Downloads view coming soon</p>
          </div>
        )}

        {activeSection === "settings" && (
          <div className="bp-section-placeholder">
            <p>Settings coming soon</p>
          </div>
        )}
      </main>

      <div className="bp-footer">
        <div className="bp-hint-bar">
          <span className="bp-hint">🎮 Controller connected</span>
          <span className="bp-hint">Press B to go back</span>
        </div>
      </div>
    </div>
  );
}
