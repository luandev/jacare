import React from "react";
import { spacing, radius, transitions } from "../../lib/design-tokens";

export type ButtonVariant = "primary" | "secondary" | "tertiary";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  style,
  children,
  ...props
}: ButtonProps) {
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

  // Size styles
  const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
    sm: {
      padding: `${spacing.sm} ${spacing.md}`,
      fontSize: "12px"
    },
    md: {
      padding: `${spacing.md} ${spacing.lg}`,
      fontSize: "14px"
    },
    lg: {
      padding: `${spacing.lg} ${spacing.xl}`,
      fontSize: "16px"
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




