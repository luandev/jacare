import { useEffect, useRef, useState } from "react";
import "./emulator.css";

/**
 * EmulatorJS Component - Experimental
 * 
 * This component provides a web-based emulator interface for playing ROMs.
 * It's designed to work within Big Picture Mode for a console-like experience.
 * 
 * Requirements:
 * 1. EmulatorJS library must be served from /emulatorjs/ path
 * 2. ROM files must be accessible via URL
 * 3. BIOS files must be provided for certain systems (PS1, PSP, etc.)
 * 
 * Supported Systems:
 * - NES, SNES, GB/GBC/GBA, N64, PS1, PSP, DS, Arcade (MAME), Sega systems
 */

export type EmulatorConfig = {
  core: string; // e.g., "nes", "snes", "gba", "n64", "psx", "psp"
  romUrl: string;
  biosUrl?: string;
  saveStateUrl?: string;
  gameId?: string;
  gameName?: string;
};

type Props = {
  config: EmulatorConfig;
  onExit?: () => void;
  onError?: (error: Error) => void;
};

// Platform to core mapping
const CORE_MAP: Record<string, string> = {
  nes: "nes",
  snes: "snes",
  "game-boy": "gb",
  "game-boy-color": "gbc",
  "game-boy-advance": "gba",
  n64: "n64",
  ps1: "psx",
  psp: "psp",
  nds: "nds",
  genesis: "segaMD",
  "master-system": "segaMS",
  "game-gear": "segaGG",
  arcade: "mame"
};

export function getEmulatorCore(platform: string): string | null {
  return CORE_MAP[platform.toLowerCase()] || null;
}

export default function EmulatorPlayer({ config, onExit, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if EmulatorJS is available
    if (typeof (window as any).EJS_player === "undefined") {
      const errorMsg = "EmulatorJS library not found. Please ensure EmulatorJS is properly installed and served.";
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setError(errorMsg);
        onError?.(new Error(errorMsg));
      }, 0);
      return;
    }

    if (!containerRef.current) return;

    try {
      // Initialize EmulatorJS
      const EJS = (window as any).EJS_player;
      
      // Configure EmulatorJS
      (window as any).EJS_core = config.core;
      (window as any).EJS_gameUrl = config.romUrl;
      (window as any).EJS_gameName = config.gameName || "Game";
      
      if (config.biosUrl) {
        (window as any).EJS_biosUrl = config.biosUrl;
      }
      
      if (config.saveStateUrl) {
        (window as any).EJS_saveStateURL = config.saveStateUrl;
      }
      
      // Set paths (assumes EmulatorJS is served from /emulatorjs/)
      (window as any).EJS_pathtodata = "/emulatorjs/data/";
      
      // Enable fullscreen by default
      (window as any).EJS_startFullscreen = false; // We handle fullscreen in Big Picture
      
      // Disable ads
      (window as any).EJS_ads = false;
      
      // Initialize the player
      EJS("#emulator-container");
      
      setIsReady(true);
    } catch (err) {
      const errorMsg = `Failed to initialize emulator: ${err}`;
      setTimeout(() => {
        setError(errorMsg);
        onError?.(new Error(errorMsg));
      }, 0);
    }

    // Cleanup
    return () => {
      // EmulatorJS cleanup if needed
      if ((window as any).EJS_emulator) {
        try {
          (window as any).EJS_emulator.pause();
        } catch (e) {
          console.error("Error pausing emulator:", e);
        }
      }
    };
  }, [config, onError]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to exit
      if (e.key === "Escape") {
        e.preventDefault();
        onExit?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onExit]);

  return (
    <div className="emulator-wrapper">
      <div className="emulator-header">
        <div className="emulator-title">
          {config.gameName || "Playing"} ({config.core.toUpperCase()})
        </div>
        <button className="emulator-exit-btn" onClick={onExit}>
          Exit (ESC)
        </button>
      </div>

      {error ? (
        <div className="emulator-error">
          <h2>Emulator Error</h2>
          <p>{error}</p>
          <div className="emulator-error-instructions">
            <h3>Installation Instructions:</h3>
            <ol>
              <li>Download EmulatorJS from: https://github.com/EmulatorJS/EmulatorJS</li>
              <li>Place EmulatorJS files in your public/emulatorjs/ directory</li>
              <li>Ensure your web server serves these files</li>
              <li>Include the EmulatorJS script in your HTML</li>
            </ol>
            <p>
              <strong>Note:</strong> This is an experimental feature. EmulatorJS must be 
              separately installed and configured for game emulation to work.
            </p>
          </div>
          <button className="emulator-back-btn" onClick={onExit}>
            Back to Library
          </button>
        </div>
      ) : (
        <>
          <div 
            id="emulator-container" 
            ref={containerRef}
            className="emulator-container"
          />
          
          {!isReady && (
            <div className="emulator-loading">
              <div className="emulator-spinner"></div>
              <p>Loading emulator...</p>
            </div>
          )}
          
          <div className="emulator-controls-hint">
            <p>🎮 Use your controller or keyboard to play</p>
            <p>Press ESC to exit</p>
          </div>
        </>
      )}
    </div>
  );
}
