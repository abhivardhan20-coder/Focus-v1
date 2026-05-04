import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useFont } from "@/hooks/useFont";
import type { Habit } from "@/context/HabitsContext";

interface DifficultyNudgeCardProps {
  habit: Habit;
  type: "upgrade" | "downgrade";
  rate: number;
  onAccept: () => void;
  onDismiss: () => void;
}

export function DifficultyNudgeCard({
  habit,
  type,
  rate,
  onAccept,
  onDismiss,
}: DifficultyNudgeCardProps) {
  const colors = useColors();
  const font = useFont();

  const isUpgrade = type === "upgrade";
  const accentColor = isUpgrade ? colors.success : colors.warning;

  const newTarget =
    habit.type === "quantitative" && habit.targetValue
      ? isUpgrade
        ? Math.round(habit.targetValue * 1.33)
        : Math.round(habit.targetValue * 0.7)
      : null;

  const newDifficulty = isUpgrade ? "hard" : "medium";

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: accentColor + "0E", borderColor: accentColor + "30" },
      ]}
    >
      <LinearGradient
        colors={[accentColor + "14", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: accentColor + "22" }]}>
          <Feather
            name={isUpgrade ? "trending-up" : "trending-down"}
            size={16}
            color={accentColor}
          />
        </View>
        <View style={styles.labelCol}>
          <Text style={[styles.nudgeTag, { color: accentColor, fontFamily: font.bold }]}>
            {isUpgrade ? "READY TO LEVEL UP" : "MOMENTUM RESET"}
          </Text>
          <Text
            style={[styles.habitName, { color: colors.foreground, fontFamily: font.semibold }]}
            numberOfLines={1}
          >
            {habit.name}
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Feather name="x" size={15} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.body, { color: colors.mutedForeground, fontFamily: font.regular }]}>
        {isUpgrade
          ? `${Math.round(rate * 100)}% for 30 days — you've mastered ${habit.difficulty}. Ready for more XP?`
          : `${Math.round(rate * 100)}% for 30 days on hard. Lower the target to rebuild momentum.`}
      </Text>

      <View style={styles.actionRow}>
        <View style={[styles.diffChip, { backgroundColor: accentColor + "18" }]}>
          <Text style={[styles.diffText, { color: accentColor, fontFamily: font.semibold }]}>
            {habit.difficulty} → {newDifficulty}
          </Text>
          {newTarget ? (
            <Text style={[styles.targetHint, { color: accentColor + "BB", fontFamily: font.regular }]}>
              {" "}· {newTarget} {habit.targetUnit}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={onAccept}
          style={[styles.acceptBtn, { backgroundColor: accentColor }]}
          activeOpacity={0.85}
        >
          <Text style={[styles.acceptText, { color: "#fff", fontFamily: font.bold }]}>
            {isUpgrade ? "Level Up" : "Adjust Down"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    overflow: "hidden",
    position: "relative",
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  labelCol: { flex: 1, gap: 1 },
  nudgeTag: { fontSize: 9, letterSpacing: 1.1 },
  habitName: { fontSize: 14 },
  body: { fontSize: 12, lineHeight: 18 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  diffChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    flex: 1,
  },
  diffText: { fontSize: 12 },
  targetHint: { fontSize: 12 },
  acceptBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  acceptText: { fontSize: 13 },
});
