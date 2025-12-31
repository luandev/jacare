import { BrowserRouter, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useEffect, useState } from "react";
import BrowsePage from "./pages/BrowsePage";
import LibraryPage from "./pages/LibraryPage";
import QueuePage from "./pages/QueuePage";
import DownloadsPage from "./pages/DownloadsPage";
import SettingsPage from "./pages/SettingsPage";
import GameDetailPage from "./pages/GameDetailPage";
import LibraryItemDetailPage from "./pages/LibraryItemDetailPage";
import BigPictureModePage from "./pages/BigPictureModePage";
import { WelcomeView, shouldShowWelcome } from "./components/WelcomeView";
// useMemo imported above

function AppRoutes() {
  const location = useLocation();
  const state = location.state as { backgroundLocation?: Location } | null;
  const baseLocation = useMemo(() => state?.backgroundLocation || location, [state, location]);

  return (
    <>
      <Routes location={baseLocation}>
        <Route path="/" element={<BrowsePage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/library/item" element={<LibraryItemDetailPage />} />
        <Route path="/queue" element={<QueuePage />} />
        <Route path="/downloads" element={<DownloadsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/big-picture" element={<BigPictureModePage />} />
        <Route path="/game/:slug" element={<GameDetailPage />} />
      </Routes>
      {state?.backgroundLocation && (
        <Routes>
          <Route path="/game/:slug" element={<ModalOverlay><GameDetailPage /></ModalOverlay>} />
          <Route path="/library/item" element={<ModalOverlay><LibraryItemDetailPage /></ModalOverlay>} />
        </Routes>
      )}
    </>
  );
}

function ModalOverlay({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        navigate(-1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);
  return (
    <div
      data-testid="modal-overlay"
      onClick={() => navigate(-1)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}
    >
      <div
        className="card"
        data-testid="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(960px, 92vw)", maxHeight: "90vh", overflow: "auto", position: "relative" }}
      >
        <button
          aria-label="Close"
          onClick={() => navigate(-1)}
          className="secondary"
          style={{ position: "absolute", top: 8, right: 8 }}
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [showWelcome, setShowWelcome] = useState(() => shouldShowWelcome());
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "active" : undefined;

  return (
    <BrowserRouter>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="logo">Jacare</div>
          <nav className="nav">
            <NavLink to="/" end className={navLinkClass}>
              Browse
            </NavLink>
            <NavLink to="/library" className={navLinkClass}>
              Library
            </NavLink>
            <NavLink to="/queue" className={navLinkClass}>
              Queue
            </NavLink>
            <NavLink to="/downloads" className={navLinkClass}>
              Downloads
            </NavLink>
            <NavLink to="/settings" className={navLinkClass}>
              Settings
            </NavLink>
          </nav>
          <div className="status">MVP build</div>
        </aside>
        <main className="main">
          <AppRoutes />
        </main>
        {showWelcome && <WelcomeView onClose={() => setShowWelcome(false)} />}
      </div>
    </BrowserRouter>
  );
}
