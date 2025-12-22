import React from "react";
import { spacing, radius, shadows } from "../../lib/design-tokens";

export type CardVariant = "default" | "elevated" | "outlined";

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  children: React.ReactNode;
};

export function Card({
  variant = "default",
  className = "",
  style,
  children,
  ...props
}: CardProps) {
  const baseStyle: React.CSSProperties = {
    background: "var(--card)",
    borderRadius: radius.lg,
    padding: spacing["2xl"],
    ...style
  };

  const variantStyles: Record<CardVariant, React.CSSProperties> = {
    default: {
      border: "1px solid var(--border)",
      boxShadow: shadows.card
    },
    elevated: {
      border: "1px solid var(--border)",
      boxShadow: shadows.lg
    },
    outlined: {
      border: "1px solid var(--border-strong)",
      boxShadow: "none"
    }
  };

  const combinedStyle = {
    ...baseStyle,
    ...variantStyles[variant]
  };

  return (
    <div className={className} style={combinedStyle} {...props}>
      {children}
    </div>
  );
}



