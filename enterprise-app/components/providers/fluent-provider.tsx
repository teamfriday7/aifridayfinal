"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { FluentProvider, webDarkTheme, webLightTheme, type Theme } from "@fluentui/react-components";

type ThemeMode = "light" | "dark";

interface FluentThemeContextValue {
  themeMode: ThemeMode;
  toggleTheme: () => void;
}

const FluentThemeContext = createContext<FluentThemeContextValue | undefined>(undefined);

const azureLightTheme: Theme = {
  ...webLightTheme,
  colorBrandBackground: "#0078D4",
  colorBrandBackgroundHover: "#106EBE",
  colorBrandBackgroundPressed: "#005A9E",
  colorBrandForeground1: "#FFFFFF",
  colorNeutralBackground1: "#F5F5F5",
  colorNeutralBackground2: "#FFFFFF",
};

const azureDarkTheme: Theme = {
  ...webDarkTheme,
  colorBrandBackground: "#0078D4",
  colorBrandBackgroundHover: "#106EBE",
  colorBrandBackgroundPressed: "#005A9E",
  colorBrandForeground1: "#FFFFFF",
  colorNeutralBackground1: "#111111",
  colorNeutralBackground2: "#1F1F1F",
};

export function FluentThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem("theme") as ThemeMode | null;
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setThemeMode(saved ?? preferred);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("theme", themeMode);
    document.documentElement.setAttribute("data-theme", themeMode);
  }, [themeMode]);

  const value = useMemo<FluentThemeContextValue>(
    () => ({
      themeMode,
      toggleTheme: () => setThemeMode((current) => (current === "dark" ? "light" : "dark")),
    }),
    [themeMode],
  );

  const theme = themeMode === "dark" ? azureDarkTheme : azureLightTheme;

  return (
    <FluentThemeContext.Provider value={value}>
      <FluentProvider theme={theme} className="min-h-screen">
        {children}
      </FluentProvider>
    </FluentThemeContext.Provider>
  );
}

export function useFluentTheme() {
  const context = useContext(FluentThemeContext);
  if (!context) {
    throw new Error("useFluentTheme must be used within FluentThemeProvider");
  }
  return context;
}
