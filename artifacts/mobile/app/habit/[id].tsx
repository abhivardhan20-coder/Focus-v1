import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useFont } from "@/hooks/useFont";
import {
  useHabits,
  PILLAR_LABELS,
  PILLAR_COLORS,
  type HabitCategory,
  type HabitDifficulty,
  type HabitFrequency,
} from "@/context/HabitsContext";
import { ProgressRing } from "@/components/ProgressRing";
import { HeatmapChart } from "@/components/HeatmapChart";
import {
  scheduleHabitReminder,
  cancelHabitReminder,
  requestNotificationPermission,
  getNotificationSupport,
  formatReminderTime,
} from "@/lib/notifications";

const { width: SCREEN_W } = Dimensions.get("window");

const ICONS = [
  "activity", "book-open", "coffee", "droplet", "heart",
  "wind", "music", "pen-tool", "sun", "moon",
  "zap", "target", "trending-up", "user", "watch",
  "anchor", "award", "bell", "briefcase", "camera",
];

const PALETTE = [
  "#13EC5B", "#A855F7", "#3B82F6", "#F97316", "#06B6D4",
  "#FBBF24", "#EC4899", "#34D399", "#F87171", "#818CF8",
];

const CATEGORIES: HabitCategory[] = [
  "physical", "mental", "academics", "creativity", "chores",
];

const STREAK_MILESTONES = [
  { days: 1,   label: "Getting Started", icon: "flag" },
  { days: 3,   label: "Building Habit",  icon: "trending-up" },
  { days: 7,   label: "One Week",        icon: "star" },
  { days: 14,  label: "Two Weeks",       icon: "zap" },
  { days: 30,  label: "One Month",       icon: "award" },
  { days: 60,  label: "Two Months",      icon: "shield" },
  { days: 100, label: "Century",         icon: "hexagon" },
];

function SectionHeader({ icon, label, color }: { icon: string; label: string; color: string }) {
  const colors = useColors();
  const font = useFont();
  return (
    <View style={sh.row}>
      <View style={[sh.iconWrap, { backgroundColor: color + "20" }]}>
        <Feather name={icon as any} size={14} color={color} />
      </View>
      <Text style={[sh.label, { color: colors.foreground, fontFamily: font.semibold }]}>{label}</Text>
    </View>
  );
}
const sh = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 15 },
});

