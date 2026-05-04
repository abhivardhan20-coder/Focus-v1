import { useTheme } from "@/context/ThemeContext";

export function useColors() {
  const { theme } = useTheme();
  return theme.colors;
}
