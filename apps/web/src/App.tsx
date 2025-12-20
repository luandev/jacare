import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import BrowsePage from "./pages/BrowsePage";
import QueuePage from "./pages/QueuePage";
import SettingsPage from "./pages/SettingsPage";
import GameDetailPage from "./pages/GameDetailPage";

export default function App() {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "active" : undefined;

  return (
    <BrowserRouter>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="logo">CrocDesk</div>
          <nav className="nav">
            <NavLink to="/" end className={navLinkClass}>
              Browse
            </NavLink>
            <NavLink to="/queue" className={navLinkClass}>
              Queue
            </NavLink>
            <NavLink to="/settings" className={navLinkClass}>
              Settings
            </NavLink>
          </nav>
          <div className="status">MVP build</div>
        </aside>
        <main className="main">
          <Routes>
            <Route path="/" element={<BrowsePage />} />
            <Route path="/queue" element={<QueuePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/game/:slug" element={<GameDetailPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
