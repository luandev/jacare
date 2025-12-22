import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button } from "./ui";
import { spacing, radius } from "../lib/design-tokens";

const WELCOME_STORAGE_KEY = "jacare:welcome-shown";

export function WelcomeView({ onClose }: { onClose?: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const steps = [
    {
      title: "Welcome to Jacare 🐊",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.lg }}>
          <p style={{ fontSize: "16px", lineHeight: 1.6, margin: 0 }}>
            Jacare is your personal ROM library manager. Search, download, and organize your game collection with ease.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: spacing.md, marginTop: spacing.md }}>
            <div style={{ display: "flex", gap: spacing.md, alignItems: "flex-start" }}>
              <div style={{ fontSize: "24px", flexShrink: 0 }}>🔍</div>
              <div>
                <strong style={{ display: "block", marginBottom: spacing.xs }}>Browse & Search</strong>
                <p style={{ margin: 0, fontSize: "14px", color: "var(--muted)" }}>
                  Search the Crocdb catalog by title, platform, and region. Find your favorite games quickly.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: spacing.md, alignItems: "flex-start" }}>
              <div style={{ fontSize: "24px", flexShrink: 0 }}>⬇️</div>
              <div>
                <strong style={{ display: "block", marginBottom: spacing.xs }}>Download & Install</strong>
                <p style={{ margin: 0, fontSize: "14px", color: "var(--muted)" }}>
                  Queue downloads with pause/resume support. Files are automatically extracted to your library directory.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: spacing.md, alignItems: "flex-start" }}>
              <div style={{ fontSize: "24px", flexShrink: 0 }}>📚</div>
              <div>
                <strong style={{ display: "block", marginBottom: spacing.xs }}>Library Management</strong>
                <p style={{ margin: 0, fontSize: "14px", color: "var(--muted)" }}>
                  Organize your downloaded games. Scan local directories and track your collection.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Getting Started",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.lg }}>
          <div style={{ padding: spacing.lg, backgroundColor: "var(--bg-alt)", borderRadius: radius.md }}>
            <h4 style={{ margin: 0, marginBottom: spacing.md }}>Quick Setup</h4>
            <ol style={{ margin: 0, paddingLeft: spacing.xl, display: "flex", flexDirection: "column", gap: spacing.sm }}>
              <li style={{ fontSize: "14px" }}>
                <strong>Configure directories</strong> in Settings (download folder and library folder)
              </li>
              <li style={{ fontSize: "14px" }}>
                <strong>Browse</strong> the catalog and search for games you want
              </li>
              <li style={{ fontSize: "14px" }}>
                <strong>Queue downloads</strong> - they'll appear in the Downloads page
              </li>
              <li style={{ fontSize: "14px" }}>
                <strong>Manage your library</strong> - scan local folders or view downloaded games
              </li>
            </ol>
          </div>
          <div style={{ padding: spacing.lg, backgroundColor: "var(--bg-alt)", borderRadius: radius.md }}>
            <h4 style={{ margin: 0, marginBottom: spacing.md }}>Features</h4>
            <ul style={{ margin: 0, paddingLeft: spacing.xl, display: "flex", flexDirection: "column", gap: spacing.sm }}>
              <li style={{ fontSize: "14px" }}>Real-time download progress with speed charts</li>
              <li style={{ fontSize: "14px" }}>Pause and resume downloads</li>
              <li style={{ fontSize: "14px" }}>Automatic extraction and organization</li>
              <li style={{ fontSize: "14px" }}>Dark and light theme support</li>
            </ul>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleGetStarted();
    }
  };

  const handleSkip = () => {
    handleGetStarted();
  };

  const handleGetStarted = () => {
    localStorage.setItem(WELCOME_STORAGE_KEY, "true");
    if (onClose) {
      onClose();
    } else {
      navigate("/");
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0, 0, 0, 0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2000,
      padding: spacing.xl
    }}>
      <Card style={{
        maxWidth: "600px",
        width: "100%",
        maxHeight: "90vh",
        overflow: "auto",
        position: "relative"
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: spacing["2xl"] }}>
          <div>
            <h1 style={{ margin: 0, marginBottom: spacing.md, fontSize: "28px" }}>
              {steps[currentStep].title}
            </h1>
            {steps[currentStep].content}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: spacing.md }}>
            <div style={{ display: "flex", gap: spacing.xs }}>
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: radius.full,
                    backgroundColor: idx === currentStep ? "var(--accent)" : "var(--border)",
                    transition: "background-color 0.2s ease"
                  }}
                />
              ))}
            </div>
            <div style={{ display: "flex", gap: spacing.sm }}>
              {currentStep > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => setCurrentStep(currentStep - 1)}
                >
                  Previous
                </Button>
              )}
              <Button
                variant="tertiary"
                onClick={handleSkip}
              >
                Skip
              </Button>
              <Button onClick={handleNext}>
                {currentStep < steps.length - 1 ? "Next" : "Get Started"}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function shouldShowWelcome(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(WELCOME_STORAGE_KEY) !== "true";
}




