import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { type ThemeName, THEMES, type Theme, type ThemeColors } from "@/constants/themes";
import { type FontName, FONTS } from "@/constants/fonts";

export type ColorMode = "light" | "dark" | "system";

const THEME_KEY = "@focus_theme";
const FONT_KEY = "@focus_font";
const COLOR_MODE_KEY = "@focus_color_mode";

function generateLightColors(theme: Theme): ThemeColors & { radius: number } {
  const c = theme.colors;
  return {
    ...c,
    background: "#F5F6FA",
    card: "#FFFFFF",
    foreground: "#0D0D1A",
    cardForeground: "#0D0D1A",
    secondary: "#ECEEF5",
    secondaryForeground: "#1A1A2E",
    muted: "#E2E4ED",
    mutedForeground: "#5E6278",
    border: "#D8DAE8",
    input: "#D8DAE8",
    surface: "#EEF0F8",
    surfaceForeground: "#0D0D1A",
    glass: "rgba(255,255,255,0.94)",
    glassBorder: "rgba(0,0,0,0.09)",
    text: "#0D0D1A",
    tint: c.primary,
  };
}

interface ThemeContextType {
  themeName: ThemeName;
  theme: Theme;
  setTheme: (name: ThemeName) => void;
  fontName: FontName;
  setFont: (name: FontName) => void;
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  resolvedColorMode: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType>({
  themeName: "midnight",
  theme: THEMES.midnight,
  setTheme: () => {},
  fontName: "inter",
  setFont: () => {},
  colorMode: "dark",
  setColorMode: () => {},
  resolvedColorMode: "dark",
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>("midnight");
  const [fontName, setFontName] = useState<FontName>("inter");
  const [colorMode, setColorModeState] = useState<ColorMode>("dark");
  const systemScheme = useColorScheme();

  useEffect(() => {
    AsyncStorage.multiGet([THEME_KEY, FONT_KEY, COLOR_MODE_KEY]).then((pairs) => {
      const themeVal = pairs[0][1];
      const fontVal  = pairs[1][1];
      const modeVal  = pairs[2][1];
      if (themeVal && themeVal in THEMES) setThemeName(themeVal as ThemeName);
      if (fontVal  && fontVal  in FONTS)  setFontName(fontVal  as FontName);
      if (modeVal === "light" || modeVal === "dark" || modeVal === "system") {
        setColorModeState(modeVal);
      }
    });
  }, []);

  const setTheme = useCallback((name: ThemeName) => {
    setThemeName(name);
    AsyncStorage.setItem(THEME_KEY, name).catch(() => {});
  }, []);

  const setFont = useCallback((name: FontName) => {
    setFontName(name);
    AsyncStorage.setItem(FONT_KEY, name).catch(() => {});
  }, []);

  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode);
    AsyncStorage.setItem(COLOR_MODE_KEY, mode).catch(() => {});
  }, []);

  const resolvedColorMode: "light" | "dark" =
    colorMode === "system" ? (systemScheme === "light" ? "light" : "dark") : colorMode;

  const baseTheme  = THEMES[themeName];
  const effectiveTheme: Theme =
    resolvedColorMode === "light"
      ? { ...baseTheme, colors: generateLightColors(baseTheme), isDark: false }
      : baseTheme;

  return (
    <ThemeContext.Provider
      value={{ themeName, theme: effectiveTheme, setTheme, fontName, setFont, colorMode, setColorMode, resolvedColorMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
