import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useFont } from "@/hooks/useFont";
import type { Habit } from "@/context/HabitsContext";

interface MicroHabitModalProps {
  visible: boolean;
  habit: Habit | null;
  onClose: () => void;
  onCompleteMicro: (habitId: string, microValue?: number) => void;
  onSkipAnyway: (habitId: string) => void;
}

export function MicroHabitModal({
  visible,
  habit,
  onClose,
  onCompleteMicro,
  onSkipAnyway,
}: MicroHabitModalProps) {
  const colors = useColors();
  const font = useFont();
  const slideY = useRef(new Animated.Value(500)).current;
  const [microValue, setMicroValue] = useState("");

  useEffect(() => {
    if (visible) {
      setMicroValue(
        habit?.type === "quantitative" && habit.targetValue
          ? String(Math.max(1, Math.ceil(habit.targetValue / 4)))
          : ""
      );
      Animated.spring(slideY, {
        toValue: 0,
        tension: 70,
        friction: 11,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(slideY, {
        toValue: 500,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [visible, habit]);

  if (!habit) return null;

  const microSuggestion =
    habit.type === "quantitative" && habit.targetValue
      ? `${Math.max(1, Math.ceil(habit.targetValue / 4))} ${habit.targetUnit ?? ""}`
      : habit.type === "timed"
      ? "5 minutes"
      : "just a short version";

  const handleMicro = () => {
    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const val =
      habit.type === "quantitative" ? parseFloat(microValue) || undefined : undefined;
    onCompleteMicro(habit.id, val);
    onClose();
  };

  const handleSkip = () => {
    onSkipAnyway(habit.id);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: "#F9731644",
              transform: [{ translateY: slideY }],
            },
          ]}
        >
          <LinearGradient
            colors={["rgba(251,191,36,0.10)", "transparent"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.header}>
            <View style={[styles.shieldIcon, { backgroundColor: "#F9731622" }]}>
              <Feather name="shield" size={24} color="#F97316" />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.foreground, fontFamily: font.bold }]}>
                Protect Your Streak
              </Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                {habit.streak}-day streak at risk
              </Text>
            </View>
          </View>

          <View style={[styles.habitChip, { backgroundColor: habit.color + "18", borderColor: habit.color + "44" }]}>
            <Feather name={habit.icon as any} size={16} color={habit.color} />
            <Text style={[styles.habitChipName, { color: habit.color, fontFamily: font.semibold }]}>
              {habit.name}
            </Text>
            <View style={[styles.streakBadge, { backgroundColor: "#F9731622" }]}>
              <Feather name="zap" size={11} color="#F97316" />
              <Text style={[styles.streakBadgeText, { color: "#F97316", fontFamily: font.bold }]}>
                {habit.streak}
              </Text>
            </View>
          </View>

          <View style={[styles.microBox, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
            <Text style={[styles.microLabel, { color: colors.mutedForeground, fontFamily: font.bold }]}>
              MICRO VERSION
            </Text>
            <Text style={[styles.microSuggestion, { color: colors.foreground, fontFamily: font.medium }]}>
              Do {microSuggestion} — your streak lives with an amber marker.
            </Text>
            {habit.type === "quantitative" && (
              <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                <Feather name="edit-3" size={14} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.valueInput, { color: colors.foreground, fontFamily: font.semibold }]}
                  value={microValue}
                  onChangeText={setMicroValue}
                  keyboardType="numeric"
                  placeholder="Amount"
                  placeholderTextColor={colors.mutedForeground}
                />
                {habit.targetUnit ? (
                  <Text style={[styles.unitLabel, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                    {habit.targetUnit}
                  </Text>
                ) : null}
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={handleMicro}
            style={[styles.microBtn, { backgroundColor: "#F97316" }]}
            activeOpacity={0.85}
          >
            <Feather name="check-circle" size={18} color="#fff" />
            <Text style={[styles.microBtnText, { color: "#fff", fontFamily: font.bold }]}>
              Complete Micro Version
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkip} style={styles.skipAnyway}>
            <Text style={[styles.skipAnywayText, { color: colors.mutedForeground, fontFamily: font.regular }]}>
              Skip anyway (streak resets)
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.58)" },
  keyboardView: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 24,
    paddingBottom: 42,
    gap: 16,
    overflow: "hidden",
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  header: { flexDirection: "row", alignItems: "center", gap: 14 },
  shieldIcon: { width: 54, height: 54, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, gap: 2 },
  title: { fontSize: 20 },
  subtitle: { fontSize: 13 },
  habitChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  habitChipName: { flex: 1, fontSize: 15 },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  streakBadgeText: { fontSize: 12 },
  microBox: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  microLabel: { fontSize: 10, letterSpacing: 1.1 },
  microSuggestion: { fontSize: 14, lineHeight: 21 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  valueInput: { flex: 1, fontSize: 16, padding: 0 },
  unitLabel: { fontSize: 13 },
  microBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  microBtnText: { fontSize: 16 },
  skipAnyway: { alignItems: "center", paddingVertical: 4 },
  skipAnywayText: { fontSize: 13 },
});
