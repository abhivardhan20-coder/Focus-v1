import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useFont } from "@/hooks/useFont";
import { PILLAR_COLORS, PILLAR_LABELS, getTodayStr, type Habit } from "@/context/HabitsContext";
import { ProgressRing } from "./ProgressRing";
import { SparklineChart } from "./SparklineChart";
import { HeatmapChart } from "./HeatmapChart";

const { height: H } = Dimensions.get("window");
const SPARK_DAYS = 30;

interface AnalysisSheetProps {
  visible: boolean;
  onClose: () => void;
  habit: Habit | null;
  periodLabel?: string;
  habitStats?: { rate: number; done: number; due: number };
}

function buildSparkline(habit: Habit, days: number): number[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const ds = d.toISOString().split("T")[0];
    return habit.completions.find((c) => c.date === ds && c.completed) ? 1 : 0;
  });
}

function getCalendarWeek(habit: Habit) {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const ds = d.toISOString().split("T")[0];
    const comp = habit.completions.find((c) => c.date === ds);
    return {
      date: ds,
      completed: comp?.completed ?? false,
      skipped: comp !== undefined && !comp.completed,
      isToday: ds === getTodayStr(),
      dayNum: d.getDate(),
      dayLabel: ["S", "M", "T", "W", "T", "F", "S"][d.getDay()],
    };
  });
}

