import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useFont } from "@/hooks/useFont";
import { useHabits, type Habit, getTodayStr, PILLAR_COLORS } from "@/context/HabitsContext";
import { HabitCard } from "@/components/HabitCard";
import { FreezeZone } from "@/components/FreezeZone";
import { DaySelector } from "@/components/DaySelector";
import { SparklineChart } from "@/components/SparklineChart";
import { PrecisionTimeline } from "@/components/PrecisionTimeline";
import { RadialMenu } from "@/components/RadialMenu";
import { DraggableHabitList } from "@/components/DraggableHabitList";
import { StreakFreezeAlert } from "@/components/StreakFreezeAlert";
import { StreakCoreCard } from "@/components/StreakCoreCard";
import { MicroHabitModal } from "@/components/MicroHabitModal";
import { SkipReasonModal } from "@/components/SkipReasonModal";
import { DifficultyNudgeCard } from "@/components/DifficultyNudgeCard";
import { StepsModal } from "@/components/StepsModal";
import { ConfettiCelebration } from "@/components/ConfettiCelebration";
import { WeeklyRecapCard } from "@/components/WeeklyRecapCard";
import { NotificationsPanel, type NotificationItem } from "@/components/NotificationsPanel";

const HOUR_GREETINGS: [number, string][] = [
  [5, "Good night"],
  [12, "Good morning"],
  [17, "Good afternoon"],
  [21, "Good evening"],
  [24, "Good night"],
];

function getGreeting() {
  const h = new Date().getHours();
  for (const [max, label] of HOUR_GREETINGS) {
    if (h < max) return label;
  }
  return "Good night";
}

function isSunday() { return new Date().getDay() === 0; }

function getAmbientTint(): [string, string] {
  const h = new Date().getHours();
  if (h >= 5 && h < 10)  return ["rgba(255,185,60,0.11)", "rgba(255,185,60,0.00)"];  // golden morning
  if (h >= 10 && h < 17) return ["rgba(200,230,255,0.05)", "rgba(200,230,255,0.00)"]; // neutral day
  if (h >= 17 && h < 21) return ["rgba(255,110,60,0.09)",  "rgba(255,110,60,0.00)"];  // warm evening
  return                         ["rgba(70,70,220,0.11)",   "rgba(70,70,220,0.00)"];   // deep night
}

