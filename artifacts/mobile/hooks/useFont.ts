import { useTheme } from "@/context/ThemeContext";
import { FONTS, type FontWeights } from "@/constants/fonts";

export function useFont(): FontWeights {
  const { fontName } = useTheme();
  return FONTS[fontName].weights;
}
