export type ThemeName =
  | "midnight"
  | "emerald"
  | "sunset"
  | "sand"
  | "cyber"
  | "ocean"
  | "graphite"
  | "mint"
  | "royal"
  | "rose";

export interface ThemeColors {
  text: string;
  tint: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  surface: string;
  surfaceForeground: string;
  warning: string;
  warningForeground: string;
  info: string;
  success: string;
  glass: string;
  glassBorder: string;
}

export interface Theme {
  name: ThemeName;
  label: string;
  tagline: string;
  preview: string[];
  colors: ThemeColors & { radius: number };
  isDark: boolean;
}

export const THEMES: Record<ThemeName, Theme> = {
  // 1. Midnight Productivity
  midnight: {
    name: "midnight",
    label: "Midnight Productivity",
    tagline: "Futuristic · Analytics-ready",
    preview: ["#0F1222", "#6C8CFF", "#00D4FF"],
    isDark: true,
    colors: {
      radius: 16,
      text: "#E8EEFF",
      tint: "#6C8CFF",
      background: "#0F1222",
      foreground: "#E8EEFF",
      card: "#1A1F38",
      cardForeground: "#E8EEFF",
      primary: "#6C8CFF",
      primaryForeground: "#0F1222",
      secondary: "#222844",
      secondaryForeground: "#E8EEFF",
      muted: "#141829",
      mutedForeground: "#6070A0",
      accent: "#00D4FF",
      accentForeground: "#0F1222",
      destructive: "#FF4D6A",
      destructiveForeground: "#FFFFFF",
      border: "#252C4A",
      input: "#252C4A",
      surface: "#1A1F38",
      surfaceForeground: "#E8EEFF",
      warning: "#FBBF24",
      warningForeground: "#0F1222",
      info: "#00D4FF",
      success: "#34D399",
      glass: "rgba(26,31,56,0.85)",
      glassBorder: "rgba(108,140,255,0.22)",
    },
  },

  // 2. Deep Emerald Focus
  emerald: {
    name: "emerald",
    label: "Deep Emerald Focus",
    tagline: "Calming · Long-term habits",
    preview: ["#0F1A17", "#00A676", "#6FFFE9"],
    isDark: true,
    colors: {
      radius: 16,
      text: "#E6FFF5",
      tint: "#00A676",
      background: "#0F1A17",
      foreground: "#E6FFF5",
      card: "#1E2D29",
      cardForeground: "#E6FFF5",
      primary: "#00A676",
      primaryForeground: "#0F1A17",
      secondary: "#162520",
      secondaryForeground: "#E6FFF5",
      muted: "#122018",
      mutedForeground: "#5A8070",
      accent: "#6FFFE9",
      accentForeground: "#0F1A17",
      destructive: "#FF4D6A",
      destructiveForeground: "#FFFFFF",
      border: "#1E3028",
      input: "#1E3028",
      surface: "#1E2D29",
      surfaceForeground: "#E6FFF5",
      warning: "#FBBF24",
      warningForeground: "#0F1A17",
      info: "#2ED573",
      success: "#00A676",
      glass: "rgba(30,45,41,0.85)",
      glassBorder: "rgba(0,166,118,0.22)",
    },
  },

  // 3. Sunset Energy
  sunset: {
    name: "sunset",
    label: "Sunset Energy",
    tagline: "Energetic · Streak motivation",
    preview: ["#1A1410", "#FF6B6B", "#FFD166"],
    isDark: true,
    colors: {
      radius: 16,
      text: "#FFF4EC",
      tint: "#FF6B6B",
      background: "#1A1410",
      foreground: "#FFF4EC",
      card: "#2B1D15",
      cardForeground: "#FFF4EC",
      primary: "#FF6B6B",
      primaryForeground: "#1A1410",
      secondary: "#231A12",
      secondaryForeground: "#FFF4EC",
      muted: "#1E1710",
      mutedForeground: "#9A7050",
      accent: "#FFD166",
      accentForeground: "#1A1410",
      destructive: "#EF4444",
      destructiveForeground: "#FFFFFF",
      border: "#332015",
      input: "#332015",
      surface: "#2B1D15",
      surfaceForeground: "#FFF4EC",
      warning: "#FFD166",
      warningForeground: "#1A1410",
      info: "#FF9F43",
      success: "#6EE7B7",
      glass: "rgba(43,29,21,0.88)",
      glassBorder: "rgba(255,107,107,0.22)",
    },
  },

  // 4. Minimal Sand (light)
  sand: {
    name: "sand",
    label: "Minimal Sand",
    tagline: "Clean · Maximum readability",
    preview: ["#F7F6F3", "#4F46E5", "#22C55E"],
    isDark: false,
    colors: {
      radius: 16,
      text: "#1A1A2E",
      tint: "#4F46E5",
      background: "#F7F6F3",
      foreground: "#1A1A2E",
      card: "#FFFFFF",
      cardForeground: "#1A1A2E",
      primary: "#4F46E5",
      primaryForeground: "#FFFFFF",
      secondary: "#EFEEEB",
      secondaryForeground: "#1A1A2E",
      muted: "#F0EFF0",
      mutedForeground: "#6B6B80",
      accent: "#22C55E",
      accentForeground: "#FFFFFF",
      destructive: "#EF4444",
      destructiveForeground: "#FFFFFF",
      border: "#E0DEDB",
      input: "#E0DEDB",
      surface: "#FFFFFF",
      surfaceForeground: "#1A1A2E",
      warning: "#F59E0B",
      warningForeground: "#1A1A2E",
      info: "#6366F1",
      success: "#22C55E",
      glass: "rgba(247,246,243,0.92)",
      glassBorder: "rgba(0,0,0,0.08)",
    },
  },

  // 5. Cyber Violet
  cyber: {
    name: "cyber",
    label: "Cyber Violet",
    tagline: "Modern · Premium tech vibe",
    preview: ["#0E0B1F", "#7B61FF", "#00E5FF"],
    isDark: true,
    colors: {
      radius: 14,
      text: "#F5E8FF",
      tint: "#7B61FF",
      background: "#0E0B1F",
      foreground: "#F5E8FF",
      card: "#1B1635",
      cardForeground: "#F5E8FF",
      primary: "#7B61FF",
      primaryForeground: "#0E0B1F",
      secondary: "#150F2A",
      secondaryForeground: "#F5E8FF",
      muted: "#100D22",
      mutedForeground: "#7B5E9A",
      accent: "#00E5FF",
      accentForeground: "#0E0B1F",
      destructive: "#FF3366",
      destructiveForeground: "#FFFFFF",
      border: "#201840",
      input: "#201840",
      surface: "#1B1635",
      surfaceForeground: "#F5E8FF",
      warning: "#FFA500",
      warningForeground: "#0E0B1F",
      info: "#00E5FF",
      success: "#00FF88",
      glass: "rgba(27,22,53,0.88)",
      glassBorder: "rgba(123,97,255,0.25)",
    },
  },

  // 6. Ocean Productivity
  ocean: {
    name: "ocean",
    label: "Ocean Productivity",
    tagline: "Trustworthy · Calm focus",
    preview: ["#0D1B2A", "#0077B6", "#90E0EF"],
    isDark: true,
    colors: {
      radius: 16,
      text: "#E8F8FF",
      tint: "#0077B6",
      background: "#0D1B2A",
      foreground: "#E8F8FF",
      card: "#1B263B",
      cardForeground: "#E8F8FF",
      primary: "#0077B6",
      primaryForeground: "#E8F8FF",
      secondary: "#142030",
      secondaryForeground: "#E8F8FF",
      muted: "#101D2C",
      mutedForeground: "#507090",
      accent: "#90E0EF",
      accentForeground: "#0D1B2A",
      destructive: "#FF4D6A",
      destructiveForeground: "#FFFFFF",
      border: "#1E2E42",
      input: "#1E2E42",
      surface: "#1B263B",
      surfaceForeground: "#E8F8FF",
      warning: "#F59E0B",
      warningForeground: "#0D1B2A",
      info: "#00B4D8",
      success: "#34D399",
      glass: "rgba(27,38,59,0.88)",
      glassBorder: "rgba(0,119,182,0.25)",
    },
  },

  // 7. Graphite Luxury
  graphite: {
    name: "graphite",
    label: "Graphite Luxury",
    tagline: "Gold on black · Premium feel",
    preview: ["#121212", "#F59E0B", "#FCD34D"],
    isDark: true,
    colors: {
      radius: 12,
      text: "#F8F8F8",
      tint: "#F59E0B",
      background: "#121212",
      foreground: "#F8F8F8",
      card: "#1E1E1E",
      cardForeground: "#F8F8F8",
      primary: "#F59E0B",
      primaryForeground: "#121212",
      secondary: "#1A1A1A",
      secondaryForeground: "#F8F8F8",
      muted: "#141414",
      mutedForeground: "#888888",
      accent: "#FCD34D",
      accentForeground: "#121212",
      destructive: "#FF4444",
      destructiveForeground: "#FFFFFF",
      border: "#2A2A2A",
      input: "#2A2A2A",
      surface: "#1E1E1E",
      surfaceForeground: "#F8F8F8",
      warning: "#FBBF24",
      warningForeground: "#121212",
      info: "#FBBF24",
      success: "#44FF88",
      glass: "rgba(30,30,30,0.92)",
      glassBorder: "rgba(245,158,11,0.22)",
    },
  },

  // 8. Mint Focus
  mint: {
    name: "mint",
    label: "Mint Focus",
    tagline: "Relaxing · Long-term usage",
    preview: ["#0F1F1B", "#10B981", "#A7F3D0"],
    isDark: true,
    colors: {
      radius: 18,
      text: "#E6FFF5",
      tint: "#10B981",
      background: "#0F1F1B",
      foreground: "#E6FFF5",
      card: "#1C2D29",
      cardForeground: "#E6FFF5",
      primary: "#10B981",
      primaryForeground: "#0F1F1B",
      secondary: "#162520",
      secondaryForeground: "#E6FFF5",
      muted: "#122018",
      mutedForeground: "#5A8070",
      accent: "#A7F3D0",
      accentForeground: "#0F1F1B",
      destructive: "#FF4D6A",
      destructiveForeground: "#FFFFFF",
      border: "#1E2E2A",
      input: "#1E2E2A",
      surface: "#1C2D29",
      surfaceForeground: "#E6FFF5",
      warning: "#FBBF24",
      warningForeground: "#0F1F1B",
      info: "#34D399",
      success: "#10B981",
      glass: "rgba(28,45,41,0.88)",
      glassBorder: "rgba(16,185,129,0.22)",
    },
  },

  // 9. Royal Blue Productivity
  royal: {
    name: "royal",
    label: "Royal Blue",
    tagline: "Trustworthy · Analytics-heavy",
    preview: ["#0F172A", "#2563EB", "#93C5FD"],
    isDark: true,
    colors: {
      radius: 16,
      text: "#EEF2FF",
      tint: "#2563EB",
      background: "#0F172A",
      foreground: "#EEF2FF",
      card: "#1E293B",
      cardForeground: "#EEF2FF",
      primary: "#2563EB",
      primaryForeground: "#FFFFFF",
      secondary: "#172033",
      secondaryForeground: "#EEF2FF",
      muted: "#131E30",
      mutedForeground: "#6080B0",
      accent: "#93C5FD",
      accentForeground: "#0F172A",
      destructive: "#F87171",
      destructiveForeground: "#FFFFFF",
      border: "#1E2D46",
      input: "#1E2D46",
      surface: "#1E293B",
      surfaceForeground: "#EEF2FF",
      warning: "#FBBF24",
      warningForeground: "#0F172A",
      info: "#3B82F6",
      success: "#34D399",
      glass: "rgba(30,41,59,0.88)",
      glassBorder: "rgba(37,99,235,0.25)",
    },
  },

  // 10. Rose Gold Premium
  rose: {
    name: "rose",
    label: "Rose Gold Premium",
    tagline: "Warm · Soft metallics",
    preview: ["#1C1414", "#D97777", "#FFD8D8"],
    isDark: true,
    colors: {
      radius: 20,
      text: "#FFF0EC",
      tint: "#D97777",
      background: "#1C1414",
      foreground: "#FFF0EC",
      card: "#2B1E1E",
      cardForeground: "#FFF0EC",
      primary: "#D97777",
      primaryForeground: "#1C1414",
      secondary: "#221818",
      secondaryForeground: "#FFF0EC",
      muted: "#1E1616",
      mutedForeground: "#9A7070",
      accent: "#FFD8D8",
      accentForeground: "#1C1414",
      destructive: "#FF4D6A",
      destructiveForeground: "#FFFFFF",
      border: "#332020",
      input: "#332020",
      surface: "#2B1E1E",
      surfaceForeground: "#FFF0EC",
      warning: "#FFCB8A",
      warningForeground: "#1C1414",
      info: "#F4A7A7",
      success: "#82D9A0",
      glass: "rgba(43,30,30,0.88)",
      glassBorder: "rgba(217,119,119,0.22)",
    },
  },
};
