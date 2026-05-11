import React, { useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useFont } from "@/hooks/useFont";
import {
  useHabits,
  PILLAR_LABELS,
  PILLAR_COLORS,
  type HabitCategory,
  type Habit,
} from "@/context/HabitsContext";
import { WeeklyBarChart } from "@/components/WeeklyBarChart";
import { HeatmapChart } from "@/components/HeatmapChart";
import { ProgressRing } from "@/components/ProgressRing";
import { PentagonChart } from "@/components/PentagonChart";
import { MasterDrawer } from "@/components/MasterDrawer";
import { CategoryDrillDown } from "@/components/CategoryDrillDown";
import { AnalysisSheet } from "@/components/AnalysisSheet";

type Period = "7d" | "30d" | "all";

const PILLARS: HabitCategory[] = [
  "physical",
  "mental",
  "academics",
  "creativity",
  "chores",
];

export default function AnalysisScreen() {
  const colors = useColors();
  const font = useFont();
  const insets = useSafeAreaInsets();
  const { habits, routines, userStats, pomodoroSessions } = useHabits();
  const [period, setPeriod] = useState<Period>("30d");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillCategory, setDrillCategory] = useState<HabitCategory | null>(null);
  const [analysisHabit, setAnalysisHabit] = useState<Habit | null>(null);

  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);
  const periodDays = period === "7d" ? 7 : period === "30d" ? 30 : 365;

  const overallStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let totalDue = 0, totalDone = 0;
    for (let i = 0; i < periodDays; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dow = d.getDay();
      activeHabits.forEach((h) => {
        let isDue = false;
        if (h.frequency === "daily") isDue = true;
        else if (h.frequency === "weekdays") isDue = dow >= 1 && dow <= 5;
        else if (h.frequency === "weekends") isDue = dow === 0 || dow === 6;
        else if (h.frequency === "custom") isDue = (h.customDays ?? []).includes(dow);
        if (isDue) {
          totalDue++;
          if (h.completions.find((c) => c.date === dateStr && c.completed)) totalDone++;
        }
      });
    }
    return { rate: totalDue > 0 ? totalDone / totalDue : 0, done: totalDone, due: totalDue };
  }, [activeHabits, periodDays]);

  const pillarScores = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return PILLARS.map((cat) => {
      const catHabits = activeHabits.filter((h) => h.category === cat);
      if (!catHabits.length) return { cat, rate: 0, count: 0 };
      let due = 0, done = 0;
      for (let i = 0; i < periodDays; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const dow = d.getDay();
        catHabits.forEach((h) => {
          let isDue = false;
          if (h.frequency === "daily") isDue = true;
          else if (h.frequency === "weekdays") isDue = dow >= 1 && dow <= 5;
          else if (h.frequency === "weekends") isDue = dow === 0 || dow === 6;
          else if (h.frequency === "custom") isDue = (h.customDays ?? []).includes(dow);
          if (isDue) {
            due++;
            if (h.completions.find((c) => c.date === dateStr && c.completed)) done++;
          }
        });
      }
      return { cat, rate: due > 0 ? done / due : 0, count: catHabits.length };
    });
  }, [activeHabits, periodDays]);

  const habitStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const stats: Record<string, { rate: number; done: number; due: number }> = {};
    activeHabits.forEach((h) => {
      let due = 0, done = 0;
      for (let i = 0; i < periodDays; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const dow = d.getDay();
        let isDue = false;
        if (h.frequency === "daily") isDue = true;
        else if (h.frequency === "weekdays") isDue = dow >= 1 && dow <= 5;
        else if (h.frequency === "weekends") isDue = dow === 0 || dow === 6;
        else if (h.frequency === "custom") isDue = (h.customDays ?? []).includes(dow);
        if (isDue) {
          due++;
          if (h.completions.find((c) => c.date === dateStr && c.completed)) done++;
        }
      }
      stats[h.id] = { rate: due > 0 ? done / due : 0, done, due };
    });
    return stats;
  }, [activeHabits, periodDays]);

  const allCompletions = useMemo(() => {
    const map = new Map<string, boolean>();
    activeHabits.forEach((h) => {
      h.completions.forEach((c) => {
        if (c.completed) map.set(c.date, true);
        else if (!map.has(c.date)) map.set(c.date, false);
      });
    });
    return Array.from(map.entries()).map(([date, completed]) => ({ date, completed }));
  }, [activeHabits]);

  const topHabits = useMemo(
    () => [...activeHabits].sort((a, b) => b.streak - a.streak).slice(0, 4),
    [activeHabits]
  );

  const totalFocusMin = useMemo(
    () =>
      pomodoroSessions
        .filter((s) => s.type === "work")
        .reduce((acc, s) => acc + Math.floor(s.duration / 60), 0),
    [pomodoroSessions]
  );

  const skipReasonStats = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;
    activeHabits.forEach((h) => {
      h.completions.forEach((c) => {
        if (!c.completed && c.skipReason) {
          counts[c.skipReason] = (counts[c.skipReason] ?? 0) + 1;
          total++;
        }
      });
    });
    const sorted = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([reason, count]) => ({ reason, count, pct: total > 0 ? count / total : 0 }));
    return { sorted, total };
  }, [activeHabits]);

  const topPadding =
    Platform.OS === "web" ? Math.max(insets.top, 67) + 16 : insets.top + 16;

  const pentagonScores = pillarScores.map((ps) => ps.rate);

  return (
    <>
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding, paddingBottom: insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.titleRow}>
        <Text style={[styles.pageTitle, { color: colors.foreground, fontFamily: font.bold }]}>
          Analysis
        </Text>
        <View style={styles.periodRow}>
          {(["7d", "30d", "all"] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              style={[
                styles.periodBtn,
                { backgroundColor: period === p ? colors.primary : colors.secondary },
              ]}
            >
              <Text
                style={[
                  styles.periodTxt,
                  {
                    color: period === p ? colors.background : colors.mutedForeground,
                    fontFamily: font.semibold,
                  },
                ]}
              >
                {p === "all" ? "All" : p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          onPress={() => setDrawerOpen(true)}
          style={[styles.drawerBtn, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}
        >
          <Feather name="sidebar" size={17} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ── PENTAGON HUD ── */}
      <View
        style={[
          styles.pentagonCard,
          { backgroundColor: colors.card, borderColor: colors.glassBorder },
        ]}
      >
        {/* Inner ambient glow */}
        <LinearGradient
          colors={[colors.primary + "10", "transparent"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.pentaHeader}>
          <View style={[styles.pentaIconWrap, { backgroundColor: colors.primary + "20" }]}>
            <Feather name="activity" size={14} color={colors.primary} />
          </View>
          <Text style={[styles.pentaTitle, { color: colors.foreground, fontFamily: font.bold }]}>
            Life Balance Pentagon
          </Text>
          <View style={[styles.periodTagWrap, { backgroundColor: colors.primary + "16" }]}>
            <Text style={[styles.periodTag, { color: colors.primary, fontFamily: font.semibold }]}>
              {period === "7d" ? "7 days" : period === "30d" ? "30 days" : "All time"}
            </Text>
          </View>
        </View>
        <PentagonChart scores={pentagonScores} />
        {/* Pillar color legend */}
        <View style={styles.pentaLegend}>
          {PILLARS.map((cat) => (
            <View key={cat} style={styles.pentaLegendItem}>
              <View
                style={[styles.pentaLegendDot, { backgroundColor: PILLAR_COLORS[cat] }]}
              />
              <Text
                style={[
                  styles.pentaLegendLabel,
                  { color: colors.mutedForeground, fontFamily: font.regular },
                ]}
              >
                {PILLAR_LABELS[cat].split(" ")[0]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── PILLAR BREAKDOWN (expandable) ── */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.glass, borderColor: colors.glassBorder },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.info + "22" }]}>
            <Feather name="layers" size={15} color={colors.info} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: font.semibold }]}>
            Five Pillars
          </Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
            tap to drill down
          </Text>
        </View>

        {pillarScores.map(({ cat, rate, count }) => {
          const pillarColor = PILLAR_COLORS[cat];
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => { setDrillCategory(cat); setDrillOpen(true); }}
              activeOpacity={0.75}
              style={[styles.pillarRow, { borderRadius: 12 }]}
            >
              <View style={[styles.pillarDot, { backgroundColor: pillarColor }]} />
              <Text style={[styles.pillarName, { color: colors.foreground, fontFamily: font.medium }]}>
                {PILLAR_LABELS[cat]}
              </Text>
              <Text style={[styles.pillarCount, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                {count}
              </Text>
              <View style={[styles.pillarBarTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.pillarBarFill, { backgroundColor: pillarColor, width: `${rate * 100}%` }]} />
              </View>
              <Text style={[styles.pillarPct, { color: pillarColor, fontFamily: font.semibold }]}>
                {Math.round(rate * 100)}%
              </Text>
              <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── OVERALL PERFORMANCE ── */}
      <View
        style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + "22" }]}>
            <Feather name="target" size={15} color={colors.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: font.semibold }]}>
            Overall Performance
          </Text>
        </View>
        <View style={styles.overviewRow}>
          <ProgressRing
            size={96}
            strokeWidth={8}
            progress={overallStats.rate}
            color={colors.success}
            backgroundColor={colors.border}
          >
            <View style={{ alignItems: "center" }}>
              <Text style={[styles.bigPct, { color: colors.foreground, fontFamily: font.bold }]}>
                {Math.round(overallStats.rate * 100)}%
              </Text>
              <Text
                style={[
                  styles.bigPctLbl,
                  { color: colors.mutedForeground, fontFamily: font.regular },
                ]}
              >
                rate
              </Text>
            </View>
          </ProgressRing>
          <View style={styles.overviewStats}>
            {[
              { label: "Completed", value: overallStats.done, color: colors.success },
              { label: "Total Due", value: overallStats.due, color: colors.foreground },
              { label: "Active", value: activeHabits.length, color: colors.primary },
              { label: "Focus Min", value: totalFocusMin, color: colors.accent },
            ].map((s) => (
              <View key={s.label} style={styles.overviewStat}>
                <Text
                  style={[styles.overviewVal, { color: s.color, fontFamily: font.bold }]}
                >
                  {s.value}
                </Text>
                <Text
                  style={[
                    styles.overviewLbl,
                    { color: colors.mutedForeground, fontFamily: font.regular },
                  ]}
                >
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ── WEEKLY COMPLETION ── */}
      <View
        style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.accent + "22" }]}>
            <Feather name="bar-chart-2" size={15} color={colors.accent} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: font.semibold }]}>
            Weekly Completion
          </Text>
        </View>
        <WeeklyBarChart habits={activeHabits} />
      </View>

      {/* ── ACTIVITY HEATMAP ── */}
      <View
        style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + "22" }]}>
            <Feather name="grid" size={15} color={colors.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: font.semibold }]}>
            Activity Heatmap
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <HeatmapChart completions={allCompletions} color={colors.primary} weeks={20} />
        </ScrollView>
      </View>

      {/* ── TOP PERFORMERS ── */}
      {topHabits.length > 0 && (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.glass, borderColor: colors.glassBorder },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.warning + "22" }]}>
              <Feather name="zap" size={15} color={colors.warning} />
            </View>
            <Text
              style={[styles.cardTitle, { color: colors.foreground, fontFamily: font.semibold }]}
            >
              Top Performers
            </Text>
          </View>
          {topHabits.map((h, i) => (
            <View
              key={h.id}
              style={[
                styles.streakRow,
                {
                  borderBottomColor: colors.border,
                  borderBottomWidth: i < topHabits.length - 1 ? 1 : 0,
                },
              ]}
            >
              <View style={[styles.streakIcon, { backgroundColor: h.color + "22" }]}>
                <Feather name={h.icon as any} size={15} color={h.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.streakName, { color: colors.foreground, fontFamily: font.semibold }]}
                >
                  {h.name}
                </Text>
                <Text
                  style={[
                    styles.streakBest,
                    { color: colors.mutedForeground, fontFamily: font.regular },
                  ]}
                >
                  Best: {h.longestStreak} days
                </Text>
              </View>
              <View style={styles.streakVal}>
                <Feather name="zap" size={13} color={colors.warning} />
                <Text style={[styles.streakNum, { color: colors.warning, fontFamily: font.bold }]}>
                  {h.streak}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── SKIP INTELLIGENCE ── */}
      {skipReasonStats.total > 0 && (
        <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.destructive + "22" }]}>
              <Feather name="x-circle" size={15} color={colors.destructive} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: font.semibold }]}>
              Skip Intelligence
            </Text>
            <Text style={[styles.cardSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
              {skipReasonStats.total} tagged skips
            </Text>
          </View>
          {skipReasonStats.sorted.slice(0, 6).map(({ reason, count, pct }) => (
            <View key={reason} style={styles.skipRow}>
              <Text
                style={[styles.skipReason, { color: colors.foreground, fontFamily: font.medium }]}
                numberOfLines={1}
              >
                {reason}
              </Text>
              <View style={[styles.skipBarTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.skipBarFill,
                    { backgroundColor: colors.destructive, width: `${pct * 100}%` as any },
                  ]}
                />
              </View>
              <Text style={[styles.skipPct, { color: colors.destructive, fontFamily: font.bold }]}>
                {Math.round(pct * 100)}%
              </Text>
              <Text style={[styles.skipCount, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                ×{count}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* ── FOCUS SUMMARY ── */}
      {pomodoroSessions.length > 0 && (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.glass, borderColor: colors.glassBorder },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.accent + "22" }]}>
              <Feather name="target" size={15} color={colors.accent} />
            </View>
            <Text
              style={[styles.cardTitle, { color: colors.foreground, fontFamily: font.semibold }]}
            >
              Focus Summary
            </Text>
          </View>
          <View style={styles.focusStats}>
            {[
              { val: totalFocusMin, lbl: "Total minutes" },
              { val: pomodoroSessions.filter((s) => s.type === "work").length, lbl: "Sessions" },
              { val: Math.round(totalFocusMin / 25), lbl: "Pomodoros" },
            ].map((s) => (
              <View key={s.lbl} style={styles.focusStat}>
                <Text style={[styles.focusVal, { color: colors.foreground, fontFamily: font.bold }]}>
                  {s.val}
                </Text>
                <Text
                  style={[
                    styles.focusLbl,
                    { color: colors.mutedForeground, fontFamily: font.regular },
                  ]}
                >
                  {s.lbl}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>

    <MasterDrawer
      visible={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      habits={habits}
      routines={routines}
      habitStats={habitStats}
      onHabitPress={(h) => { setDrawerOpen(false); setTimeout(() => setAnalysisHabit(h), 180); }}
    />
    <CategoryDrillDown
      visible={drillOpen}
      onClose={() => setDrillOpen(false)}
      category={drillCategory}
      habits={habits}
      habitStats={habitStats}
      periodLabel={period === "7d" ? "7 days" : period === "30d" ? "30 days" : "All time"}
    />
    <AnalysisSheet
      visible={analysisHabit !== null}
      onClose={() => setAnalysisHabit(null)}
      habit={analysisHabit}
      periodLabel={period === "7d" ? "7 days" : period === "30d" ? "30 days" : "All time"}
      habitStats={analysisHabit ? habitStats[analysisHabit.id] : undefined}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pageTitle: { fontSize: 26, flex: 1 },
  drawerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  periodRow: { flexDirection: "row", gap: 4 },
  periodBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  periodTxt: { fontSize: 12 },

  // Pentagon card
  pentagonCard: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 12,
    gap: 6,
    position: "relative",
  },
  pentaHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 },
  pentaIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  pentaTitle: { flex: 1, fontSize: 15 },
  periodTagWrap: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  periodTag: { fontSize: 10 },
  pentaLegend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
    paddingTop: 4,
    flexWrap: "wrap",
  },
  pentaLegendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  pentaLegendDot: { width: 7, height: 7, borderRadius: 3.5 },
  pentaLegendLabel: { fontSize: 10 },

  // Generic card
  card: { borderRadius: 18, padding: 16, borderWidth: 1, gap: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  cardTitle: { flex: 1, fontSize: 15 },
  cardSub: { fontSize: 11 },

  // Pillar rows
  pillarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  pillarDot: { width: 8, height: 8, borderRadius: 4 },
  pillarName: { width: 82, fontSize: 12 },
  pillarCount: { width: 22, fontSize: 10 },
  pillarBarTrack: { flex: 1, height: 5, borderRadius: 3, overflow: "hidden" },
  pillarBarFill: { height: "100%", borderRadius: 3 },
  pillarPct: { width: 32, fontSize: 11, textAlign: "right" },

  // Expanded drill-down
  expandedContainer: {
    marginTop: 4,
    marginBottom: 8,
    marginHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  habitDrillRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  habitDrillIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  habitDrillBody: { flex: 1, gap: 4 },
  habitDrillName: { fontSize: 12 },
  habitDrillBar: { height: 3, borderRadius: 2, overflow: "hidden" },
  habitDrillFill: { height: "100%", borderRadius: 2 },
  habitDrillRight: { alignItems: "flex-end", gap: 2 },
  habitDrillPct: { fontSize: 12 },
  habitDrillStreak: { flexDirection: "row", alignItems: "center", gap: 2 },
  habitDrillStreakNum: { fontSize: 9 },
  noPillarHabits: { fontSize: 12, textAlign: "center", paddingVertical: 6 },

  // Overview
  overviewRow: { flexDirection: "row", alignItems: "center", gap: 18 },
  bigPct: { fontSize: 18 },
  bigPctLbl: { fontSize: 9 },
  overviewStats: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  overviewStat: {},
  overviewVal: { fontSize: 18 },
  overviewLbl: { fontSize: 10 },

  // Streak rows
  streakRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  streakIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  streakName: { fontSize: 13 },
  streakBest: { fontSize: 10 },
  streakVal: { flexDirection: "row", alignItems: "center", gap: 3 },
  streakNum: { fontSize: 17 },

  // Skip Intelligence
  skipRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  skipReason: { fontSize: 12, width: 110 },
  skipBarTrack: { flex: 1, height: 5, borderRadius: 3, overflow: "hidden" },
  skipBarFill: { height: "100%" as any, borderRadius: 3 },
  skipPct: { fontSize: 12, width: 34, textAlign: "right" },
  skipCount: { fontSize: 11, width: 24, textAlign: "right" },

  // Focus
  focusStats: { flexDirection: "row", justifyContent: "space-around" },
  focusStat: { alignItems: "center", gap: 3 },
  focusVal: { fontSize: 22 },
  focusLbl: { fontSize: 10 },
});