export default function HomeScreen() {
  const colors = useColors();
  const font = useFont();
  const insets = useSafeAreaInsets();
  const {
    habits,
    userStats,
    stepsByDate,
    completeHabit,
    uncompleteHabit,
    skipHabit,
    archiveHabit,
    updateHabit,
    getTodayCompletion,
    getCompletionForDate,
    isHabitDueToday,
    isHabitDueOnDate,
    getTodayProgress,
    getProgressForDate,
    pomodoroSessions,
    freezeStreak,
    routines,
    completeMicroHabit,
    calendarEvents,
    addCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    toggleEventComplete,
    lastBadgeEarned,
    lastLevelUp,
    lastStreakMilestone,
    clearLastBadgeEarned,
    clearLastLevelUp,
    clearLastStreakMilestone,
  } = useHabits();

  const todayStr = getTodayStr();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");
  const [showWeekly, setShowWeekly] = useState(true);
  const [freezeVisible, setFreezeVisible] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [radialHabit, setRadialHabit] = useState<import("@/context/HabitsContext").Habit | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [streakCoreOpen, setStreakCoreOpen] = useState(false);
  const [microModalHabit, setMicroModalHabit] = useState<Habit | null>(null);
  const [skipReasonHabit, setSkipReasonHabit] = useState<Habit | null>(null);
  const [dismissedNudges, setDismissedNudges] = useState<string[]>([]);
  const [stepsModalOpen, setStepsModalOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const streakAlertQueuedRef = useRef(false);
  const prevCompletedRef = useRef(0);

  const todaySteps = stepsByDate[todayStr] ?? 0;
  const stepsGoal = userStats.stepsGoal ?? 10000;
  const username = userStats.username ?? "FOCUS User";

  const isToday = selectedDate === todayStr;
  const isPast = selectedDate < todayStr;

  const { completed, total } = isToday
    ? getTodayProgress()
    : getProgressForDate(selectedDate);
  const progress = total > 0 ? completed / total : 0;

  const atRiskHabits = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 14 || !isToday) return [];
    return habits.filter((h) => {
      if (h.archived || !isHabitDueToday(h)) return false;
      const comp = getTodayCompletion(h);
      if (comp) return false;
      return h.streak >= 1;
    });
  }, [habits, isToday, getTodayCompletion, isHabitDueToday]);

  const completionRates = useMemo(() => {
    const rates: Record<string, number> = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      const { completed: c, total: t } = getProgressForDate(ds);
      if (t > 0) rates[ds] = c / t;
    }
    return rates;
  }, [habits]);

  const last7Rates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const ds = d.toISOString().split("T")[0];
      const { completed: c, total: t } = getProgressForDate(ds);
      return t > 0 ? c / t : 0;
    });
  }, [habits]);

  const topStreakHabit = useMemo(
    () => [...habits].filter(h => !h.archived).sort((a, b) => b.streak - a.streak)[0],
    [habits]
  );

  const streakSparkline = useMemo(() => {
    if (!topStreakHabit) return Array(7).fill(0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const ds = d.toISOString().split("T")[0];
      return topStreakHabit.completions.find(c => c.date === ds && c.completed) ? 1 : 0;
    });
  }, [topStreakHabit]);

  const todayFocusMin = useMemo(() => {
    return pomodoroSessions
      .filter(s => s.date === todayStr && s.type === "work")
      .reduce((acc, s) => acc + Math.floor(s.duration / 60), 0);
  }, [pomodoroSessions, todayStr]);

  const isHabitDone = useCallback((habit: Habit, comp?: { completed: boolean; value?: number; duration?: number }) => {
    if (!comp) return false;
    if (habit.type === "quantitative") {
      if (habit.targetValue != null) return (comp.value ?? 0) >= habit.targetValue;
      return false;
    }
    return comp.completed;
  }, []);

  const overdueCount = useMemo(() => {
    if (!isToday) return 0;
    return habits.filter(h => {
      if (h.archived) return false;
      if (!isHabitDueToday(h)) return false;
      const comp = getTodayCompletion(h);
      return !comp?.completed;
    }).length;
  }, [habits, isToday]);

  const dueHabits = useMemo(() => {
    const base = isToday
      ? habits.filter(h => !h.archived && isHabitDueToday(h))
      : habits.filter(h => !h.archived && isHabitDueOnDate(h, selectedDate));
    const unique = Array.from(new Map(base.map((h) => [h.id, h])).values());
    return unique.sort((a, b) => {
      if (!reorderMode) {
        if (a.important && !b.important) return -1;
        if (!a.important && b.important) return 1;
      }
      return a.order - b.order;
    });
  }, [habits, isToday, selectedDate, reorderMode]);

  const filteredHabits = useMemo(() => {
    return dueHabits.filter(h => {
      const comp = getCompletionForDate(h, selectedDate);
      const done = isHabitDone(h, comp);
      if (filter === "pending") return !done;
      if (filter === "done") return done;
      return true;
    });
  }, [dueHabits, filter, selectedDate, getCompletionForDate, isHabitDone]);

  const pendingHabits = useMemo(() =>
    dueHabits.filter(h => {
      const comp = getCompletionForDate(h, selectedDate);
      return comp === undefined || !isHabitDone(h, comp);
    }),
  [dueHabits, selectedDate, getCompletionForDate, isHabitDone]);

  const skippedHabits = useMemo(() =>
    dueHabits.filter(h => {
      const comp = getCompletionForDate(h, selectedDate);
      return comp !== undefined && !comp.completed && comp.skipReason !== undefined;
    }),
  [dueHabits, selectedDate, getCompletionForDate, isHabitDone]);

  const completedHabits = useMemo(() =>
    dueHabits.filter(h => {
      const comp = getCompletionForDate(h, selectedDate);
      return comp !== undefined && comp.completed === true && isHabitDone(h, comp);
    }),
  [dueHabits, selectedDate, getCompletionForDate, isHabitDone]);

  const uniquePendingHabits = useMemo(
    () => Array.from(new Map(pendingHabits.map((h) => [h.id, h])).values()),
    [pendingHabits]
  );
  const uniqueCompletedHabits = useMemo(
    () => Array.from(new Map(completedHabits.map((h) => [h.id, h])).values()),
    [completedHabits]
  );
  const uniqueSkippedHabits = useMemo(
    () => Array.from(new Map(skippedHabits.map((h) => [h.id, h])).values()),
    [skippedHabits]
  );

  const weeklyStats = useMemo(() => {
    let totalDue = 0, totalDone = 0;
    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const { completed: c, total: t } = getProgressForDate(d.toISOString().split("T")[0]);
      totalDue += t; totalDone += c;
    }
    return { rate: totalDue > 0 ? totalDone / totalDue : 0, done: totalDone, due: totalDue };
  }, [habits]);

  const xpProgress = (userStats.totalXP % 500) / 500;
  const archivedCount = habits.filter(h => h.archived).length;

  const weeklyBestHabit = useMemo(() => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    });
    let best: { name: string; color: string; icon: string; count: number } | null = null;
    for (const h of habits) {
      if (h.archived) continue;
      const count = h.completions.filter(c => c.completed && dates.includes(c.date)).length;
      if (count > 0 && (!best || count > best.count)) {
        best = { name: h.name, color: h.color, icon: h.icon, count };
      }
    }
    return best;
  }, [habits]);

  const weeklyXP = useMemo(() => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    });
    return habits.reduce((total, h) => {
      const xpBase = h.difficulty === "easy" ? 10 : h.difficulty === "medium" ? 20 : 30;
      const count = h.completions.filter(c => c.completed && dates.includes(c.date)).length;
      return total + count * xpBase;
    }, 0);
  }, [habits]);

  const comebackHabits = useMemo(() => {
    if (!isToday) return [];
    return habits.filter(h => !h.archived && h.comebackUntil && h.comebackUntil >= todayStr && h.streak > 0);
  }, [habits, isToday, todayStr]);

  const difficultyNudges = useMemo(() => {
    if (!isToday) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return habits
      .filter(h => !h.archived && !dismissedNudges.includes(h.id))
      .map(h => {
        let due = 0, done = 0;
        for (let i = 0; i < 30; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const ds = d.toISOString().split("T")[0];
          const dow = d.getDay();
          let isDue = false;
          if (h.frequency === "daily") isDue = true;
          else if (h.frequency === "weekdays") isDue = dow >= 1 && dow <= 5;
          else if (h.frequency === "weekends") isDue = dow === 0 || dow === 6;
          else if (h.frequency === "custom") isDue = (h.customDays ?? []).includes(dow);
          if (isDue) {
            due++;
            if (h.completions.find(c => c.date === ds && c.completed)) done++;
          }
        }
        if (due < 14) return null;
        const rate = done / due;
        if (rate >= 0.95 && h.difficulty === "medium") return { habit: h, type: "upgrade" as const, rate };
        if (rate < 0.40 && h.difficulty === "hard") return { habit: h, type: "downgrade" as const, rate };
        return null;
      })
      .filter(Boolean) as { habit: Habit; type: "upgrade" | "downgrade"; rate: number }[];
  }, [habits, isToday, dismissedNudges]);

  useEffect(() => {
    if (isToday && total > 0 && completed === total && prevCompletedRef.current < total) {
      setShowConfetti(true);
    }
    prevCompletedRef.current = completed;
  }, [completed, total, isToday]);

  useEffect(() => {
    if (!lastBadgeEarned) return;
    setNotifications((prev) => [
      { id: `badge-${lastBadgeEarned.earnedAt}`, kind: "badge", badge: lastBadgeEarned, timestamp: lastBadgeEarned.earnedAt },
      ...prev,
    ]);
    setUnreadCount((n) => n + 1);
    clearLastBadgeEarned();
  }, [lastBadgeEarned]);

  useEffect(() => {
    if (lastLevelUp === null) return;
    const ts = Date.now();
    setNotifications((prev) => [
      { id: `level-${ts}`, kind: "levelup", level: lastLevelUp, timestamp: ts },
      ...prev,
    ]);
    setUnreadCount((n) => n + 1);
    clearLastLevelUp();
  }, [lastLevelUp]);

  useEffect(() => {
    if (!lastStreakMilestone) return;
    const ts = Date.now();
    setNotifications((prev) => [
      { id: `streak-${ts}`, kind: "streak", milestone: lastStreakMilestone, timestamp: ts },
      ...prev,
    ]);
    setUnreadCount((n) => n + 1);
    clearLastStreakMilestone();
  }, [lastStreakMilestone]);

  useEffect(() => {
    if (atRiskHabits.length === 0 || !isToday || streakAlertQueuedRef.current) return;
    const ts = Date.now();
    setNotifications((prev) => [
      {
        id: `streak-at-risk-${ts}`,
        kind: "streakAtRisk",
        habits: atRiskHabits.map((h) => ({
          id: h.id,
          name: h.name,
          streak: h.streak,
          icon: h.icon,
          color: h.color,
        })),
        freezeTokens: userStats.freezeTokens,
        timestamp: ts,
      },
      ...prev,
    ]);
    setUnreadCount((n) => n + 1);
    setAlertDismissed(false);
    streakAlertQueuedRef.current = true;
  }, [atRiskHabits.length, isToday, userStats.freezeTokens]);

  const handleOpenNotif = useCallback(() => {
    setNotifPanelOpen(true);
    setUnreadCount(0);
  }, []);

  const handleClearAllNotif = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const handleComplete = useCallback((habit: Habit) => {
    if (!isToday) return;
    if (habit.type === "quantitative") return;
    if (getTodayCompletion(habit)?.completed) {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      uncompleteHabit(habit.id);
    } else {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const duration =
        habit.type === "timed" && habit.targetDuration != null
          ? habit.targetDuration
          : undefined;
      completeHabit(habit.id, undefined, duration);
    }
  }, [completeHabit, uncompleteHabit, getTodayCompletion, isToday]);

  const handleIncrement = useCallback((habit: Habit) => {
    if (!isToday) return;
    const comp = getTodayCompletion(habit);
    const newValue = (comp?.value ?? 0) + 1;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const nextCompleted =
      habit.type === "quantitative" && habit.targetValue != null
        ? newValue >= habit.targetValue
        : false;
    if (nextCompleted) {
      completeHabit(habit.id, newValue, comp?.duration);
      return;
    }
    updateHabit(habit.id, {
      completions: habit.completions.some((c) => c.date === selectedDate)
        ? habit.completions.map((c) =>
            c.date === selectedDate
              ? {
                  ...c,
                  value: newValue,
                  duration: comp?.duration,
                  completed: false,
                  timestamp: Date.now(),
                }
              : c
          )
        : [
            ...habit.completions,
            {
              date: selectedDate,
              value: newValue,
              duration: comp?.duration,
              completed: false,
              timestamp: Date.now(),
            },
          ],
    });
  }, [completeHabit, getTodayCompletion, isToday, selectedDate, updateHabit]);

  const handleSkip = useCallback((habit: Habit) => {
    if (!isToday) return;
    if (habit.streak > 7) {
      setMicroModalHabit(habit);
    } else {
      setSkipReasonHabit(habit);
    }
  }, [isToday]);

  const handleArchive = useCallback((habit: Habit) => {
    archiveHabit(habit.id);
  }, [archiveHabit]);

  const handleReorder = useCallback((orderedIds: string[]) => {
    orderedIds.forEach((id, idx) => {
      updateHabit(id, { order: idx * 10 });
    });
  }, [updateHabit]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => { setRefreshing(false); setFreezeVisible(true); }, 320);
  }, []);

  const topPadding = Platform.OS === "web" ? Math.max(insets.top, 67) + 16 : insets.top + 16;

  const selectedDateLabel = useMemo(() => {
    if (isToday) return "Today";
    return new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric",
    });
  }, [selectedDate, isToday]);

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            title="Release for Freeze Zone"
            titleColor={colors.mutedForeground}
          />
        }
      >
        {/* ── HEADER ── */}
        <View style={[styles.header, { paddingTop: topPadding }]}>
          <LinearGradient
            colors={getAmbientTint()}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => router.push("/settings")}
              style={[styles.avatar, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "55" }]}
            >
              <Text style={[styles.avatarLevel, { color: colors.primary }]}>{userStats.level}</Text>
            </TouchableOpacity>
            <View style={styles.greetingBlock}>
              <Text style={[styles.greetingSmall, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                {getGreeting().toLowerCase()},
              </Text>
              <Text style={[styles.greetingBig, { color: colors.foreground, fontFamily: font.bold }]} numberOfLines={1}>
                {username}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setFreezeVisible(true)}
              style={[styles.hBtn, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}
            >
              <Feather name="archive" size={16} color={colors.info} />
              {archivedCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.info }]}>
                  <Text style={styles.badgeText}>{archivedCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleOpenNotif}
              style={[styles.hBtn, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}
            >
              <Feather name="bell" size={16} color={colors.warning} />
              {unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.warning }]}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTimelineOpen(true)}
              style={[styles.hBtn, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}
            >
              <Feather name="clock" size={16} color={colors.accent} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── CINEMATIC STAT CHIPS ── */}
        <View style={[styles.statChipsRow, { paddingHorizontal: 16 }]}>
          {/* Streak chip */}
          <TouchableOpacity
            onPress={() => setStreakCoreOpen(true)}
            activeOpacity={0.8}
            style={[styles.statChip, { backgroundColor: "#FBBF2412", borderColor: "#FBBF2430" }]}
          >
            <View style={[styles.statChipIcon, { backgroundColor: "#FBBF2420" }]}>
              <Text style={{ fontSize: 14 }}>🔥</Text>
            </View>
            <Text style={[styles.statChipValue, { color: colors.foreground, fontFamily: font.bold }]}>
              {topStreakHabit?.streak ?? 0}
            </Text>
            <Text style={[styles.statChipLabel, { color: colors.mutedForeground, fontFamily: font.regular }]}>streak</Text>
            <View style={[styles.statChipBar, { backgroundColor: colors.border }]}>
              <View style={[styles.statChipFill, { backgroundColor: "#FBBF24", width: `${Math.min(100, ((topStreakHabit?.streak ?? 0) / 30) * 100)}%` as any }]} />
            </View>
          </TouchableOpacity>

          {/* Steps chip */}
          <TouchableOpacity
            onPress={() => setStepsModalOpen(true)}
            activeOpacity={0.8}
            style={[styles.statChip, { backgroundColor: colors.success + "12", borderColor: colors.success + "30" }]}
          >
            <View style={[styles.statChipIcon, { backgroundColor: colors.success + "20" }]}>
              <Feather name="navigation" size={13} color={colors.success} />
            </View>
            <Text style={[styles.statChipValue, { color: colors.foreground, fontFamily: font.bold }]}>
              {todaySteps >= 1000 ? `${(todaySteps / 1000).toFixed(1)}k` : todaySteps}
            </Text>
            <Text style={[styles.statChipLabel, { color: colors.mutedForeground, fontFamily: font.regular }]}>steps</Text>
            <View style={[styles.statChipBar, { backgroundColor: colors.border }]}>
              <View style={[styles.statChipFill, { backgroundColor: colors.success, width: `${Math.min(100, (todaySteps / stepsGoal) * 100)}%` as any }]} />
            </View>
          </TouchableOpacity>

          {/* Focus chip */}
          <TouchableOpacity
            onPress={() => router.push("/pomodoro")}
            activeOpacity={0.8}
            style={[styles.statChip, { backgroundColor: colors.accent + "12", borderColor: colors.accent + "30" }]}
          >
            <View style={[styles.statChipIcon, { backgroundColor: colors.accent + "20" }]}>
              <Feather name="target" size={13} color={colors.accent} />
            </View>
            <Text style={[styles.statChipValue, { color: colors.foreground, fontFamily: font.bold }]}>
              {todayFocusMin}
            </Text>
            <Text style={[styles.statChipLabel, { color: colors.mutedForeground, fontFamily: font.regular }]}>min focus</Text>
            <View style={[styles.statChipBar, { backgroundColor: colors.border }]}>
              <View style={[styles.statChipFill, { backgroundColor: colors.accent, width: `${Math.min(100, (todayFocusMin / 120) * 100)}%` as any }]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── DAY SELECTOR ── */}
        <DaySelector
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          completionRates={completionRates}
          numDays={14}
        />

        {/* ── ROUTINES STRIP ── */}
        {isToday && routines.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16 }} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
            {routines.map((r) => {
              const timeIcon =
                r.timeOfDay === "morning" ? "sunrise" :
                r.timeOfDay === "afternoon" ? "sun" :
                r.timeOfDay === "evening" ? "sunset" : "moon";
              return (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => router.push(`/routine/${r.id}` as any)}
                  style={[
                    styles.routineChip,
                    { backgroundColor: colors.glass, borderColor: colors.glassBorder },
                  ]}
                >
                  <Feather name={timeIcon as any} size={13} color={colors.primary} />
                  <Text style={[styles.routineChipText, { color: colors.foreground, fontFamily: font.semibold }]} numberOfLines={1}>
                    {r.name}
                  </Text>
                  <Text style={[styles.routineChipCount, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                    {r.habitIds.length}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ── STREAK FREEZE ALERT ── (hidden after first show, visible in notifications panel) */}
        {atRiskHabits.length > 0 && !alertDismissed && !streakAlertQueuedRef.current && userStats.freezeTokens > 0 && (
          <StreakFreezeAlert
            habits={atRiskHabits}
            freezeTokens={userStats.freezeTokens}
            onFreeze={(id) => freezeStreak(id)}
            onFreezeAll={() =>
              atRiskHabits
                .slice(0, userStats.freezeTokens)
                .forEach((h) => freezeStreak(h.id))
            }
            onDismiss={() => setAlertDismissed(true)}
          />
        )}

        {/* ── BENTO STATS ── */}
        <View style={[styles.bento, { paddingHorizontal: 16 }]}>
          {/* Hero card */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.bentoHero, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "28" }]}
          >
            <View style={styles.bentoHeroLeft}>
              <Text style={[styles.bentoTag, { color: colors.primary + "BB" }]}>
                {selectedDateLabel.toUpperCase()}
              </Text>
              <View style={styles.bentoNumRow}>
                <Text style={[styles.bentoHeroNum, { color: colors.foreground, fontFamily: font.bold }]}>{completed}</Text>
                <Text style={[styles.bentoHeroUnit, { color: colors.mutedForeground }]}>
                  {" "}/ {total} habits
                </Text>
              </View>
              <Text style={[styles.bentoHeroPct, { color: colors.primary }]}>
                {Math.round(progress * 100)}% complete
              </Text>
              <View style={[styles.xpRow]}>
                <View style={[styles.xpBarTrack, { backgroundColor: colors.border, flex: 1 }]}>
                  <View style={[styles.xpBarFill, { backgroundColor: colors.primary, width: `${xpProgress * 100}%` }]} />
                </View>
                <Text style={[styles.xpLabel, { color: colors.mutedForeground }]}>Lv {userStats.level}</Text>
              </View>
            </View>
            <View style={styles.bentoHeroRight}>
              <SparklineChart
                data={last7Rates}
                width={108}
                height={54}
                color={colors.primary}
                strokeWidth={2.5}
              />
              <Text style={[styles.bentoHeroXP, { color: colors.warning }]}>
                {userStats.totalXP} XP
              </Text>
            </View>
          </TouchableOpacity>

          {/* Row 2 */}
          <View style={styles.bentoRow}>
            {/* Streak card — wider */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setStreakCoreOpen(true)}
              style={[
                styles.bentoBig,
                {
                  backgroundColor: colors.warning + "10",
                  borderColor: colors.warning + "28",
                },
              ]}
            >
              <Text style={[styles.bentoTag, { color: colors.warning + "BB", fontFamily: font.bold }]}>BEST STREAK</Text>
              <View style={styles.bentoNumRow}>
                <Text style={[styles.bentoBigNum, { color: colors.foreground, fontFamily: font.bold }]}>
                  {topStreakHabit?.streak ?? 0}
                </Text>
                <Text style={[styles.bentoUnit, { color: colors.mutedForeground, fontFamily: font.regular }]}> days</Text>
              </View>
              {topStreakHabit && (
                <Text style={[styles.bentoSub, { color: colors.mutedForeground, fontFamily: font.medium }]} numberOfLines={1}>
                  {topStreakHabit.name}
                </Text>
              )}
              <View style={styles.bentoSpark}>
                <SparklineChart
                  data={streakSparkline}
                  width={100}
                  height={32}
                  color={colors.warning}
                  strokeWidth={2}
                />
              </View>
            </TouchableOpacity>

            {/* Focus card — narrower */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.bentoSmall,
                {
                  backgroundColor: colors.accent + "10",
                  borderColor: colors.accent + "28",
                },
              ]}
            >
              <Text style={[styles.bentoTag, { color: colors.accent + "BB", fontFamily: font.bold }]}>FOCUS</Text>
              <Text style={[styles.bentoBigNum, { color: colors.foreground, fontFamily: font.bold }]}>
                {todayFocusMin}
              </Text>
              <Text style={[styles.bentoUnit, { color: colors.mutedForeground, fontFamily: font.regular }]}>min</Text>
              <View style={[styles.focusIcon, { backgroundColor: colors.accent + "22" }]}>
                <Feather name="target" size={14} color={colors.accent} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Row 3 */}
          <View style={styles.bentoRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.bentoHalf,
                {
                  backgroundColor: colors.success + "10",
                  borderColor: colors.success + "28",
                },
              ]}
            >
              <Text style={[styles.bentoTag, { color: colors.success + "BB", fontFamily: font.bold }]}>ALL-TIME</Text>
              <Text style={[styles.bentoMidNum, { color: colors.foreground, fontFamily: font.bold }]}>
                {userStats.totalCompleted}
              </Text>
              <Text style={[styles.bentoUnit, { color: colors.mutedForeground, fontFamily: font.regular }]}>completed</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.bentoHalf,
                {
                  backgroundColor: overdueCount > 0 ? colors.destructive + "10" : colors.card,
                  borderColor: overdueCount > 0 ? colors.destructive + "28" : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.bentoTag,
                  { color: overdueCount > 0 ? colors.destructive + "BB" : colors.mutedForeground, fontFamily: font.bold },
                ]}
              >
                OVERDUE
              </Text>
              <Text
                style={[
                  styles.bentoMidNum,
                  { color: overdueCount > 0 ? colors.destructive : colors.mutedForeground, fontFamily: font.bold },
                ]}
              >
                {overdueCount}
              </Text>
              <Text style={[styles.bentoUnit, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                {overdueCount === 1 ? "habit" : "habits"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── WEEKLY RECAP (Sundays only) ── */}
        {isSunday() && showWeekly && (
          <View style={{ marginHorizontal: 16 }}>
            <WeeklyRecapCard
              weeklyRate={weeklyStats.rate}
              weeklyDone={weeklyStats.done}
              weeklyDue={weeklyStats.due}
              weeklyXP={weeklyXP}
              last7Rates={last7Rates}
              bestHabit={weeklyBestHabit}
              topStreakName={topStreakHabit?.name}
              topStreakDays={topStreakHabit?.streak ?? 0}
              onDismiss={() => setShowWeekly(false)}
            />
          </View>
        )}

        {/* ── COMEBACK PROTOCOL BANNER ── */}
        {comebackHabits.length > 0 && (
          <View style={[styles.comebackBanner, { marginHorizontal: 16, backgroundColor: "#F9731610", borderColor: "#F9731640" }]}>
            <Feather name="zap" size={16} color="#F97316" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.comebackTitle, { color: "#F97316", fontFamily: font.bold }]}>
                Comeback Protocol Active
              </Text>
              <Text style={[styles.comebackSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                {comebackHabits.map(h => h.name).join(", ")} · earn 2× XP
              </Text>
            </View>
          </View>
        )}

        {/* ── DIFFICULTY NUDGE CARDS ── */}
        {difficultyNudges.length > 0 && (
          <View style={{ paddingHorizontal: 16, gap: 8 }}>
            {difficultyNudges.slice(0, 2).map(({ habit, type, rate }) => (
              <DifficultyNudgeCard
                key={habit.id}
                habit={habit}
                type={type}
                rate={rate}
                onDismiss={() => setDismissedNudges(prev => [...prev, habit.id])}
                onAccept={() => {
                  updateHabit(habit.id, { difficulty: type === "upgrade" ? "hard" : "medium" });
                  setDismissedNudges(prev => [...prev, habit.id]);
                }}
              />
            ))}
          </View>
        )}

        {/* ── HABITS SECTION ── */}
        <View style={[styles.sectionHeader, { paddingHorizontal: 16 }]}>
          <View style={styles.sectionLeft}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: font.bold }]}>
              {selectedDateLabel}'s Habits
            </Text>
            {reorderMode && (
              <View style={[styles.pastBadge, { backgroundColor: colors.primary + "22" }]}>
                <Feather name="move" size={9} color={colors.primary} />
                <Text style={[styles.pastText, { color: colors.primary, fontFamily: font.semibold }]}>Drag to reorder</Text>
              </View>
            )}
            {!reorderMode && isPast && (
              <View style={[styles.pastBadge, { backgroundColor: colors.muted }]}>
                <Text style={[styles.pastText, { color: colors.mutedForeground }]}>Read only</Text>
              </View>
            )}
          </View>
          {reorderMode ? (
            <TouchableOpacity
              onPress={() => setReorderMode(false)}
              style={[styles.doneBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.doneBtnText, { color: colors.background, fontFamily: font.bold }]}>Done</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.filterRow}>
              {(["all", "pending", "done"] as const).map(f => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  style={[
                    styles.filterBtn,
                    { backgroundColor: filter === f ? colors.primary : colors.secondary },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: filter === f ? colors.background : colors.mutedForeground },
                    ]}
                  >
                    {f === "all" ? "All" : f === "pending" ? "Todo" : "Done"}
                  </Text>
                </TouchableOpacity>
              ))}
              {isToday && filter === "all" && (
                <TouchableOpacity
                  onPress={() => setReorderMode(true)}
                  style={[styles.filterBtn, { backgroundColor: colors.secondary, paddingHorizontal: 8 }]}
                >
                  <Feather name="menu" size={13} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={{ paddingHorizontal: reorderMode ? 8 : 16 }}>
          {/* Reorder mode or filtered view: single flat list */}
          {(reorderMode || filter !== "all") ? (
            filteredHabits.length === 0 ? (
              <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                <Feather name="check-circle" size={28} color={colors.success} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  {filter === "done" ? "No completed habits yet" : "All done here!"}
                </Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                  {filter === "done" ? "Complete some habits to see them." : "Outstanding work today."}
                </Text>
              </View>
            ) : (
              <DraggableHabitList
                habits={reorderMode ? dueHabits : filteredHabits}
                reorderMode={reorderMode}
                onReorder={handleReorder}
                renderCard={(habit, isInReorderMode) => {
                  const comp = getCompletionForDate(habit, selectedDate);
                  return (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      isCompleted={comp?.completed ?? false}
                      isSkipped={comp !== undefined && !comp.completed}
                      currentValue={comp?.value}
                      onComplete={() => handleComplete(habit)}
                      onIncrement={habit.type === "quantitative" ? () => handleIncrement(habit) : undefined}
                      onSkip={() => handleSkip(habit)}
                      onArchive={() => handleArchive(habit)}
                      onPress={() => { if (!isInReorderMode) router.push(`/habit/${habit.id}`); }}
                      onLongPress={() => setRadialHabit(habit)}
                      readonly={isInReorderMode || isPast || !isToday}
                      reorderMode={isInReorderMode}
                    />
                  );
                }}
              />
            )
          ) : (
            /* Split view: pending on top, "Done" section at bottom */
            <>
              {pendingHabits.length === 0 && completedHabits.length === 0 && skippedHabits.length === 0 ? (
                <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                  <Feather name="check-circle" size={28} color={colors.success} />
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>All done here!</Text>
                  <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Outstanding work today.</Text>
                </View>
              ) : (
                <>
                  {/* Pending habits list */}
                  {pendingHabits.length > 0 ? (
                    <DraggableHabitList
                      habits={uniquePendingHabits}
                      reorderMode={false}
                      onReorder={handleReorder}
                      renderCard={(habit, isInReorderMode) => {
                        const comp = getCompletionForDate(habit, selectedDate);
                        return (
                          <HabitCard
                            key={habit.id}
                            habit={habit}
                            isCompleted={isHabitDone(habit, comp)}
                            isSkipped={false}
                            currentValue={comp?.value}
                            onComplete={() => handleComplete(habit)}
                            onIncrement={habit.type === "quantitative" ? () => handleIncrement(habit) : undefined}
                            onSkip={() => handleSkip(habit)}
                            onArchive={() => handleArchive(habit)}
                            onPress={() => router.push(`/habit/${habit.id}`)}
                            onLongPress={() => setRadialHabit(habit)}
                            readonly={isPast || !isToday}
                            reorderMode={false}
                          />
                        );
                      }}
                    />
                  ) : (
                    /* All pending habits handled — celebration banner (only if none skipped) */
                    skippedHabits.length === 0 && completedHabits.length > 0 && (
                      <View style={[styles.allDoneBanner, { backgroundColor: colors.success + "14", borderColor: colors.success + "30" }]}>
                        <Feather name="check-circle" size={16} color={colors.success} />
                        <Text style={[styles.allDoneText, { color: colors.success, fontFamily: font.semibold }]}>
                          All habits done — outstanding!
                        </Text>
                      </View>
                    )
                  )}

                  {/* Done + Skipped section */}
                  {(completedHabits.length > 0 || skippedHabits.length > 0) && (
                    <>
                      {/* Done section divider */}
                      <View style={styles.doneDividerRow}>
                        <View style={[styles.doneDividerLine, { backgroundColor: colors.border }]} />
                        <View style={[styles.doneDividerBadge, { backgroundColor: colors.success + "18", borderColor: colors.success + "30" }]}>
                          <Feather name="check" size={10} color={colors.success} />
                          <Text style={[styles.doneDividerText, { color: colors.success, fontFamily: font.semibold }]}>
                            Done · {completedHabits.length}
                            {skippedHabits.length > 0 ? `  ·  Skipped · ${skippedHabits.length}` : ""}
                          </Text>
                        </View>
                        <View style={[styles.doneDividerLine, { backgroundColor: colors.border }]} />
                      </View>

                      {/* Completed habit cards */}
                  {uniqueCompletedHabits.map((habit) => {
                        const comp = getCompletionForDate(habit, selectedDate);
                        return (
                          <View key={habit.id} style={styles.doneCardWrap}>
                            <HabitCard
                              habit={habit}
                              isCompleted={isHabitDone(habit, comp)}
                              isSkipped={false}
                              currentValue={comp?.value}
                              onComplete={() => handleComplete(habit)}
                              onIncrement={habit.type === "quantitative" ? () => handleIncrement(habit) : undefined}
                              onSkip={() => handleSkip(habit)}
                              onArchive={() => handleArchive(habit)}
                              onPress={() => router.push(`/habit/${habit.id}`)}
                              onLongPress={() => setRadialHabit(habit)}
                              readonly={isPast || !isToday}
                              reorderMode={false}
                            />
                          </View>
                        );
                      })}

                      {/* Skipped habit cards */}
                  {uniqueSkippedHabits.map((habit) => {
                        const comp = getCompletionForDate(habit, selectedDate);
                        return (
                          <View key={habit.id} style={styles.doneCardWrap}>
                            <HabitCard
                              habit={habit}
                              isCompleted={isHabitDone(habit, comp)}
                              isSkipped={true}
                              currentValue={comp?.value}
                              onComplete={() => handleComplete(habit)}
                              onIncrement={habit.type === "quantitative" ? () => handleIncrement(habit) : undefined}
                              onSkip={() => handleSkip(habit)}
                              onArchive={() => handleArchive(habit)}
                              onPress={() => router.push(`/habit/${habit.id}`)}
                              onLongPress={() => setRadialHabit(habit)}
                              readonly={isPast || !isToday}
                              reorderMode={false}
                            />
                          </View>
                        );
                      })}
                    </>
                  )}
                </>
              )}
            </>
          )}

          {isToday && habits.filter(h => !h.archived).length === 0 && (
            <TouchableOpacity
              onPress={() => router.push("/create")}
              style={[
                styles.createPrompt,
                { borderColor: colors.primary + "44", backgroundColor: colors.primary + "08" },
              ]}
            >
              <Feather name="plus-circle" size={20} color={colors.primary} />
              <Text style={[styles.createPromptText, { color: colors.primary }]}>
                Add your first habit
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Freeze zone hint */}
        <TouchableOpacity
          onPress={() => setFreezeVisible(true)}
          style={[styles.freezeHint, { marginHorizontal: 16 }]}
        >
          <Feather name="archive" size={12} color={colors.mutedForeground} />
          <Text style={[styles.freezeHintText, { color: colors.mutedForeground }]}>
            Pull down or tap to open Freeze Zone
            {archivedCount > 0 ? ` · ${archivedCount} archived` : ""}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <StepsModal visible={stepsModalOpen} onClose={() => setStepsModalOpen(false)} />
      <StreakCoreCard visible={streakCoreOpen} onClose={() => setStreakCoreOpen(false)} habits={habits} />
      <FreezeZone visible={freezeVisible} onClose={() => setFreezeVisible(false)} />
      <PrecisionTimeline
        visible={timelineOpen}
        onClose={() => setTimelineOpen(false)}
        habits={habits.filter((h) => !h.archived && isHabitDueOnDate(h, selectedDate))}
        selectedDate={selectedDate}
        calendarEvents={calendarEvents}
        onAddEvent={addCalendarEvent}
        onUpdateEvent={updateCalendarEvent}
        onDeleteEvent={deleteCalendarEvent}
        onToggleComplete={toggleEventComplete}
      />
      {/* ── MICRO-HABIT MODAL ── */}
      {microModalHabit && (
        <MicroHabitModal
          habit={microModalHabit}
          visible={true}
          onCompleteMicro={(habitId, microValue) => {
            completeMicroHabit(habitId, microValue);
            setMicroModalHabit(null);
          }}
          onSkipAnyway={(habitId) => {
            const h = habits.find(x => x.id === habitId) ?? microModalHabit;
            setMicroModalHabit(null);
            if (h) setSkipReasonHabit(h);
          }}
          onClose={() => setMicroModalHabit(null)}
        />
      )}

      {/* ── SKIP REASON MODAL ── */}
      {skipReasonHabit && (
        <SkipReasonModal
          habit={skipReasonHabit}
          visible={true}
          onSkip={(habitId: string, reason: string) => {
            skipHabit(habitId, selectedDate, reason);
            setSkipReasonHabit(null);
          }}
          onClose={() => setSkipReasonHabit(null)}
        />
      )}

      <RadialMenu
        visible={radialHabit !== null}
        habit={radialHabit}
        onClose={() => setRadialHabit(null)}
        onEdit={() => router.push(`/habit/${radialHabit?.id}`)}
        onSkip={() => { if (radialHabit) handleSkip(radialHabit); }}
        onArchive={() => { if (radialHabit) archiveHabit(radialHabit.id); }}
        onToggleImportant={() => {
          if (radialHabit) {
            const live = habits.find(h => h.id === radialHabit.id);
            updateHabit(radialHabit.id, { important: !(live?.important ?? false) });
          }
        }}
      />

      {showConfetti && (
        <ConfettiCelebration onDone={() => setShowConfetti(false)} />
      )}

      <NotificationsPanel
        visible={notifPanelOpen}
        notifications={notifications}
        onClose={() => setNotifPanelOpen(false)}
        onClearAll={handleClearAllNotif}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 14 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLevel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  greetingBlock: { gap: 1 },
  greetingSmall: { fontSize: 12, fontFamily: "Inter_400Regular" },
  greetingBig: { fontSize: 20, fontFamily: "Inter_700Bold" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  hBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    position: "relative",
  },
  hBtnLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  hBtnAdd: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 8, fontFamily: "Inter_700Bold", color: "#fff" },

  // ── STAT CHIPS ──
  statChipsRow: { flexDirection: "row", gap: 9 },
  statChip: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 2,
  },
  statChipIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  statChipValue: { fontSize: 18, lineHeight: 22 },
  statChipLabel: { fontSize: 9, marginBottom: 3 },
  statChipBar: { height: 3, borderRadius: 2, overflow: "hidden" },
  statChipFill: { height: "100%", borderRadius: 2 },

  // ── BENTO ──
  bento: { gap: 10 },
  bentoHero: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bentoHeroLeft: { flex: 1, gap: 4 },
  bentoHeroRight: { alignItems: "flex-end", gap: 6 },
  bentoTag: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  bentoNumRow: { flexDirection: "row", alignItems: "flex-end" },
  bentoHeroNum: { fontSize: 42, fontFamily: "Inter_700Bold", lineHeight: 46 },
  bentoHeroUnit: { fontSize: 14, fontFamily: "Inter_400Regular", paddingBottom: 6 },
  bentoHeroPct: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  bentoHeroXP: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  xpRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  xpBarTrack: { height: 3, borderRadius: 2, overflow: "hidden" },
  xpBarFill: { height: "100%", borderRadius: 2 },
  xpLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },

  bentoRow: { flexDirection: "row", gap: 10 },
  bentoBig: {
    flex: 3,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 3,
  },
  bentoSmall: {
    flex: 2,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 3,
  },
  bentoHalf: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 3,
  },
  bentoBigNum: { fontSize: 32, fontFamily: "Inter_700Bold", lineHeight: 36 },
  bentoMidNum: { fontSize: 26, fontFamily: "Inter_700Bold", lineHeight: 30 },
  bentoUnit: { fontSize: 11, fontFamily: "Inter_400Regular" },
  bentoSub: { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 1 },
  bentoSpark: { marginTop: 6 },
  focusIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  weeklyCard: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 8 },
  weeklyHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  weeklyTitle: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  weeklyBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  pastBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pastText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  filterRow: { flexDirection: "row", gap: 5 },
  filterBtn: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20 },
  filterText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  doneBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  doneBtnText: { fontSize: 12 },

  empty: { borderRadius: 14, padding: 28, alignItems: "center", gap: 8, borderWidth: 1 },
  emptyTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },

  createPrompt: {
    borderRadius: 14,
    padding: 22,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  createPromptText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  freezeHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 8,
    opacity: 0.45,
  },
  freezeHintText: { fontSize: 11, fontFamily: "Inter_400Regular" },

  doneDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 6,
    gap: 8,
  },
  doneDividerLine: {
    flex: 1,
    height: 1,
    opacity: 0.5,
  },
  doneDividerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  doneDividerText: {
    fontSize: 11,
  },
  doneCardWrap: {
    opacity: 1,
  },
  allDoneBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 4,
  },
  allDoneText: {
    fontSize: 13,
  },

  routineChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  routineChipText: { fontSize: 13 },
  routineChipCount: { fontSize: 11, marginLeft: 2 },

  comebackBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  comebackTitle: { fontSize: 13 },
  comebackSub: { fontSize: 11, marginTop: 1 },
});
