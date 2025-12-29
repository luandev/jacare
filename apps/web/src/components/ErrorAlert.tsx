import { useState } from "react";

interface ErrorAlertProps {
  error: Error | string;
  context?: string;
  onDismiss?: () => void;
}

export function ErrorAlert({ error, context, onDismiss }: ErrorAlertProps) {
  const [isReporting, setIsReporting] = useState(false);

  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  const handleReportIssue = () => {
    setIsReporting(true);

    // Gather diagnostic information
    const diagnosticInfo = {
      error: errorMessage,
      stack: errorStack,
      context: context || "Unknown context",
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Create GitHub issue URL with pre-filled information
    const issueTitle = encodeURIComponent(
      `[Bug Report] ${context ? `${context}: ` : ""}${errorMessage.substring(0, 100)}`
    );
    
    const issueBody = encodeURIComponent(
      `## Bug Report

**Error Message:**
\`${errorMessage}\`

**Context:**
${context || "N/A"}

**Timestamp:**
${diagnosticInfo.timestamp}

**URL:**
${diagnosticInfo.url}

**User Agent:**
${diagnosticInfo.userAgent}

${errorStack ? `**Stack Trace:**
\`\`\`
${errorStack}
\`\`\`
` : ""}

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**


**Actual Behavior:**


**Additional Information:**
`
    );

    const githubIssueUrl = `https://github.com/luandev/jacare/issues/new?title=${issueTitle}&body=${issueBody}&labels=bug,needs-triage`;

    // Open GitHub issue creation page in a new tab
    window.open(githubIssueUrl, "_blank");

    // Reset reporting state after a delay
    setTimeout(() => setIsReporting(false), 1000);
  };

  return (
    <div
      className="card"
      style={{
        backgroundColor: "var(--error-bg, #fee)",
        borderLeft: "4px solid var(--error-color, #c33)",
        padding: "16px",
        marginBottom: "16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ fontSize: "24px" }}>⚠️</div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: "0 0 8px 0", color: "var(--error-color, #c33)" }}>
            Error Occurred
          </h3>
          <p style={{ margin: "0 0 12px 0", fontFamily: "monospace", fontSize: "14px" }}>
            {errorMessage}
          </p>
          {context && (
            <p style={{ margin: "0 0 12px 0", fontSize: "14px", color: "var(--text-secondary)" }}>
              <strong>Context:</strong> {context}
            </p>
          )}
          {errorStack && (
            <details style={{ marginBottom: "12px" }}>
              <summary style={{ cursor: "pointer", userSelect: "none", fontSize: "14px" }}>
                View Stack Trace
              </summary>
              <pre
                style={{
                  marginTop: "8px",
                  padding: "8px",
                  backgroundColor: "var(--bg-secondary, #f5f5f5)",
                  borderRadius: "4px",
                  fontSize: "12px",
                  overflow: "auto",
                  maxHeight: "200px",
                }}
              >
                {errorStack}
              </pre>
            </details>
          )}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={handleReportIssue}
              disabled={isReporting}
              className="primary"
              style={{ fontSize: "14px" }}
            >
              {isReporting ? "Opening GitHub..." : "🐛 Report Issue on GitHub"}
            </button>
            {onDismiss && (
              <button onClick={onDismiss} className="secondary" style={{ fontSize: "14px" }}>
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
