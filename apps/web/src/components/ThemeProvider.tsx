import React, { createContext, useContext, useEffect } from "react";
import type { Theme } from "../lib/theme-types";
import { lightTheme, darkTheme } from "../lib/theme";
import { useUIStore } from "../store";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themePreference = useUIStore((state) => state.theme);
  const setThemePreference = useUIStore((state) => state.setTheme);
  
  const currentTheme: Theme = themePreference === "dark" ? darkTheme : lightTheme;

  useEffect(() => {
    const root = document.documentElement;
    Object.entries(currentTheme.vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    root.setAttribute("data-theme", currentTheme.name);
    root.style.colorScheme = currentTheme.name;
  }, [currentTheme]);

  const setTheme = (theme: Theme) => {
    setThemePreference(theme.name);
  };

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}



