import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useColors } from "@/hooks/useColors";

interface GlassCardProps {
  accent?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  activeOpacity?: number;
  noInnerLight?: boolean;
}

export function GlassCard({
  accent,
  children,
  style,
  onPress,
  activeOpacity = 0.84,
  noInnerLight = false,
}: GlassCardProps) {
  const colors = useColors();
  const a = accent ?? colors.primary;

  const gradientColors = [`${a}18`, `${a}06`] as [string, string];

  const content = (
    <View style={[styles.card, { borderColor: `${a}2A` }, style]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {!noInnerLight && (
        <LinearGradient
          colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={activeOpacity}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
});