// ── 30-day streak timeline ───────────────────────────────────────────────────
function StreakTimeline({
  completions,
  frequency,
  customDays,
  color,
}: {
  completions: { date: string; completed: boolean }[];
  frequency: HabitFrequency;
  customDays?: number[];
  color: string;
}) {
  const colors = useColors();
  const font = useFont();

  const days = useMemo(() => {
    const result: { date: string; isDue: boolean; isCompleted: boolean; dow: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compMap = new Map(completions.map((c) => [c.date, c.completed]));

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dow = d.getDay();
      let isDue = false;
      if (frequency === "daily") isDue = true;
      else if (frequency === "weekdays") isDue = dow >= 1 && dow <= 5;
      else if (frequency === "weekends") isDue = dow === 0 || dow === 6;
      else if (frequency === "custom") isDue = (customDays ?? []).includes(dow);
      result.push({ date: dateStr, isDue, isCompleted: compMap.get(dateStr) === true, dow });
    }
    return result;
  }, [completions, frequency, customDays]);

  const barW = Math.floor((SCREEN_W - 64) / 30) - 1;
  const barH = 44;

  return (
    <View style={tl.wrap}>
      <View style={tl.bars}>
        {days.map((d, i) => {
          const done = d.isDue && d.isCompleted;
          const missed = d.isDue && !d.isCompleted;
          const barColor = done ? color : missed ? colors.border : "transparent";
          const barOpacity = done ? 1 : missed ? 0.5 : 0.1;
          const showLabel = i === 0 || d.dow === 0; // Sunday labels

          return (
            <View key={d.date} style={[tl.barWrap, { width: barW + 1 }]}>
              <View
                style={[
                  tl.bar,
                  {
                    width: barW,
                    height: barH,
                    backgroundColor: barColor,
                    opacity: barOpacity,
                    borderRadius: 3,
                  },
                ]}
              />
              {showLabel && (
                <Text style={[tl.barLabel, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                  {new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}
                </Text>
              )}
            </View>
          );
        })}
      </View>
      <View style={tl.legend}>
        <View style={tl.legendItem}>
          <View style={[tl.legendDot, { backgroundColor: color }]} />
          <Text style={[tl.legendTxt, { color: colors.mutedForeground, fontFamily: font.regular }]}>Done</Text>
        </View>
        <View style={tl.legendItem}>
          <View style={[tl.legendDot, { backgroundColor: colors.border }]} />
          <Text style={[tl.legendTxt, { color: colors.mutedForeground, fontFamily: font.regular }]}>Missed</Text>
        </View>
        <View style={tl.legendItem}>
          <View style={[tl.legendDot, { backgroundColor: colors.muted }]} />
          <Text style={[tl.legendTxt, { color: colors.mutedForeground, fontFamily: font.regular }]}>Not due</Text>
        </View>
      </View>
    </View>
  );
}
const tl = StyleSheet.create({
  wrap: { gap: 10 },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 1 },
  barWrap: { alignItems: "center", gap: 2 },
  bar: {},
  barLabel: { fontSize: 7, textAlign: "center" },
  legend: { flexDirection: "row", gap: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendTxt: { fontSize: 10 },
});

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const font = useFont();
  const insets = useSafeAreaInsets();
  const { habits, completeHabit, skipHabit, archiveHabit, deleteHabit, updateHabit, getTodayCompletion } = useHabits();

  const habit = habits.find((h) => h.id === id);

  // ── today state
  const [inputVal, setInputVal] = useState("");

  // ── reminder state
  const notifSupport = getNotificationSupport();
  const [reminderEnabled, setReminderEnabled] = useState(!!habit?.reminderTime);
  const [reminderTime, setReminderTime] = useState(habit?.reminderTime ?? "08:00");
  const [customTimeInput, setCustomTimeInput] = useState(false);
  const [customHH, setCustomHH] = useState((habit?.reminderTime ?? "08:00").split(":")[0]);
  const [customMM, setCustomMM] = useState((habit?.reminderTime ?? "08:00").split(":")[1]);
  const [permDenied, setPermDenied] = useState(false);

  const PRESET_TIMES = ["06:00", "07:00", "08:00", "09:00", "12:00", "18:00", "20:00", "22:00"];

  const applyReminder = useCallback(async (time: string) => {
    if (!habit) return;
    const granted = await requestNotificationPermission();
    if (!granted) { setPermDenied(true); return; }
    setPermDenied(false);
    await scheduleHabitReminder(habit.id, habit.name, time, habit.streak);
    updateHabit(habit.id, { reminderTime: time });
    setReminderTime(time);
    setReminderEnabled(true);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [habit, updateHabit]);

  const disableReminder = useCallback(async () => {
    if (!habit) return;
    await cancelHabitReminder(habit.id);
    updateHabit(habit.id, { reminderTime: undefined });
    setReminderEnabled(false);
  }, [habit, updateHabit]);

  const toggleReminder = useCallback(async (val: boolean) => {
    if (val) await applyReminder(reminderTime);
    else await disableReminder();
  }, [applyReminder, disableReminder, reminderTime]);

  // ── edit state
  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState(habit?.name ?? "");
  const [draftDesc, setDraftDesc] = useState(habit?.description ?? "");
  const [draftIcon, setDraftIcon] = useState(habit?.icon ?? "activity");
  const [draftColor, setDraftColor] = useState(habit?.color ?? PALETTE[0]);
  const [draftCategory, setDraftCategory] = useState<HabitCategory>(habit?.category ?? "physical");
  const [draftFreq, setDraftFreq] = useState<HabitFrequency>(habit?.frequency ?? "daily");
  const [draftDiff, setDraftDiff] = useState<HabitDifficulty>(habit?.difficulty ?? "medium");
  const [draftPriority, setDraftPriority] = useState<"low" | "medium" | "high">(habit?.priority ?? "medium");

  const todayComp = habit ? getTodayCompletion(habit) : undefined;
  const isCompleted = todayComp?.completed ?? false;

  const last30 = useMemo(() => {
    if (!habit) return { done: 0, total: 0, rate: 0 };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let done = 0, total = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dow = d.getDay();
      let isDue = false;
      if (habit.frequency === "daily") isDue = true;
      else if (habit.frequency === "weekdays") isDue = dow >= 1 && dow <= 5;
      else if (habit.frequency === "weekends") isDue = dow === 0 || dow === 6;
      else if (habit.frequency === "custom") isDue = (habit.customDays ?? []).includes(dow);
      if (isDue) {
        total++;
        if (habit.completions.find((c) => c.date === dateStr && c.completed)) done++;
      }
    }
    return { done, total, rate: total > 0 ? done / total : 0 };
  }, [habit]);

  const totalCompleted = useMemo(() => {
    if (!habit) return 0;
    return habit.completions.filter((c) => c.completed).length;
  }, [habit]);

  const nextMilestone = useMemo(() => {
    if (!habit) return null;
    return STREAK_MILESTONES.find((m) => m.days > habit.streak) ?? null;
  }, [habit]);

  const earnedMilestones = useMemo(() => {
    if (!habit) return [];
    return STREAK_MILESTONES.filter((m) => m.days <= habit.longestStreak);
  }, [habit]);

  const topPadding = Platform.OS === "web" ? Math.max(insets.top, 67) + 16 : insets.top + 16;

  if (!habit) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: colors.foreground, fontSize: 16, fontFamily: font.regular }}>Habit not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.primary, fontFamily: font.medium }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pillarColor = PILLAR_COLORS[habit.category] ?? colors.primary;
  const progressRate =
    habit.type === "quantitative" && habit.targetValue
      ? (todayComp?.value ?? 0) / habit.targetValue
      : isCompleted ? 1 : 0;

  function handleComplete() {
    if (!habit || isCompleted) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const val = habit.type === "quantitative" && inputVal ? parseInt(inputVal) : undefined;
    completeHabit(
      habit.id,
      habit.type === "quantitative" && habit.targetValue
        ? Math.max(1, val ?? 1)
        : val
    );
    setInputVal("");
  }

  function handleArchive() {
    if (!habit) return;
    Alert.alert(
      "Archive Habit",
      `"${habit.name}" will move to the Freeze Zone. Your streaks and history are preserved.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Archive", style: "destructive", onPress: () => { archiveHabit(habit.id); router.back(); } },
      ]
    );
  }

  function handleDelete() {
    if (!habit) return;
    Alert.alert("Delete Forever", `Permanently delete "${habit.name}" and all its history?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { deleteHabit(habit.id); router.back(); } },
    ]);
  }

  function openEdit() {
    if (!habit) return;
    setDraftName(habit.name);
    setDraftDesc(habit.description ?? "");
    setDraftIcon(habit.icon);
    setDraftColor(habit.color);
    setDraftCategory(habit.category);
    setDraftFreq(habit.frequency);
    setDraftDiff(habit.difficulty);
    setDraftPriority(habit.priority);
    setEditOpen(true);
  }

  function saveEdit() {
    if (!habit || !draftName.trim()) return;
    updateHabit(habit.id, {
      name: draftName.trim(),
      description: draftDesc.trim() || undefined,
      icon: draftIcon,
      color: draftColor,
      category: draftCategory,
      frequency: draftFreq,
      difficulty: draftDiff,
      priority: draftPriority,
    });
    setEditOpen(false);
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPadding, paddingBottom: insets.bottom + 60 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── TOP BAR ── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.topRight}>
          <TouchableOpacity
            onPress={openEdit}
            style={[styles.editChip, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "44" }]}
          >
            <Feather name="edit-2" size={13} color={colors.primary} />
            <Text style={[styles.editChipTxt, { color: colors.primary, fontFamily: font.semibold }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Alert.alert(habit.name, "Manage", [
              { text: "Archive (Freeze Zone)", onPress: handleArchive },
              { text: "Delete Forever", style: "destructive", onPress: handleDelete },
              { text: "Cancel", style: "cancel" },
            ])}
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}
          >
            <Feather name="more-horizontal" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── HERO CARD ── */}
      <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
        <LinearGradient
          colors={[habit.color + "18", "transparent"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
          pointerEvents="none"
        />
        <View style={[styles.heroIcon, { backgroundColor: habit.color + "25" }]}>
          <Feather name={habit.icon as any} size={36} color={habit.color} />
        </View>
        <Text style={[styles.heroName, { color: colors.foreground, fontFamily: font.bold }]}>{habit.name}</Text>
        {habit.description ? (
          <Text style={[styles.heroDesc, { color: colors.mutedForeground, fontFamily: font.regular }]}>
            {habit.description}
          </Text>
        ) : null}
        <View style={styles.heroTags}>
          <View style={[styles.tag, { backgroundColor: pillarColor + "20" }]}>
            <View style={[styles.tagDot, { backgroundColor: pillarColor }]} />
            <Text style={[styles.tagTxt, { color: pillarColor, fontFamily: font.medium }]}>{PILLAR_LABELS[habit.category]}</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.tagTxt, { color: colors.mutedForeground, fontFamily: font.medium }]}>{habit.frequency}</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.tagTxt, { color: colors.mutedForeground, fontFamily: font.medium }]}>{habit.difficulty}</Text>
          </View>
          {habit.important && (
            <View style={[styles.tag, { backgroundColor: colors.warning + "20" }]}>
              <Feather name="star" size={10} color={colors.warning} />
              <Text style={[styles.tagTxt, { color: colors.warning, fontFamily: font.medium }]}>Priority</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── STATS BENTO ── */}
      <View style={styles.statsGrid}>
        {[
          { icon: "zap", color: colors.warning, val: habit.streak, lbl: "Current\nStreak", unit: "days" },
          { icon: "award", color: colors.accent, val: habit.longestStreak, lbl: "Personal\nBest", unit: "days" },
          { icon: "check-circle", color: colors.success, val: totalCompleted, lbl: "Total\nDone", unit: "" },
          { icon: "star", color: "#FBBF24", val: habit.xpPoints, lbl: "XP\nEarned", unit: "" },
        ].map((s, i) => (
          <View key={i} style={[styles.statCard, { backgroundColor: colors.card, borderColor: s.color + "30" }]}>
            <Feather name={s.icon as any} size={16} color={s.color} />
            <Text style={[styles.statVal, { color: colors.foreground, fontFamily: font.bold }]}>{s.val}</Text>
            <Text style={[styles.statLbl, { color: colors.mutedForeground, fontFamily: font.regular }]}>{s.lbl}</Text>
          </View>
        ))}
      </View>

      {/* 30d ring */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
        <View style={styles.ringRow}>
          <ProgressRing size={72} strokeWidth={7} progress={last30.rate} color={habit.color} backgroundColor={colors.muted}>
            <Text style={[styles.ringPct, { color: colors.foreground, fontFamily: font.bold }]}>
              {Math.round(last30.rate * 100)}%
            </Text>
          </ProgressRing>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.ringTitle, { color: colors.foreground, fontFamily: font.semibold }]}>30-Day Completion</Text>
            <Text style={[styles.ringSubtitle, { color: colors.mutedForeground, fontFamily: font.regular }]}>
              {last30.done} of {last30.total} sessions completed
            </Text>
            <View style={[styles.progressBarWrap, { backgroundColor: colors.muted }]}>
              <View style={[styles.progressBarFill, { backgroundColor: habit.color, width: `${Math.round(last30.rate * 100)}%` as any }]} />
            </View>
          </View>
        </View>
      </View>

      {/* ── NEXT MILESTONE ── */}
      {nextMilestone && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.primary + "30" }]}>
          <SectionHeader icon="target" label="Next Milestone" color={colors.primary} />
          <View style={[styles.milestoneBody, { backgroundColor: colors.primary + "10", borderRadius: 14, padding: 14 }]}>
            <Feather name={nextMilestone.icon as any} size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.milestoneName, { color: colors.primary, fontFamily: font.semibold }]}>
                {nextMilestone.label} · {nextMilestone.days} days
              </Text>
              <View style={[styles.mileBar, { backgroundColor: colors.border, marginVertical: 8 }]}>
                <View
                  style={[
                    styles.mileFill,
                    { backgroundColor: colors.primary, width: `${Math.min(100, (habit.streak / nextMilestone.days) * 100)}%` as any },
                  ]}
                />
              </View>
              <Text style={[styles.mileSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                {nextMilestone.days - habit.streak} more days to go
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ── TODAY ── */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
        <SectionHeader icon="sun" label="Today" color={colors.warning} />
        {isCompleted ? (
          <View style={[styles.doneRow, { backgroundColor: colors.success + "12", borderRadius: 16, padding: 14 }]}>
            <View style={[styles.doneIcon, { backgroundColor: colors.success + "22" }]}>
              <Feather name="check-circle" size={26} color={colors.success} />
            </View>
            <View>
              <Text style={[styles.doneTitle, { color: colors.success, fontFamily: font.bold }]}>Completed!</Text>
              {todayComp?.value !== undefined && (
                <Text style={[styles.doneSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                  {todayComp.value} {habit.targetUnit}
                </Text>
              )}
            </View>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {habit.type === "quantitative" && habit.targetValue && (
              <View style={styles.inputRow}>
                <TextInput
                  value={inputVal}
                  onChangeText={setInputVal}
                  placeholder={`Enter ${habit.targetUnit || "value"}…`}
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                  style={[styles.valInput, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border, fontFamily: font.regular }]}
                />
                <Text style={[styles.targetHint, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                  / {habit.targetValue} {habit.targetUnit}
                </Text>
              </View>
            )}
            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={handleComplete}
                style={[styles.completeBtn, { backgroundColor: habit.color }]}
                activeOpacity={0.82}
              >
                <Feather name="check" size={18} color="#fff" />
                <Text style={[styles.completeBtnTxt, { fontFamily: font.bold }]}>Mark Complete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => skipHabit(habit.id)}
                style={[styles.skipBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                activeOpacity={0.82}
              >
                <Feather name="skip-forward" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ── STREAK TIMELINE ── */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
        <SectionHeader icon="bar-chart-2" label="30-Day Timeline" color={habit.color} />
        <StreakTimeline
          completions={habit.completions}
          frequency={habit.frequency}
          customDays={habit.customDays}
          color={habit.color}
        />
      </View>

      {/* ── CONSISTENCY HEATMAP ── */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
        <SectionHeader icon="grid" label="Consistency Heatmap" color={colors.primary} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <HeatmapChart completions={habit.completions} color={habit.color} weeks={16} />
        </ScrollView>
      </View>

      {/* ── EARNED MILESTONES ── */}
      {earnedMilestones.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
          <SectionHeader icon="award" label="Milestones Earned" color={colors.warning} />
          <View style={styles.badgeGrid}>
            {earnedMilestones.map((m) => (
              <View key={m.days} style={[styles.badgeItem, { backgroundColor: colors.warning + "15", borderColor: colors.warning + "30" }]}>
                <Feather name={m.icon as any} size={14} color={colors.warning} />
                <Text style={[styles.badgeName, { color: colors.foreground, fontFamily: font.medium }]}>{m.label}</Text>
                <Text style={[styles.badgeDays, { color: colors.mutedForeground, fontFamily: font.regular }]}>{m.days}d</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── STREAK INSIGHT ── */}
      {habit.streak > 0 && (
        <View style={[styles.insightCard, { backgroundColor: colors.warning + "10", borderColor: colors.warning + "28" }]}>
          <Feather name="zap" size={20} color={colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.insightTitle, { color: colors.warning, fontFamily: font.bold }]}>
              {habit.streak} day streak!
            </Text>
            <Text style={[styles.insightBody, { color: colors.foreground, fontFamily: font.regular }]}>
              {habit.streak >= habit.longestStreak
                ? "You're at your personal best. Keep going."
                : `${habit.longestStreak - habit.streak} more to beat your record of ${habit.longestStreak} days.`}
            </Text>
          </View>
        </View>
      )}

      {/* ── DAILY REMINDER ── */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
        {/* Header row with toggle */}
        <View style={styles.reminderHeader}>
          <View style={styles.reminderHeaderLeft}>
            <View style={[styles.reminderIconWrap, { backgroundColor: colors.accent + "20" }]}>
              <Feather name="bell" size={15} color={colors.accent} />
            </View>
            <View>
              <Text style={[styles.reminderTitle, { color: colors.foreground, fontFamily: font.semibold }]}>Daily Reminder</Text>
              <Text style={[styles.reminderSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                {reminderEnabled ? `Fires at ${formatReminderTime(reminderTime)}` : "Off"}
              </Text>
            </View>
          </View>
          <Switch
            value={reminderEnabled}
            onValueChange={toggleReminder}
            trackColor={{ false: colors.muted, true: colors.accent + "80" }}
            thumbColor={reminderEnabled ? colors.accent : colors.mutedForeground}
            ios_backgroundColor={colors.muted}
          />
        </View>

        {/* Perm denied warning */}
        {permDenied && (
          <View style={[styles.reminderWarn, { backgroundColor: colors.warning + "15", borderColor: colors.warning + "30" }]}>
            <Feather name="alert-triangle" size={13} color={colors.warning} />
            <Text style={[styles.reminderWarnTxt, { color: colors.warning, fontFamily: font.regular }]}>
              Notification permission denied. Enable it in your browser or device settings.
            </Text>
          </View>
        )}

        {/* Web info note */}
        {reminderEnabled && notifSupport === "web" && !permDenied && (
          <View style={[styles.reminderWarn, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "22" }]}>
            <Feather name="info" size={13} color={colors.primary} />
            <Text style={[styles.reminderWarnTxt, { color: colors.primary, fontFamily: font.regular }]}>
              Browser notifications active. For OS-level reminders, use the installed mobile app.
            </Text>
          </View>
        )}

        {/* Time picker — shown when enabled */}
        {reminderEnabled && (
          <View style={{ gap: 10 }}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: font.medium }]}>Reminder time</Text>

            {/* Preset chips */}
            {!customTimeInput && (
              <View style={styles.chipRow}>
                {PRESET_TIMES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => applyReminder(t)}
                    style={[
                      styles.reminderTimeChip,
                      {
                        backgroundColor: reminderTime === t ? colors.accent : colors.secondary,
                        borderColor: reminderTime === t ? colors.accent : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.reminderTimeChipTxt, { color: reminderTime === t ? "#fff" : colors.mutedForeground, fontFamily: font.medium }]}>
                      {formatReminderTime(t)}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => setCustomTimeInput(true)}
                  style={[styles.reminderTimeChip, { backgroundColor: colors.secondary, borderColor: colors.border, borderStyle: "dashed" }]}
                >
                  <Feather name="edit" size={10} color={colors.mutedForeground} />
                  <Text style={[styles.reminderTimeChipTxt, { color: colors.mutedForeground, fontFamily: font.medium }]}>Custom</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Custom time input */}
            {customTimeInput && (
              <View style={styles.customTimeRow}>
                <TextInput
                  value={customHH}
                  onChangeText={(v) => setCustomHH(v.replace(/\D/g, "").slice(0, 2))}
                  placeholder="HH"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  maxLength={2}
                  style={[styles.customTimeInput, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border, fontFamily: font.bold }]}
                />
                <Text style={[styles.customTimeColon, { color: colors.foreground, fontFamily: font.bold }]}>:</Text>
                <TextInput
                  value={customMM}
                  onChangeText={(v) => setCustomMM(v.replace(/\D/g, "").slice(0, 2))}
                  placeholder="MM"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  maxLength={2}
                  style={[styles.customTimeInput, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border, fontFamily: font.bold }]}
                />
                <TouchableOpacity
                  onPress={() => {
                    const hh = Math.min(23, parseInt(customHH) || 0).toString().padStart(2, "0");
                    const mm = Math.min(59, parseInt(customMM) || 0).toString().padStart(2, "0");
                    const t = `${hh}:${mm}`;
                    setCustomHH(hh);
                    setCustomMM(mm);
                    applyReminder(t);
                    setCustomTimeInput(false);
                  }}
                  style={[styles.customTimeSet, { backgroundColor: colors.accent }]}
                >
                  <Feather name="check" size={15} color="#fff" />
                  <Text style={[styles.customTimeSetTxt, { fontFamily: font.semibold }]}>Set</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setCustomTimeInput(false)}>
                  <Feather name="x" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* ── INLINE EDIT FORM ── */}
      {editOpen && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.primary + "44" }]}>
          <View style={styles.editHeader}>
            <SectionHeader icon="edit-2" label="Edit Habit" color={colors.primary} />
            <TouchableOpacity onPress={() => setEditOpen(false)}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Name */}
          <View style={{ gap: 6 }}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: font.medium }]}>Name</Text>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Habit name…"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.fieldInput, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border, fontFamily: font.regular }]}
            />
          </View>

          {/* Description */}
          <View style={{ gap: 6 }}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: font.medium }]}>Description</Text>
            <TextInput
              value={draftDesc}
              onChangeText={setDraftDesc}
              placeholder="Optional description…"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={2}
              style={[styles.fieldInput, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border, minHeight: 54, textAlignVertical: "top", fontFamily: font.regular }]}
            />
          </View>

          {/* Icon picker */}
          <View style={{ gap: 6 }}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: font.medium }]}>Icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {ICONS.map((ic) => (
                <TouchableOpacity
                  key={ic}
                  onPress={() => setDraftIcon(ic)}
                  style={[
                    styles.iconSwatch,
                    {
                      backgroundColor: draftIcon === ic ? draftColor : colors.secondary,
                      borderColor: draftIcon === ic ? draftColor : colors.border,
                    },
                  ]}
                >
                  <Feather name={ic as any} size={16} color={draftIcon === ic ? "#fff" : colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Color picker */}
          <View style={{ gap: 6 }}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: font.medium }]}>Color</Text>
            <View style={styles.colorRow}>
              {PALETTE.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setDraftColor(c)}
                  style={[styles.colorSwatch, { backgroundColor: c, borderWidth: draftColor === c ? 2.5 : 0, borderColor: "#fff" }]}
                >
                  {draftColor === c && <Feather name="check" size={11} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Category */}
          <View style={{ gap: 6 }}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: font.medium }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setDraftCategory(cat)}
                  style={[
                    styles.chipBtn,
                    {
                      backgroundColor: draftCategory === cat ? PILLAR_COLORS[cat] : colors.secondary,
                      borderColor: draftCategory === cat ? PILLAR_COLORS[cat] : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.chipTxt, { color: draftCategory === cat ? "#fff" : colors.mutedForeground, fontFamily: font.medium }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Frequency */}
          <View style={{ gap: 6 }}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: font.medium }]}>Frequency</Text>
            <View style={styles.chipRow}>
              {(["daily", "weekdays", "weekends"] as HabitFrequency[]).map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setDraftFreq(f)}
                  style={[
                    styles.chipBtn,
                    { backgroundColor: draftFreq === f ? colors.primary : colors.secondary, borderColor: draftFreq === f ? colors.primary : colors.border },
                  ]}
                >
                  <Text style={[styles.chipTxt, { color: draftFreq === f ? "#000" : colors.mutedForeground, fontFamily: font.medium }]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Difficulty */}
          <View style={{ gap: 6 }}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: font.medium }]}>Difficulty</Text>
            <View style={styles.chipRow}>
              {(["easy", "medium", "hard"] as HabitDifficulty[]).map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDraftDiff(d)}
                  style={[
                    styles.chipBtn,
                    { backgroundColor: draftDiff === d ? colors.primary : colors.secondary, borderColor: draftDiff === d ? colors.primary : colors.border },
                  ]}
                >
                  <Text style={[styles.chipTxt, { color: draftDiff === d ? "#000" : colors.mutedForeground, fontFamily: font.medium }]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Save / Cancel */}
          <View style={styles.editActions}>
            <TouchableOpacity
              onPress={() => setEditOpen(false)}
              style={[styles.cancelBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            >
              <Text style={[styles.cancelTxt, { color: colors.mutedForeground, fontFamily: font.medium }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={saveEdit}
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.82}
            >
              <Feather name="check" size={16} color="#000" />
              <Text style={[styles.saveTxt, { fontFamily: font.bold }]}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── DANGER ZONE ── */}
      <View style={[styles.dangerCard, { backgroundColor: colors.destructive + "08", borderColor: colors.destructive + "28" }]}>
        <Text style={[styles.dangerTitle, { color: colors.destructive, fontFamily: font.semibold }]}>Danger Zone</Text>
        <TouchableOpacity onPress={handleArchive} style={[styles.dangerBtn, { borderColor: colors.destructive + "44" }]}>
          <Feather name="archive" size={14} color={colors.destructive} />
          <Text style={[styles.dangerBtnTxt, { color: colors.destructive, fontFamily: font.medium }]}>Archive to Freeze Zone</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete} style={[styles.dangerBtnFill, { backgroundColor: colors.destructive }]}>
          <Feather name="trash-2" size={14} color="#fff" />
          <Text style={[styles.dangerBtnFillTxt, { fontFamily: font.semibold }]}>Delete Forever</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },

  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  topRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  editChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  editChipTxt: { fontSize: 13 },

  heroCard: { borderRadius: 24, padding: 22, alignItems: "center", gap: 8, borderWidth: 1, overflow: "hidden", position: "relative" },
  heroIcon: { width: 68, height: 68, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  heroName: { fontSize: 22, textAlign: "center" },
  heroDesc: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  heroTags: { flexDirection: "row", flexWrap: "wrap", gap: 7, justifyContent: "center", marginTop: 2 },
  tag: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagDot: { width: 5, height: 5, borderRadius: 2.5 },
  tagTxt: { fontSize: 11, textTransform: "capitalize" },

  statsGrid: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, borderRadius: 14, padding: 11, alignItems: "center", gap: 3, borderWidth: 1 },
  statVal: { fontSize: 19, lineHeight: 22 },
  statLbl: { fontSize: 9, textAlign: "center" },

  card: { borderRadius: 20, padding: 16, borderWidth: 1, gap: 14 },

  ringRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  ringPct: { fontSize: 14 },
  ringTitle: { fontSize: 14 },
  ringSubtitle: { fontSize: 12, lineHeight: 17 },
  progressBarWrap: { height: 4, borderRadius: 2, overflow: "hidden", marginTop: 2 },
  progressBarFill: { height: 4, borderRadius: 2 },

  milestoneBody: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  milestoneName: { fontSize: 13 },
  mileBar: { height: 4, borderRadius: 2, overflow: "hidden" },
  mileFill: { height: "100%", borderRadius: 2 },
  mileSub: { fontSize: 11 },

  doneRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  doneIcon: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  doneTitle: { fontSize: 16 },
  doneSub: { fontSize: 13, marginTop: 2 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  valInput: { flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  targetHint: { fontSize: 13 },
  actionRow: { flexDirection: "row", gap: 10 },
  completeBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  completeBtnTxt: { fontSize: 15, color: "#fff" },
  skipBtn: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badgeItem: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  badgeName: { fontSize: 11 },
  badgeDays: { fontSize: 10 },

  insightCard: { borderRadius: 16, padding: 16, borderWidth: 1, flexDirection: "row", gap: 12, alignItems: "flex-start" },
  insightTitle: { fontSize: 14, marginBottom: 3 },
  insightBody: { fontSize: 13, lineHeight: 19 },

  // Reminder card
  reminderHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reminderHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  reminderIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  reminderTitle: { fontSize: 14 },
  reminderSub: { fontSize: 11, marginTop: 1 },
  reminderWarn: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  reminderWarnTxt: { fontSize: 12, lineHeight: 17, flex: 1 },
  reminderTimeChip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 4 },
  reminderTimeChipTxt: { fontSize: 11 },
  customTimeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  customTimeInput: { width: 52, borderRadius: 10, borderWidth: 1, paddingVertical: 8, textAlign: "center", fontSize: 18 },
  customTimeColon: { fontSize: 20 },
  customTimeSet: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  customTimeSetTxt: { fontSize: 13, color: "#fff" },

  // Edit form
  editHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  fieldLabel: { fontSize: 12 },
  fieldInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  iconSwatch: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  colorSwatch: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chipBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipTxt: { fontSize: 12, textTransform: "capitalize" },
  editActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: "center", borderWidth: 1 },
  cancelTxt: { fontSize: 14 },
  saveBtn: { flex: 2, borderRadius: 14, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  saveTxt: { fontSize: 14, color: "#000" },

  // Danger
  dangerCard: { borderRadius: 18, padding: 16, borderWidth: 1, gap: 10 },
  dangerTitle: { fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  dangerBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  dangerBtnTxt: { fontSize: 13 },
  dangerBtnFill: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, justifyContent: "center" },
  dangerBtnFillTxt: { fontSize: 13, color: "#fff" },
});
