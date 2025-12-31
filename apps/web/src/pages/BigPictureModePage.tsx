import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiGet, apiPost } from "../lib/api";
import type { 
  CrocdbEntry, 
  CrocdbPlatformsResponseData,
  CrocdbSearchResponseData,
  CrocdbApiResponse 
} from "@crocdesk/shared";
import { useBigPictureStore, useDownloadProgressStore } from "../store";
import { useGamepadNavigation, triggerHapticFeedback } from "../hooks/useGamepadNavigation";
import { OnScreenKeyboard } from "../components/OnScreenKeyboard";
import GameCard from "../components/GameCard";
import "./BigPictureModePage.css";

export default function BigPictureModePage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State
  const [games, setGames] = useState<CrocdbEntry[]>([]);
  const [platforms, setPlatforms] = useState<CrocdbPlatformsResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  
  // Store
  const bigPictureStore = useBigPictureStore();
  const downloadingSlugs = useDownloadProgressStore((state) => state.downloadingSlugs);
  
  // Refs
  const gridRef = useRef<HTMLDivElement>(null);
  const lastHapticTimeRef = useRef(0);
  
  // Calculate grid columns based on screen size and settings
  const getGridColumns = () => {
    const width = window.innerWidth;
    
    if (bigPictureStore.gridSize === "auto") {
      if (width >= 1920) return 6;
      if (width >= 1600) return 5;
      if (width >= 1280) return 4;
      return 3;
    }
    
    switch (bigPictureStore.gridSize) {
      case "small": return 3;
      case "medium": return 4;
      case "large": return 5;
      default: return 4;
    }
  };
  
  const [gridColumns, setGridColumns] = useState(getGridColumns);
  
  // Update grid columns on window resize
  useEffect(() => {
    const handleResize = () => {
      setGridColumns(getGridColumns());
    };
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bigPictureStore.gridSize]);
  
  // Haptic feedback helper
  const triggerHaptic = useCallback((type: "light" | "medium" | "heavy" = "light") => {
    if (!bigPictureStore.hapticFeedbackEnabled) return;
    
    // Throttle haptic feedback to avoid overwhelming the controller
    const now = Date.now();
    if (now - lastHapticTimeRef.current < 50) return;
    lastHapticTimeRef.current = now;
    
    const gamepads = navigator.getGamepads?.() || [];
    const gamepad = Array.from(gamepads).find(gp => gp !== null);
    
    if (gamepad) {
      const magnitudes = {
        light: { weak: 0.2, strong: 0.2, duration: 50 },
        medium: { weak: 0.5, strong: 0.5, duration: 100 },
        heavy: { weak: 0.8, strong: 0.8, duration: 150 }
      };
      
      const config = magnitudes[type];
      triggerHapticFeedback(gamepad, {
        weakMagnitude: config.weak,
        strongMagnitude: config.strong,
        duration: config.duration
      }).catch(() => {
        // Silently handle haptic failure
      });
    }
  }, [bigPictureStore.hapticFeedbackEnabled]);
  
  // Navigation helpers
  const moveUp = useCallback(() => {
    setFocusedIndex((prev) => {
      const newIndex = Math.max(0, prev - gridColumns);
      if (newIndex !== prev) triggerHaptic("light");
      return newIndex;
    });
  }, [gridColumns, triggerHaptic]);
  
  const moveDown = useCallback(() => {
    setFocusedIndex((prev) => {
      const newIndex = Math.min(games.length - 1, prev + gridColumns);
      if (newIndex !== prev) triggerHaptic("light");
      return newIndex;
    });
  }, [games.length, gridColumns, triggerHaptic]);
  
  const moveLeft = useCallback(() => {
    setFocusedIndex((prev) => {
      const newIndex = Math.max(0, prev - 1);
      if (newIndex !== prev) triggerHaptic("light");
      return newIndex;
    });
  }, [triggerHaptic]);
  
  const moveRight = useCallback(() => {
    setFocusedIndex((prev) => {
      const newIndex = Math.min(games.length - 1, prev + 1);
      if (newIndex !== prev) triggerHaptic("light");
      return newIndex;
    });
  }, [games.length, triggerHaptic]);
  
  const selectCurrent = useCallback(() => {
    if (games[focusedIndex]) {
      triggerHaptic("medium");
      navigate(`/game/${games[focusedIndex].slug}`, { state: { backgroundLocation: location } });
    }
  }, [games, focusedIndex, navigate, location, triggerHaptic]);
  
  const goBack = useCallback(() => {
    triggerHaptic("light");
    if (showSearch) {
      setShowSearch(false);
    } else if (showMenu) {
      setShowMenu(false);
    } else {
      navigate("/");
    }
  }, [showSearch, showMenu, navigate, triggerHaptic]);
  
  const toggleMenu = useCallback(() => {
    triggerHaptic("medium");
    setShowMenu((prev) => !prev);
  }, [triggerHaptic]);
  
  const toggleSearch = useCallback(() => {
    triggerHaptic("medium");
    setShowSearch((prev) => !prev);
  }, [triggerHaptic]);
  
  const previousPage = useCallback(() => {
    if (page > 1) {
      setPage((p) => p - 1);
      setFocusedIndex(0);
      triggerHaptic("medium");
    }
  }, [page, triggerHaptic]);
  
  const nextPage = useCallback(() => {
    if (page < totalPages) {
      setPage((p) => p + 1);
      setFocusedIndex(0);
      triggerHaptic("medium");
    }
  }, [page, totalPages, triggerHaptic]);
  
  // Gamepad navigation
  useGamepadNavigation({
    enabled: bigPictureStore.enabled && !showSearch,
    deadzone: bigPictureStore.deadzone,
    buttonMapping: {
      UP: moveUp,
      DOWN: moveDown,
      LEFT: moveLeft,
      RIGHT: moveRight,
      A: selectCurrent,
      B: goBack,
      X: toggleSearch,
      Y: toggleMenu,
      LB: previousPage,
      RB: nextPage,
      START: toggleMenu
    },
    onConnect: (gamepad) => {
      console.log("[BigPicture] Controller connected:", gamepad.id);
      triggerHaptic("heavy");
    },
    onDisconnect: (gamepad) => {
      console.log("[BigPicture] Controller disconnected:", gamepad.id);
    }
  });
  
  // Scroll focused item into view
  useEffect(() => {
    if (gridRef.current) {
      const focusedCard = gridRef.current.children[focusedIndex] as HTMLElement;
      if (focusedCard) {
        focusedCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [focusedIndex]);
  
  // Load games
  useEffect(() => {
    loadGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchQuery]);
  
  // Load platforms
  useEffect(() => {
    loadPlatforms();
  }, []);
  
  async function loadGames() {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiPost<CrocdbApiResponse<CrocdbSearchResponseData>>("/crocdb/search", {
        query: searchQuery || undefined,
        page,
        limit: 30
      });
      
      setGames(response.data.results ?? []);
      setTotalPages(response.data.total_pages ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load games"));
    } finally {
      setLoading(false);
    }
  }
  
  async function loadPlatforms() {
    try {
      const response = await apiGet<CrocdbApiResponse<CrocdbPlatformsResponseData>>("/crocdb/platforms");
      setPlatforms(response.data);
    } catch (err) {
      console.error("Failed to load platforms:", err);
    }
  }
  
  async function handleDownload(slug: string) {
    try {
      triggerHaptic("medium");
      await apiPost("/download/queue", { slug });
    } catch (err) {
      console.error("Failed to queue download:", err);
    }
  }
  
  const handleSearchSubmit = () => {
    setPage(1);
    setFocusedIndex(0);
    setShowSearch(false);
    loadGames();
  };
  
  // Enter fullscreen on mount
  useEffect(() => {
    if (bigPictureStore.enabled && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        // Fullscreen request failed, continue anyway
      });
    }
    
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {
          // Exit fullscreen failed
        });
      }
    };
  }, [bigPictureStore.enabled]);
  
  return (
    <div className="big-picture-mode" data-big-picture="true">
      {/* Header */}
      <header className="bp-header">
        <div className="bp-logo">Jacare</div>
        <div className="bp-search-box" onClick={toggleSearch}>
          <span>🔍</span>
          <span>{searchQuery || "Search games..."}</span>
        </div>
        <div className="bp-controls">
          <span className="bp-page-indicator">
            Page {page} of {totalPages}
          </span>
          <button className="bp-menu-button" onClick={toggleMenu}>
            ☰
          </button>
        </div>
      </header>
      
      {/* Main content */}
      <main className="bp-main">
        {loading && (
          <div className="bp-loading">
            <div className="spinner" />
            <p>Loading games...</p>
          </div>
        )}
        
        {error && (
          <div className="bp-error">
            <p>Error: {error.message}</p>
            <button onClick={() => loadGames()}>Retry</button>
          </div>
        )}
        
        {!loading && !error && games.length === 0 && (
          <div className="bp-empty">
            <p>No games found</p>
            {searchQuery && <button onClick={() => { setSearchQuery(""); setPage(1); }}>Clear search</button>}
          </div>
        )}
        
        {!loading && !error && games.length > 0 && (
          <div 
            className="bp-grid" 
            ref={gridRef}
            style={{ 
              gridTemplateColumns: `repeat(${gridColumns}, 1fr)` 
            }}
          >
            {games.map((entry, index) => {
              const isOwned = false; // TODO: Check library
              const isDownloading = downloadingSlugs.has(entry.slug);
              const isFocused = index === focusedIndex;
              
              return (
                <div
                  key={entry.slug}
                  className={`bp-card-wrapper ${isFocused ? "focused" : ""}`}
                >
                  <GameCard
                    entry={entry}
                    isOwned={isOwned}
                    isDownloading={isDownloading}
                    onDownload={() => handleDownload(entry.slug)}
                    platformsData={platforms || undefined}
                    location={location}
                  />
                </div>
              );
            })}
          </div>
        )}
      </main>
      
      {/* Footer with pagination */}
      <footer className="bp-footer">
        <div className="bp-pagination">
          <button onClick={previousPage} disabled={page <= 1}>
            ← Previous (LB)
          </button>
          <span>Page {page} of {totalPages}</span>
          <button onClick={nextPage} disabled={page >= totalPages}>
            Next (RB) →
          </button>
        </div>
        <div className="bp-hints">
          <span>D-Pad: Navigate</span>
          <span>A: Select</span>
          <span>B: Back</span>
          <span>X: Search</span>
          <span>Y: Menu</span>
        </div>
      </footer>
      
      {/* On-screen keyboard */}
      {showSearch && (
        <OnScreenKeyboard
          value={searchQuery}
          onChange={setSearchQuery}
          onSubmit={handleSearchSubmit}
          onClose={() => setShowSearch(false)}
          placeholder="Search games..."
        />
      )}
      
      {/* Menu overlay */}
      {showMenu && (
        <div className="bp-menu-overlay" onClick={() => setShowMenu(false)}>
          <div className="bp-menu" onClick={(e) => e.stopPropagation()}>
            <h2>Big Picture Menu</h2>
            <ul>
              <li><button onClick={() => { navigate("/big-picture"); setShowMenu(false); }}>Browse Games</button></li>
              <li><button onClick={() => { navigate("/library"); setShowMenu(false); }}>Library</button></li>
              <li><button onClick={() => { navigate("/big-picture/downloads"); setShowMenu(false); }}>Downloads</button></li>
              <li><button onClick={() => { navigate("/queue"); setShowMenu(false); }}>Queue</button></li>
              <li><button onClick={() => { navigate("/settings"); setShowMenu(false); }}>Settings</button></li>
              <li><button onClick={() => { navigate("/"); setShowMenu(false); }}>Exit Big Picture</button></li>
            </ul>
            <button className="bp-menu-close" onClick={() => setShowMenu(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