export function AnalysisSheet({
  visible,
  onClose,
  habit,
  periodLabel = "30 days",
  habitStats,
}: AnalysisSheetProps) {
  const colors = useColors();
  const font = useFont();

  const slideY = useRef(new Animated.Value(H)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, tension: 60, friction: 12, useNativeDriver: false }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 260, useNativeDriver: false }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY, { toValue: H, duration: 220, useNativeDriver: false }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
      ]).start();
    }
  }, [visible]);

  const sparkData = useMemo(() => {
    if (!habit) return Array(SPARK_DAYS).fill(0);
    return buildSparkline(habit, SPARK_DAYS);
  }, [habit]);

  const calWeek = useMemo(() => {
    if (!habit) return [];
    return getCalendarWeek(habit);
  }, [habit]);

  const computedStats = useMemo(() => {
    if (!habit) return { rate: 0, done: 0, due: 0 };
    if (habitStats) return habitStats;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let due = 0, done = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dow = d.getDay();
      const ds = d.toISOString().split("T")[0];
      let isDue = false;
      if (habit.frequency === "daily") isDue = true;
      else if (habit.frequency === "weekdays") isDue = dow >= 1 && dow <= 5;
      else if (habit.frequency === "weekends") isDue = dow === 0 || dow === 6;
      else if (habit.frequency === "custom") isDue = (habit.customDays ?? []).includes(dow);
      if (isDue) {
        due++;
        if (habit.completions.find((c) => c.date === ds && c.completed)) done++;
      }
    }
    return { rate: due > 0 ? done / due : 0, done, due };
  }, [habit, habitStats]);

  const weeklyRate = useMemo(() => {
    const last7 = sparkData.slice(-7);
    return last7.filter(Boolean).length / 7;
  }, [sparkData]);

  const completionHistory = useMemo(() => {
    if (!habit) return [];
    return [...habit.completions]
      .filter((c) => c.completed)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [habit]);

  if (!habit) return null;

  const pillarColor = PILLAR_COLORS[habit.category];
  const accentColor = habit.color;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            borderColor: accentColor + "30",
            transform: [{ translateY: slideY }],
          },
        ]}
      >
        <LinearGradient
          colors={[accentColor + "0C", "transparent"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.habitIcon, { backgroundColor: accentColor + "22" }]}>
            <Feather name={habit.icon as any} size={20} color={accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.habitName, { color: colors.foreground, fontFamily: font.bold }]} numberOfLines={1}>
              {habit.name}
            </Text>
            <View style={styles.metaRow}>
              <View style={[styles.pillarDot, { backgroundColor: pillarColor }]} />
              <Text style={[styles.pillarLabel, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                {PILLAR_LABELS[habit.category]}
              </Text>
              {habit.streak > 0 && (
                <>
                  <Text style={[styles.metaDivider, { color: colors.border }]}>·</Text>
                  <Text style={[styles.streakText, { color: "#FBBF24", fontFamily: font.semibold }]}>
                    {habit.streak}🔥
                  </Text>
                </>
              )}
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.secondary }]}>
            <Feather name="x" size={17} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
          {/* Stat cards row */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: accentColor + "12", borderColor: accentColor + "28" }]}>
              <ProgressRing size={72} strokeWidth={6} progress={computedStats.rate} color={accentColor} backgroundColor={accentColor + "20"}>
                <Text style={[styles.ringPct, { color: colors.foreground, fontFamily: font.bold }]}>
                  {Math.round(computedStats.rate * 100)}%
                </Text>
              </ProgressRing>
              <Text style={[styles.statCardLabel, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                {periodLabel}
              </Text>
            </View>

            <View style={styles.miniStatsCol}>
              {[
                { val: habit.streak, lbl: "current streak", color: "#FBBF24" },
                { val: habit.longestStreak, lbl: "best streak", color: accentColor },
                { val: computedStats.done, lbl: "completions", color: colors.success },
              ].map((s) => (
                <View key={s.lbl} style={[styles.miniStatRow, { backgroundColor: colors.secondary, borderColor: colors.glassBorder }]}>
                  <Text style={[styles.miniStatVal, { color: s.color, fontFamily: font.bold }]}>{s.val}</Text>
                  <Text style={[styles.miniStatLbl, { color: colors.mutedForeground, fontFamily: font.regular }]}>{s.lbl}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Sparkline */}
          <View style={[styles.sparkCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
            <View style={styles.sparkHeader}>
              <Text style={[styles.sparkTitle, { color: colors.foreground, fontFamily: font.semibold }]}>30-Day Trend</Text>
              <Text style={[styles.sparkSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                {Math.round(weeklyRate * 100)}% this week
              </Text>
            </View>
            <SparklineChart data={sparkData} width={Math.min(W - 100, 320)} height={56} color={accentColor} strokeWidth={2.5} showFill />
          </View>

          {/* 14-day dots */}
          <View style={[styles.dotsCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
            <Text style={[styles.dotsTitle, { color: colors.foreground, fontFamily: font.semibold }]}>Last 14 Days</Text>
            <View style={styles.dotsRow}>
              {calWeek.map((d, i) => (
                <View key={i} style={styles.dotCol}>
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor: d.completed
                          ? accentColor
                          : d.skipped
                          ? colors.warning + "55"
                          : colors.border,
                        borderWidth: d.isToday ? 2 : 0,
                        borderColor: d.isToday ? accentColor : "transparent",
                      },
                    ]}
                  />
                  <Text style={[styles.dotLabel, { color: d.isToday ? accentColor : colors.mutedForeground, fontFamily: d.isToday ? font.bold : font.regular }]}>
                    {d.dayLabel}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Heatmap */}
          <View style={[styles.heatCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
            <Text style={[styles.dotsTitle, { color: colors.foreground, fontFamily: font.semibold }]}>Activity Heatmap</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <HeatmapChart completions={habit.completions} color={accentColor} weeks={14} />
            </ScrollView>
          </View>

          {/* Recent completions */}
          {completionHistory.length > 0 && (
            <View style={[styles.histCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
              <Text style={[styles.dotsTitle, { color: colors.foreground, fontFamily: font.semibold }]}>Recent Completions</Text>
              {completionHistory.map((c, i) => (
                <View key={i} style={[styles.histRow, { borderBottomColor: colors.border, borderBottomWidth: i < completionHistory.length - 1 ? 1 : 0 }]}>
                  <View style={[styles.histDot, { backgroundColor: accentColor + "22" }]}>
                    <Feather name="check" size={11} color={accentColor} />
                  </View>
                  <Text style={[styles.histDate, { color: colors.foreground, fontFamily: font.medium }]}>
                    {new Date(c.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </Text>
                  {c.isMicro && (
                    <View style={[styles.microBadge, { backgroundColor: "#F9731622" }]}>
                      <Text style={{ fontSize: 9, color: "#F97316", fontFamily: font.bold }}>micro</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const { width: W } = Dimensions.get("window");

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.60)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    maxHeight: "90%",
    overflow: "hidden",
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  habitIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  habitName: { fontSize: 18, lineHeight: 22 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  pillarDot: { width: 6, height: 6, borderRadius: 3 },
  pillarLabel: { fontSize: 11 },
  metaDivider: { fontSize: 11 },
  streakText: { fontSize: 11 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    paddingHorizontal: 18,
    paddingBottom: 48,
    gap: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  statCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 6,
  },
  ringPct: { fontSize: 14 },
  statCardLabel: { fontSize: 10 },
  miniStatsCol: { flex: 1, gap: 7 },
  miniStatRow: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  miniStatVal: { fontSize: 16, fontVariant: ["tabular-nums"] },
  miniStatLbl: { flex: 1, fontSize: 11 },
  sparkCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    overflow: "hidden",
  },
  sparkHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sparkTitle: { fontSize: 13 },
  sparkSub: { fontSize: 11 },
  dotsCard: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 10 },
  dotsTitle: { fontSize: 13 },
  dotsRow: { flexDirection: "row", gap: 6 },
  dotCol: { flex: 1, alignItems: "center", gap: 4 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  dotLabel: { fontSize: 9 },
  heatCard: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 10 },
  histCard: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 10 },
  histRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7 },
  histDot: { width: 22, height: 22, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  histDate: { flex: 1, fontSize: 13 },
  microBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
});
