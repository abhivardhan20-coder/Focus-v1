import React, { useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useFont } from "@/hooks/useFont";
import { useHabits, PILLAR_COLORS, type Habit, type Routine } from "@/context/HabitsContext";
import { HeatmapChart } from "@/components/HeatmapChart";
import { RetroEditModal } from "@/components/RetroEditModal";

function buildRoutineCompletions(routineHabits: Habit[]): { date: string; completed: boolean }[] {
  if (routineHabits.length === 0) return [];
  const dateSet = new Set<string>();
  routineHabits.forEach((h) => h.completions.forEach((c) => dateSet.add(c.date)));
  return Array.from(dateSet).map((date) => {
    const allDone = routineHabits.every((h) =>
      h.completions.find((c) => c.date === date && c.completed)
    );
    return { date, completed: allDone };
  });
}

function PerHabitHeatmap({ habit, completions }: { habit: Habit; completions: { date: string; completed: boolean }[] }) {
  const colors = useColors();
  const font = useFont();
  const [expanded, setExpanded] = useState(false);
  const accentColor = habit.color ?? PILLAR_COLORS[habit.category];
  const done30 = completions.filter((c) => {
    const d = new Date(c.date + "T12:00:00");
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    return c.completed && d >= cutoff;
  }).length;

  return (
    <View style={{ marginBottom: 8 }}>
      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.75}
        style={[hmStyles.habitRow, { backgroundColor: expanded ? accentColor + "0D" : "transparent", borderColor: expanded ? accentColor + "35" : colors.border }]}
      >
        <View style={[hmStyles.habitIcon, { backgroundColor: accentColor + "22" }]}>
          <Feather name={habit.icon as any} size={14} color={accentColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[hmStyles.habitName, { color: colors.foreground, fontFamily: font.medium }]} numberOfLines={1}>{habit.name}</Text>
          <Text style={[hmStyles.habitSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>{done30} days done (last 30)</Text>
        </View>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
      </TouchableOpacity>
      {expanded && (
        <View style={[hmStyles.heatWrap, { backgroundColor: accentColor + "08", borderColor: accentColor + "20" }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <HeatmapChart completions={completions} color={accentColor} weeks={16} />
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function PerRoutineHeatmap({ routine, completions }: { routine: Routine; completions: { date: string; completed: boolean }[] }) {
  const colors = useColors();
  const font = useFont();
  const [expanded, setExpanded] = useState(false);
  const done30 = completions.filter((c) => {
    const d = new Date(c.date + "T12:00:00");
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    return c.completed && d >= cutoff;
  }).length;

  return (
    <View style={{ marginBottom: 8 }}>
      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.75}
        style={[hmStyles.habitRow, { backgroundColor: expanded ? colors.accent + "0D" : "transparent", borderColor: expanded ? colors.accent + "35" : colors.border }]}
      >
        <View style={[hmStyles.habitIcon, { backgroundColor: colors.accent + "22" }]}>
          <Feather name="layers" size={14} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[hmStyles.habitName, { color: colors.foreground, fontFamily: font.medium }]} numberOfLines={1}>{routine.name}</Text>
          <Text style={[hmStyles.habitSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>{done30} days fully complete (last 30)</Text>
        </View>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
      </TouchableOpacity>
      {expanded && (
        <View style={[hmStyles.heatWrap, { backgroundColor: colors.accent + "08", borderColor: colors.accent + "20" }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <HeatmapChart completions={completions} color={colors.accent} weeks={16} />
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const hmStyles = StyleSheet.create({
  habitRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, marginBottom: 2 },
  habitIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  habitName: { fontSize: 13 },
  habitSub: { fontSize: 10, marginTop: 1 },
  heatWrap: { borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 4 },
});

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function getMonthDays(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function glowColorForRate(rate: number, colors: any): { bg: string; border: string; glow: boolean } {
  if (rate >= 1.0) return { bg: colors.primary + "50", border: colors.primary + "AA", glow: true };
  if (rate >= 0.8) return { bg: colors.success + "44", border: colors.success + "66", glow: false };
  if (rate >= 0.6) return { bg: colors.success + "28", border: "transparent", glow: false };
  if (rate >= 0.4) return { bg: colors.warning + "33", border: "transparent", glow: false };
  if (rate > 0) return { bg: colors.destructive + "22", border: "transparent", glow: false };
  return { bg: "transparent", border: "transparent", glow: false };
}

export default function HistoryScreen() {
  const colors = useColors();
  const font = useFont();
  const insets = useSafeAreaInsets();
  const { habits, routines } = useHabits();

  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [retroOpen, setRetroOpen] = useState(false);
  const [retroDate, setRetroDate] = useState<string | null>(null);

  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);

  const completionMap = useMemo(() => {
    const map = new Map<string, { done: number; total: number }>();
    activeHabits.forEach((h) => {
      h.completions.forEach((c) => {
        const existing = map.get(c.date) ?? { done: 0, total: 0 };
        map.set(c.date, {
          done: existing.done + (c.completed ? 1 : 0),
          total: existing.total + 1,
        });
      });
    });
    return map;
  }, [activeHabits]);

  const allCompletions = useMemo(() => {
    const res: { date: string; completed: boolean }[] = [];
    completionMap.forEach((v, date) => {
      res.push({ date, completed: v.done > 0 });
    });
    return res;
  }, [completionMap]);

  const daysInMonth = getMonthDays(viewYear, viewMonth);
  const firstDow = getFirstDayOfMonth(viewYear, viewMonth);
  const todayStr = now.toISOString().split("T")[0];

  const selectedHabits = useMemo(() => {
    if (!selectedDate) return [];
    return activeHabits.map((h) => ({
      habit: h,
      completion: h.completions.find((c) => c.date === selectedDate),
    }));
  }, [selectedDate, activeHabits]);

  const monthCompletionRate = useMemo(() => {
    let done = 0, total = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (dateStr > todayStr) continue;
      const stats = completionMap.get(dateStr);
      if (stats) { done += stats.done; total += stats.total; }
    }
    return total > 0 ? done / total : 0;
  }, [completionMap, viewMonth, viewYear, daysInMonth, todayStr]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
    setSelectedDate(null);
  };

  const topPadding = Platform.OS === "web" ? Math.max(insets.top, 67) + 16 : insets.top + 16;

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
      <View style={styles.titleRow}>
        <View>
          <Text style={[styles.pageTitle, { color: colors.foreground, fontFamily: font.bold }]}>
            History
          </Text>
          <Text style={[styles.pageSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
            Your consistency ledger
          </Text>
        </View>
        <View style={[styles.monthRateWrap, { backgroundColor: colors.primary + "14", borderColor: colors.primary + "30" }]}>
          <Text style={[styles.monthRateNum, { color: colors.primary, fontFamily: font.bold }]}>
            {Math.round(monthCompletionRate * 100)}%
          </Text>
          <Text style={[styles.monthRateLbl, { color: colors.mutedForeground, fontFamily: font.regular }]}>
            this month
          </Text>
        </View>
      </View>

      {/* ── SATURATION CALENDAR ── */}
      <View
        style={[styles.calCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}
      >
        {/* Inner glass light */}
        <LinearGradient
          colors={["rgba(255,255,255,0.04)", "rgba(255,255,255,0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.5 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Month navigation */}
        <View style={styles.calHeader}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <Feather name="chevron-left" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.monthTitleBlock}>
            <Text style={[styles.monthTitle, { color: colors.foreground, fontFamily: font.bold }]}>
              {MONTHS[viewMonth]}
            </Text>
            <Text style={[styles.yearLabel, { color: colors.mutedForeground, fontFamily: font.regular }]}>
              {viewYear}
            </Text>
          </View>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <Feather name="chevron-right" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Day-of-week header */}
        <View style={styles.dowRow}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <Text key={d} style={[styles.dowLabel, { color: colors.mutedForeground, fontFamily: font.medium }]}>
              {d.slice(0, 1)}
            </Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calGrid}>
          {Array.from({ length: firstDow }).map((_, i) => (
            <View key={`e-${i}`} style={styles.calCell} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const stats = completionMap.get(dateStr);
            const rate = stats ? stats.done / Math.max(stats.total, 1) : 0;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const isFuture = dateStr > todayStr;
            const glow = !isFuture && stats ? glowColorForRate(rate, colors) : null;

            let cellBg = "transparent";
            let cellBorder = "transparent";
            let cellBorderWidth = 0;

            if (isSelected) {
              cellBg = colors.primary;
              cellBorder = colors.primary;
              cellBorderWidth = 2;
            } else if (isToday) {
              cellBorder = colors.primary;
              cellBorderWidth = 2;
              cellBg = glow ? glow.bg : "transparent";
            } else if (glow) {
              cellBg = glow.bg;
              if (glow.glow) {
                cellBorder = glow.border;
                cellBorderWidth = 1.5;
              }
            }

            return (
              <TouchableOpacity
                key={dateStr}
                onPress={() => {
                  if (isFuture) return;
                  const next = isSelected ? null : dateStr;
                  setSelectedDate(next);
                  if (next) { setRetroDate(next); setRetroOpen(true); }
                }}
                style={[
                  styles.calCell,
                  {
                    backgroundColor: cellBg,
                    borderWidth: cellBorderWidth,
                    borderColor: cellBorder,
                    borderRadius: 10,
                  },
                ]}
                activeOpacity={isFuture ? 1 : 0.7}
              >
                <Text
                  style={[
                    styles.calDay,
                    {
                      color: isSelected
                        ? "#fff"
                        : isToday
                        ? colors.primary
                        : isFuture
                        ? colors.mutedForeground
                        : colors.foreground,
                      fontFamily: isToday ? font.bold : font.medium,
                      opacity: isFuture ? 0.25 : 1,
                    },
                  ]}
                >
                  {day}
                </Text>
                {/* Completion intensity indicator */}
                {!isFuture && stats && !isSelected && (
                  <View
                    style={[
                      styles.calDot,
                      {
                        backgroundColor:
                          rate >= 0.8
                            ? colors.success
                            : rate >= 0.5
                            ? colors.warning
                            : colors.destructive,
                        opacity: 0.7,
                      },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          {[
            { color: colors.primary, label: "Perfect" },
            { color: colors.success, label: "Great ≥80%" },
            { color: colors.warning, label: "OK 50–80%" },
            { color: colors.destructive, label: "Low <50%" },
          ].map((l) => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: l.color }]} />
              <Text style={[styles.legendText, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                {l.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── SELECTED DATE INDICATOR ── */}
      {selectedDate && !retroOpen && (
        <TouchableOpacity
          onPress={() => { setRetroDate(selectedDate); setRetroOpen(true); }}
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.primary + "44", flexDirection: "row", alignItems: "center", gap: 10 },
          ]}
          activeOpacity={0.8}
        >
          <View style={[styles.histIcon, { backgroundColor: colors.primary + "20" }]}>
            <Feather name="edit-3" size={14} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.histName, { color: colors.foreground, fontFamily: font.semibold }]}>
              {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </Text>
            <Text style={[styles.histBadgeText, { color: colors.primary, fontFamily: font.medium, marginTop: 1 }]}>
              Tap to edit this day →
            </Text>
          </View>
          <TouchableOpacity onPress={() => setSelectedDate(null)}>
            <Feather name="x" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* ── ANNUAL HEATMAP — OVERALL ── */}
      <View
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + "22" }]}>
            <Feather name="grid" size={16} color={colors.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: font.semibold }]}>
            Overall Heatmap
          </Text>
          <Text style={[styles.noData, { color: colors.mutedForeground, fontSize: 10, fontFamily: font.regular }]}>
            all habits
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <HeatmapChart completions={allCompletions} color={colors.primary} weeks={24} />
        </ScrollView>
      </View>

      {/* ── PER-HABIT HEATMAPS ── */}
      {activeHabits.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.success + "22" }]}>
              <Feather name="activity" size={16} color={colors.success} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: font.semibold }]}>
              Per-Habit Heatmaps
            </Text>
          </View>
          {activeHabits.map((h) => {
            const habitCompletions = h.completions.map((c) => ({ date: c.date, completed: c.completed }));
            return (
              <PerHabitHeatmap key={h.id} habit={h} completions={habitCompletions} />
            );
          })}
        </View>
      )}

      {/* ── PER-ROUTINE HEATMAPS ── */}
      {routines.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.accent + "22" }]}>
              <Feather name="layers" size={16} color={colors.accent} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: font.semibold }]}>
              Per-Routine Heatmaps
            </Text>
          </View>
          {routines.map((r) => {
            const routineHabits = activeHabits.filter((h) => r.habitIds.includes(h.id));
            const routineCompletions = buildRoutineCompletions(routineHabits);
            return (
              <PerRoutineHeatmap key={r.id} routine={r} completions={routineCompletions} />
            );
          })}
        </View>
      )}

      {/* ── ALL-TIME RECORDS ── */}
      <View
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.warning + "22" }]}>
            <Feather name="award" size={16} color={colors.warning} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: font.semibold }]}>
            All-Time Records
          </Text>
        </View>
        {activeHabits.length === 0 ? (
          <Text style={[styles.noData, { color: colors.mutedForeground, fontFamily: font.regular }]}>
            No habits yet. Add habits to build your records.
          </Text>
        ) : (
          <View style={styles.recordsGrid}>
            {activeHabits
              .sort((a, b) => b.longestStreak - a.longestStreak)
              .slice(0, 4)
              .map((h) => (
                <View
                  key={h.id}
                  style={[
                    styles.recordCard,
                    { backgroundColor: h.color + "0E", borderColor: h.color + "28" },
                  ]}
                >
                  <View style={[styles.recordIcon, { backgroundColor: h.color + "20" }]}>
                    <Feather name={h.icon as any} size={16} color={h.color} />
                  </View>
                  <Text
                    style={[styles.recordName, { color: colors.foreground, fontFamily: font.semibold }]}
                    numberOfLines={1}
                  >
                    {h.name}
                  </Text>
                  <Text
                    style={[styles.recordVal, { color: h.color, fontFamily: font.bold }]}
                  >
                    {h.longestStreak}
                  </Text>
                  <Text
                    style={[styles.recordLbl, { color: colors.mutedForeground, fontFamily: font.regular }]}
                  >
                    day best streak
                  </Text>
                </View>
              ))}
          </View>
        )}
      </View>
    </ScrollView>
    <RetroEditModal
      visible={retroOpen}
      date={retroDate}
      onClose={() => { setRetroOpen(false); setSelectedDate(null); }}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  pageTitle: { fontSize: 28 },
  pageSub: { fontSize: 13, marginTop: 1 },
  monthRateWrap: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
  },
  monthRateNum: { fontSize: 22, lineHeight: 26 },
  monthRateLbl: { fontSize: 10, marginTop: 1 },

  calCard: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    gap: 12,
    overflow: "hidden",
    position: "relative",
  },
  calHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navBtn: { padding: 6 },
  monthTitleBlock: { alignItems: "center" },
  monthTitle: { fontSize: 18 },
  yearLabel: { fontSize: 12, marginTop: -2 },
  dowRow: { flexDirection: "row" },
  dowLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 10,
    paddingVertical: 3,
  },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calCell: {
    width: `${100 / 7}%` as any,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 1,
    position: "relative",
  },
  calDay: { fontSize: 12 },
  calDot: {
    position: "absolute",
    bottom: 3,
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 3.5 },
  legendText: { fontSize: 9 },

  card: { borderRadius: 18, padding: 16, borderWidth: 1, gap: 12 },
  selectedDateHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { flex: 1, fontSize: 15 },
  noData: { fontSize: 13, textAlign: "center", paddingVertical: 8 },
  histRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1 },
  histIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  histName: { flex: 1, fontSize: 13 },
  histBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  histBadgeText: { fontSize: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  recordsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  recordCard: {
    width: "47%",
    borderRadius: 14,
    padding: 12,
    gap: 3,
    borderWidth: 1,
  },
  recordIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  recordName: { fontSize: 12 },
  recordVal: { fontSize: 22 },
  recordLbl: { fontSize: 9 },
});
