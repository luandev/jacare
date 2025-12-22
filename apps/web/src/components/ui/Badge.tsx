import React from "react";
import { spacing, radius } from "../../lib/design-tokens";

export type BadgeVariant = "default" | "success" | "warning" | "error";

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  children: React.ReactNode;
};

export function Badge({
  variant = "default",
  className = "",
  style,
  children,
  ...props
}: BadgeProps) {
  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: radius.full,
    fontSize: "12px",
    fontWeight: 600,
    ...style
  };

  const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
    default: {
      background: "var(--badge-bg)",
      color: "var(--badge-ink)"
    },
    success: {
      background: "var(--badge-success-bg)",
      color: "var(--badge-success-ink)"
    },
    warning: {
      background: "var(--badge-warning-bg)",
      color: "var(--badge-warning-ink)"
    },
    error: {
      background: "var(--badge-error-bg)",
      color: "var(--badge-error-ink)"
    }
  };

  const combinedStyle = {
    ...baseStyle,
    ...variantStyles[variant]
  };

  return (
    <span className={className} style={combinedStyle} {...props}>
      {children}
    </span>
  );
}




