import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useFont } from "@/hooks/useFont";
import { PILLAR_COLORS, PILLAR_LABELS, type Habit, type HabitCategory } from "@/context/HabitsContext";
import { ProgressRing } from "./ProgressRing";
import { SparklineChart } from "./SparklineChart";

const { width: W, height: H } = Dimensions.get("window");
const SPARK_DAYS = 14;

const CATEGORY_ICONS: Record<HabitCategory, string> = {
  physical: "activity",
  mental: "wind",
  academics: "book-open",
  creativity: "pen-tool",
  chores: "home",
};

function buildSparkline(habit: Habit): number[] {
  return Array.from({ length: SPARK_DAYS }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (SPARK_DAYS - 1 - i));
    const ds = d.toISOString().split("T")[0];
    return habit.completions.find((c) => c.date === ds)?.completed ? 1 : 0;
  });
}

export interface CategoryDrillDownProps {
  visible: boolean;
  onClose: () => void;
  category: HabitCategory | null;
  habits: Habit[];
  habitStats: Record<string, { rate: number; done: number; due: number }>;
  periodLabel: string;
}

export function CategoryDrillDown({
  visible,
  onClose,
  category,
  habits,
  habitStats,
  periodLabel,
}: CategoryDrillDownProps) {
  const colors = useColors();
  const font = useFont();
  const translateY = useSharedValue(H);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 24, stiffness: 220 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withTiming(H * 0.6, { duration: 230 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!category) return null;

  const color = PILLAR_COLORS[category];
  const catHabits = habits.filter((h) => !h.archived && h.category === category);
  const catIcon = CATEGORY_ICONS[category];

  const avgRate =
    catHabits.length > 0
      ? catHabits.reduce((s, h) => s + (habitStats[h.id]?.rate ?? 0), 0) / catHabits.length
      : 0;
  const topStreak = catHabits.reduce((best, h) => Math.max(best, h.streak), 0);
  const totalDone = catHabits.reduce((s, h) => s + (habitStats[h.id]?.done ?? 0), 0);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[styles.sheet, { backgroundColor: colors.background }, sheetStyle]}>
        <LinearGradient
          colors={[color + "1A", "transparent"]}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.25 }}
          style={StyleSheet.absoluteFill} pointerEvents="none"
        />

        {/* Header */}
        <View style={[styles.hdr, { borderBottomColor: colors.border }]}>
          <View style={[styles.catIconWrap, { backgroundColor: color + "22" }]}>
            <Feather name={catIcon as any} size={20} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.catTitle, { color: color, fontFamily: font.bold }]}>
              {PILLAR_LABELS[category]}
            </Text>
            <Text style={[styles.catSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
              {catHabits.length} habit{catHabits.length !== 1 ? "s" : ""} · {periodLabel}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: colors.secondary }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="x" size={16} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Summary row */}
        <View style={styles.summary}>
          <ProgressRing size={96} strokeWidth={7} progress={avgRate} color={color} backgroundColor={color + "22"}>
            <View style={{ alignItems: "center" }}>
              <Text style={[styles.ringBig, { color: colors.foreground, fontFamily: font.bold }]}>
                {Math.round(avgRate * 100)}%
              </Text>
              <Text style={[styles.ringLbl, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                avg rate
              </Text>
            </View>
          </ProgressRing>
          <View style={styles.summaryStats}>
            {[
              { num: topStreak, lbl: "top streak", clr: "#FBBF24" },
              { num: totalDone, lbl: "completions", clr: colors.success },
              { num: catHabits.length, lbl: "habits", clr: color },
            ].map((s) => (
              <View key={s.lbl} style={[styles.summaryBox, { backgroundColor: s.clr + "12", borderColor: s.clr + "28" }]}>
                <Text style={[styles.summaryNum, { color: s.clr, fontFamily: font.bold }]}>{s.num}</Text>
                <Text style={[styles.summaryLbl, { color: colors.mutedForeground, fontFamily: font.regular }]}>{s.lbl}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Habit cards */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {catHabits.length === 0 ? (
            <View style={styles.empty}>
              <Feather name={catIcon as any} size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyTxt, { color: colors.mutedForeground, fontFamily: font.medium }]}>
                No habits in this pillar yet
              </Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                Create a habit tagged as {PILLAR_LABELS[category]}
              </Text>
            </View>
          ) : (
            catHabits.map((h) => {
              const hs = habitStats[h.id] ?? { rate: 0, done: 0, due: 0 };
              const spark = buildSparkline(h);
              return (
                <View key={h.id} style={[styles.habitCard, { backgroundColor: colors.card, borderColor: color + "30" }]}>
                  <View style={styles.habitTop}>
                    <View style={[styles.habitIcon, { backgroundColor: color + "20" }]}>
                      <Feather name={h.icon as any} size={15} color={color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.habitName, { color: colors.foreground, fontFamily: font.semibold }]} numberOfLines={1}>
                        {h.name}
                      </Text>
                      <View style={styles.habitMeta}>
                        {h.streak > 0 && (
                          <Text style={[styles.metaTxt, { color: "#FBBF24", fontFamily: font.bold }]}>
                            🔥 {h.streak}d
                          </Text>
                        )}
                        <Text style={[styles.metaTxt, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                          best {h.longestStreak}d
                        </Text>
                        <Text style={[styles.metaTxt, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                          {hs.done}/{hs.due} done
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.rateRing, { borderColor: hs.rate >= 0.8 ? colors.success : color }]}>
                      <Text style={[styles.rateRingNum, { color: hs.rate >= 0.8 ? colors.success : color, fontFamily: font.bold }]}>
                        {Math.round(hs.rate * 100)}%
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                    <View style={[styles.barFill, { backgroundColor: hs.rate >= 0.8 ? colors.success : color, width: `${hs.rate * 100}%` }]} />
                  </View>
                  <View style={styles.sparkRow}>
                    <Text style={[styles.sparkLbl, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                      14-day activity
                    </Text>
                    <SparklineChart data={spark} width={W - 80} height={44} color={color} strokeWidth={2.5} />
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  hdr: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  catIconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  catTitle: { fontSize: 20 },
  catSub: { fontSize: 11, marginTop: 2 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  summary: { flexDirection: "row", alignItems: "center", gap: 16, padding: 18, paddingBottom: 12 },
  ringBig: { fontSize: 18 },
  ringLbl: { fontSize: 9 },
  summaryStats: { flex: 1, gap: 8 },
  summaryBox: { borderRadius: 10, padding: 10, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  summaryNum: { fontSize: 22, minWidth: 32 },
  summaryLbl: { fontSize: 10 },
  list: { padding: 16, gap: 12, paddingBottom: 48 },
  empty: { alignItems: "center", gap: 10, paddingVertical: 60 },
  emptyTxt: { fontSize: 15 },
  emptySub: { fontSize: 12 },
  habitCard: { borderRadius: 16, padding: 14, borderWidth: 1, gap: 10 },
  habitTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  habitIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  habitName: { fontSize: 14 },
  habitMeta: { flexDirection: "row", gap: 10, marginTop: 3, flexWrap: "wrap" },
  metaTxt: { fontSize: 11 },
  rateRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  rateRingNum: { fontSize: 10 },
  barTrack: { height: 3.5, borderRadius: 2, overflow: "hidden" },
  barFill: { height: "100%" },
  sparkRow: { gap: 5 },
  sparkLbl: { fontSize: 10 },
});
