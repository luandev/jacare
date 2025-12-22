import React from "react";
import { spacing, radius, transitions } from "../../lib/design-tokens";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

export function Input({
  className = "",
  style,
  error = false,
  ...props
}: InputProps) {
  const baseStyle: React.CSSProperties = {
    fontFamily: "inherit",
    borderRadius: radius.md,
    border: "1px solid",
    padding: `${spacing.md} ${spacing.lg}`,
    fontSize: "14px",
    background: "var(--input-bg)",
    borderColor: error ? "var(--badge-error-ink)" : "var(--input-border)",
    color: "var(--input-ink)",
    transition: transitions.fast,
    width: "100%",
    ...style
  };

  return (
    <input
      className={className}
      style={baseStyle}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--input-border-focus)";
        e.currentTarget.style.outline = "none";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = error ? "var(--badge-error-ink)" : "var(--input-border)";
      }}
      placeholder={props.placeholder}
      {...props}
    />
  );
}

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  error?: boolean;
};

export function Select({
  className = "",
  style,
  error = false,
  children,
  ...props
}: SelectProps) {
  const baseStyle: React.CSSProperties = {
    fontFamily: "inherit",
    borderRadius: radius.md,
    border: "1px solid",
    padding: `${spacing.md} ${spacing.lg}`,
    fontSize: "14px",
    background: "var(--input-bg)",
    borderColor: error ? "var(--badge-error-ink)" : "var(--input-border)",
    color: "var(--input-ink)",
    transition: transitions.fast,
    cursor: "pointer",
    ...style
  };

  return (
    <select
      className={className}
      style={baseStyle}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--input-border-focus)";
        e.currentTarget.style.outline = "none";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = error ? "var(--badge-error-ink)" : "var(--input-border)";
      }}
      {...props}
    >
      {children}
    </select>
  );
}

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean;
};

export function Textarea({
  className = "",
  style,
  error = false,
  ...props
}: TextareaProps) {
  const baseStyle: React.CSSProperties = {
    fontFamily: "inherit",
    borderRadius: radius.md,
    border: "1px solid",
    padding: spacing.lg,
    fontSize: "14px",
    background: "var(--input-bg)",
    borderColor: error ? "var(--badge-error-ink)" : "var(--input-border)",
    color: "var(--input-ink)",
    transition: transitions.fast,
    width: "100%",
    resize: "vertical",
    ...style
  };

  return (
    <textarea
      className={className}
      style={baseStyle}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--input-border-focus)";
        e.currentTarget.style.outline = "none";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = error ? "var(--badge-error-ink)" : "var(--input-border)";
      }}
      {...props}
    />
  );
}



