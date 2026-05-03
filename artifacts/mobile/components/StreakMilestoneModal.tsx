import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useFont } from "@/hooks/useFont";

const MILESTONE_META: Record<number, { icon: string; title: string; color: string }> = {
  7:   { icon: "star",        title: "One Week Streak!",  color: "#3B82F6" },
  14:  { icon: "trending-up", title: "Two Weeks Strong!", color: "#06B6D4" },
  30:  { icon: "award",       title: "30-Day Champion!",  color: "#F97316" },
  60:  { icon: "shield",      title: "Two Month Grind!",  color: "#A855F7" },
  100: { icon: "hexagon",     title: "Century Legend!",   color: "#FBBF24" },
};

interface Props {
  milestone: { habitName: string; habitColor: string; days: number } | null;
  onClose: () => void;
}

export function StreakMilestoneModal({ milestone, onClose }: Props) {
  const colors = useColors();
  const font = useFont();
  const scaleAnim = useRef(new Animated.Value(0.65)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const iconBounce = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (milestone) {
      scaleAnim.setValue(0.65);
      opacityAnim.setValue(0);
      iconBounce.setValue(0.7);

      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start(() => {
        Animated.sequence([
          Animated.spring(iconBounce, { toValue: 1.25, tension: 80, friction: 5, useNativeDriver: true }),
          Animated.spring(iconBounce, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
        ]).start();
      });
    }
  }, [milestone]);

  if (!milestone) return null;

  const meta = MILESTONE_META[milestone.days] ?? {
    icon: "zap",
    title: `${milestone.days}-Day Streak!`,
    color: "#FBBF24",
  };
  const accentColor = milestone.habitColor || meta.color;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Animated.View
          style={[styles.container, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}
        >
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <LinearGradient
              colors={[accentColor + "22", "transparent"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 0.65 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
              pointerEvents="none"
            />

            <View style={styles.flameRow}>
              <Text style={styles.flame}>🔥</Text>
              <View style={[styles.dayBubble, { backgroundColor: accentColor, borderColor: accentColor }]}>
                <Text style={[styles.dayNum, { fontFamily: font.bold }]}>{milestone.days}</Text>
                <Text style={[styles.daySuffix, { fontFamily: font.regular }]}>days</Text>
              </View>
            </View>

            <Animated.View
              style={[
                styles.iconRing,
                {
                  backgroundColor: accentColor + "1E",
                  borderColor: accentColor + "55",
                  transform: [{ scale: iconBounce }],
                },
              ]}
            >
              <Feather name={meta.icon as any} size={40} color={accentColor} />
            </Animated.View>

            <Text style={[styles.title, { color: colors.foreground, fontFamily: font.bold }]}>
              {meta.title}
            </Text>
            <Text style={[styles.habitName, { color: accentColor, fontFamily: font.semibold }]}>
              {milestone.habitName}
            </Text>
            <Text style={[styles.sub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
              You've been consistent for {milestone.days} days straight. Incredible discipline — keep it up!
            </Text>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: accentColor }]}
              activeOpacity={0.85}
            >
              <Text style={[styles.closeBtnText, { fontFamily: font.bold }]}>Keep Blazing! 🔥</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  container: { width: "100%", maxWidth: 340 },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 14,
    overflow: "hidden",
  },
  flameRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  flame: { fontSize: 42 },
  dayBubble: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    alignItems: "center",
    borderWidth: 1.5,
  },
  dayNum: { fontSize: 28, color: "#fff" },
  daySuffix: { fontSize: 11, color: "#ffffff99" },
  iconRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
  },
  title: { fontSize: 22, textAlign: "center" },
  habitName: { fontSize: 15, textAlign: "center" },
  sub: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  closeBtn: {
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 4,
  },
  closeBtnText: { fontSize: 16, color: "#fff" },
});
