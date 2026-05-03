import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useFont } from "@/hooks/useFont";
import type { Habit } from "@/context/HabitsContext";

export const SKIP_REASONS = [
  { label: "Too tired", icon: "moon" as const },
  { label: "Sick", icon: "thermometer" as const },
  { label: "No time", icon: "clock" as const },
  { label: "Out of routine", icon: "shuffle" as const },
  { label: "Injury", icon: "alert-triangle" as const },
  { label: "Travel", icon: "map-pin" as const },
];

interface SkipReasonModalProps {
  visible: boolean;
  habit: Habit | null;
  onClose: () => void;
  onSkip: (habitId: string, reason: string) => void;
}

export function SkipReasonModal({ visible, habit, onClose, onSkip }: SkipReasonModalProps) {
  const colors = useColors();
  const font = useFont();
  const slideY = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideY, {
        toValue: 0,
        tension: 70,
        friction: 11,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(slideY, { toValue: 500, duration: 200, useNativeDriver: false }).start();
    }
  }, [visible]);

  if (!habit) return null;

  const handleReason = (reason: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSkip(habit.id, reason);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} style={styles.backdrop} onPress={onClose} />
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            borderColor: colors.glassBorder,
            transform: [{ translateY: slideY }],
          },
        ]}
      >
        <LinearGradient
          colors={["rgba(239,68,68,0.06)", "transparent"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: colors.destructive + "20" }]}>
            <Feather name="x-circle" size={20} color={colors.destructive} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: font.bold }]}>
              Why are you skipping?
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: font.regular }]}>
              Helps surface patterns in your analysis
            </Text>
          </View>
        </View>

        <View style={styles.chipsGrid}>
          {SKIP_REASONS.map((r) => (
            <TouchableOpacity
              key={r.label}
              onPress={() => handleReason(r.label)}
              style={[styles.chip, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
              activeOpacity={0.72}
            >
              <Feather name={r.icon} size={16} color={colors.destructive} />
              <Text style={[styles.chipText, { color: colors.foreground, fontFamily: font.medium }]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={() => handleReason("")}
          style={styles.noReason}
        >
          <Text style={[styles.noReasonText, { color: colors.mutedForeground, fontFamily: font.regular }]}>
            Skip without a reason
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 24,
    paddingBottom: 46,
    gap: 16,
    overflow: "hidden",
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  header: { flexDirection: "row", alignItems: "center", gap: 14 },
  iconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, gap: 2 },
  title: { fontSize: 18 },
  subtitle: { fontSize: 12 },
  chipsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: "46%",
    flex: 1,
  },
  chipText: { fontSize: 14 },
  noReason: { alignItems: "center", paddingVertical: 4 },
  noReasonText: { fontSize: 13 },
});
