export type FontName =
  | "inter"
  | "spaceGrotesk"
  | "outfit"
  | "manrope"
  | "plusJakarta";

export interface FontWeights {
  regular: string;
  medium: string;
  semibold: string;
  bold: string;
}

export interface FontMeta {
  label: string;
  tagline: string;
  preview: string;
  weights: FontWeights;
}

export const FONTS: Record<FontName, FontMeta> = {
  inter: {
    label: "Inter",
    tagline: "Utility · Maximum legibility",
    preview: "Ag",
    weights: {
      regular: "Inter_400Regular",
      medium: "Inter_500Medium",
      semibold: "Inter_600SemiBold",
      bold: "Inter_700Bold",
    },
  },
  spaceGrotesk: {
    label: "Space Grotesk",
    tagline: "Technical · Sci-fi console",
    preview: "Ag",
    weights: {
      regular: "SpaceGrotesk_400Regular",
      medium: "SpaceGrotesk_500Medium",
      semibold: "SpaceGrotesk_600SemiBold",
      bold: "SpaceGrotesk_700Bold",
    },
  },
  outfit: {
    label: "Outfit",
    tagline: "Premium · Clean editorial",
    preview: "Ag",
    weights: {
      regular: "Outfit_400Regular",
      medium: "Outfit_500Medium",
      semibold: "Outfit_600SemiBold",
      bold: "Outfit_700Bold",
    },
  },
  manrope: {
    label: "Manrope",
    tagline: "Dynamic · Organic tech",
    preview: "Ag",
    weights: {
      regular: "Manrope_400Regular",
      medium: "Manrope_500Medium",
      semibold: "Manrope_600SemiBold",
      bold: "Manrope_700Bold",
    },
  },
  plusJakarta: {
    label: "Plus Jakarta Sans",
    tagline: "Modern · Breathable editorial",
    preview: "Ag",
    weights: {
      regular: "PlusJakartaSans_400Regular",
      medium: "PlusJakartaSans_500Medium",
      semibold: "PlusJakartaSans_600SemiBold",
      bold: "PlusJakartaSans_700Bold",
    },
  },
};

export const FONT_ORDER: FontName[] = [
  "inter",
  "spaceGrotesk",
  "outfit",
  "manrope",
  "plusJakarta",
];
