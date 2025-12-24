import React, { useState, useEffect } from "react";
import { spacing, radius, transitions } from "../../lib/design-tokens";

export type ButtonVariant = "primary" | "secondary" | "tertiary";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
};

// Hook to detect mobile screen size
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 600;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const mediaQuery = window.matchMedia("(max-width: 600px)");
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isMobile;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  style,
  children,
  ...props
}: ButtonProps) {
  const isMobile = useIsMobile();
  
  const baseStyle: React.CSSProperties = {
    fontFamily: "inherit",
    borderRadius: radius.md,
    border: "1px solid",
    cursor: props.disabled ? "not-allowed" : "pointer",
    fontWeight: 600,
    transition: transitions.fast,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    ...style
  };

  // Size styles - compact on mobile
  const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
    sm: {
      padding: isMobile ? `${spacing.xs} ${spacing.sm}` : `${spacing.sm} ${spacing.md}`,
      fontSize: isMobile ? "11px" : "12px",
      minHeight: isMobile ? "44px" : undefined,
      minWidth: isMobile ? "44px" : undefined
    },
    md: {
      padding: isMobile ? `${spacing.sm} ${spacing.md}` : `${spacing.md} ${spacing.lg}`,
      fontSize: isMobile ? "12px" : "14px",
      minHeight: isMobile ? "44px" : undefined,
      minWidth: isMobile ? "44px" : undefined
    },
    lg: {
      padding: isMobile ? `${spacing.md} ${spacing.lg}` : `${spacing.lg} ${spacing.xl}`,
      fontSize: isMobile ? "13px" : "16px",
      minHeight: isMobile ? "44px" : undefined,
      minWidth: isMobile ? "44px" : undefined
    }
  };

  // Variant styles
  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      background: "var(--button-primary-bg)",
      borderColor: "var(--button-primary-border)",
      color: "var(--button-primary-ink)"
    },
    secondary: {
      background: "var(--button-secondary-bg)",
      borderColor: "var(--button-secondary-border)",
      color: "var(--button-secondary-ink)"
    },
    tertiary: {
      background: "var(--button-tertiary-bg)",
      borderColor: "var(--button-tertiary-border)",
      color: "var(--button-tertiary-ink)"
    }
  };

  const combinedStyle = {
    ...baseStyle,
    ...sizeStyles[size],
    ...variantStyles[variant],
    opacity: props.disabled ? 0.6 : 1
  };

  return (
    <button
      className={className}
      style={combinedStyle}
      onMouseEnter={(e) => {
        if (!props.disabled && variant === "primary") {
          e.currentTarget.style.background = "var(--button-primary-hover)";
        } else if (!props.disabled && variant === "secondary") {
          e.currentTarget.style.background = "var(--button-secondary-hover)";
        } else if (!props.disabled && variant === "tertiary") {
          e.currentTarget.style.background = "var(--button-tertiary-hover)";
        }
      }}
      onMouseLeave={(e) => {
        if (variant === "primary") {
          e.currentTarget.style.background = "var(--button-primary-bg)";
        } else if (variant === "secondary") {
          e.currentTarget.style.background = "var(--button-secondary-bg)";
        } else if (variant === "tertiary") {
          e.currentTarget.style.background = "var(--button-tertiary-bg)";
        }
      }}
      onMouseDown={(e) => {
        if (!props.disabled) {
          e.currentTarget.style.transform = "translateY(1px)";
        }
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "";
      }}
      {...props}
    >
      {children}
    </button>
  );
}




