import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
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
  PILLAR_COLORS,
  PILLAR_LABELS,
  useHabits,
  type HabitCategory,
} from "@/context/HabitsContext";
import {
  formatReminderTime,
  getNotificationSupport,
  requestNotificationPermission,
  scheduleHabitReminder,
} from "@/lib/notifications";

type TimeOfDay = "morning" | "afternoon" | "evening" | "night";
type NotifRecurrence = "once" | "twice" | "custom";

const TIME_OPTIONS: {
  id: TimeOfDay;
  label: string;
  subtitle: string;
  icon: string;
  color: string;
}[] = [
  { id: "morning",   label: "Morning",   subtitle: "6 – 12 AM", icon: "sunrise", color: "#F97316" },
  { id: "afternoon", label: "Afternoon", subtitle: "12 – 5 PM", icon: "sun",     color: "#FBBF24" },
  { id: "evening",   label: "Evening",   subtitle: "5 – 9 PM",  icon: "sunset",  color: "#A855F7" },
  { id: "night",     label: "Night",     subtitle: "9 PM+",     icon: "moon",    color: "#3B82F6" },
];

const CATEGORY_FILTERS: ("all" | HabitCategory)[] = [
  "all", "physical", "mental", "academics", "creativity", "chores",
];

const ROUTINE_ICONS = [
  "zap", "sunrise", "sun", "moon", "star", "target", "activity",
  "coffee", "book-open", "heart", "award", "wind", "music",
];

const QUICK_TIMES = [
  { label: "6 AM",  value: "06:00" },
  { label: "7 AM",  value: "07:00" },
  { label: "8 AM",  value: "08:00" },
  { label: "9 AM",  value: "09:00" },
  { label: "12 PM", value: "12:00" },
  { label: "3 PM",  value: "15:00" },
  { label: "6 PM",  value: "18:00" },
  { label: "9 PM",  value: "21:00" },
];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function DateSegInput({
  value,
  onChange,
  colors,
}: {
  value: string;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const parts = value.split("-");
  const y = parts[0] ?? "";
  const m = parts[1] ?? "";
  const d = parts[2] ?? "";
  const update = (ny: string, nm: string, nd: string) =>
    onChange(`${ny}-${nm}-${nd}`);
  return (
    <View style={styles.dateSegRow}>
      <TextInput
        value={y}
        onChangeText={(v) => update(v.replace(/\D/g, "").slice(0, 4), m, d)}
        placeholder="YYYY"
        placeholderTextColor={colors.mutedForeground}
        keyboardType="number-pad"
        maxLength={4}
        style={[styles.dateSeg, { width: 54, backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
      />
      <Text style={[styles.dateSep, { color: colors.mutedForeground }]}>/</Text>
      <TextInput
        value={m}
        onChangeText={(v) => update(y, v.replace(/\D/g, "").slice(0, 2), d)}
        placeholder="MM"
        placeholderTextColor={colors.mutedForeground}
        keyboardType="number-pad"
        maxLength={2}
        style={[styles.dateSeg, { width: 36, backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
      />
      <Text style={[styles.dateSep, { color: colors.mutedForeground }]}>/</Text>
      <TextInput
        value={d}
        onChangeText={(v) => update(y, m, v.replace(/\D/g, "").slice(0, 2))}
        placeholder="DD"
        placeholderTextColor={colors.mutedForeground}
        keyboardType="number-pad"
        maxLength={2}
        style={[styles.dateSeg, { width: 36, backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
      />
    </View>
  );
}

export default function CreateRoutineScreen() {
  const colors  = useColors();
  const font    = useFont();
  const insets  = useSafeAreaInsets();
  const { habits, routines, addRoutine, updateRoutine } = useHabits();
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();
  const isEditMode = !!routineId;
  const notifSupport = getNotificationSupport();

  const [name,        setName       ] = useState("");
  const [timeOfDay,   setTimeOfDay  ] = useState<TimeOfDay>("morning");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [catFilter,   setCatFilter  ] = useState<"all" | HabitCategory>("all");
  const [routineIcon, setRoutineIcon] = useState("zap");
  const [showIcons,   setShowIcons  ] = useState(false);

  const [startDate, setStartDate] = useState(todayStr());
  const [endDate,   setEndDate  ] = useState<string | undefined>(undefined);
  const [endDateStr, setEndDateStr] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  });

  const [notifEnabled,    setNotifEnabled   ] = useState(false);
  const [reminderHH,      setReminderHH     ] = useState("07");
  const [reminderMM,      setReminderMM     ] = useState("00");
  const reminderTime = `${reminderHH.padStart(2, "0")}:${reminderMM.padStart(2, "0")}`;

  const [notifRecurrence,  setNotifRecurrence ] = useState<NotifRecurrence>("once");
  const [customIntervalH,  setCustomIntervalH ] = useState("4");
  const [customIntervalM,  setCustomIntervalM ] = useState("0");

  const topPadding = Platform.OS === "web" ? Math.max(insets.top, 67) + 16 : insets.top + 16;

  useEffect(() => {
    if (!isEditMode || !routineId) return;
    const existing = routines.find((r) => r.id === routineId);
    if (!existing) return;
    setName(existing.name);
    setTimeOfDay(existing.timeOfDay as TimeOfDay);
    setSelectedIds(existing.habitIds);
    if (existing.startDate) setStartDate(existing.startDate);
    if (existing.endDate) { setEndDate(existing.endDate); setEndDateStr(existing.endDate); }
    if (existing.reminderTime) {
      setNotifEnabled(true);
      const [hh, mm] = existing.reminderTime.split(":");
      setReminderHH(hh ?? "07");
      setReminderMM(mm ?? "00");
    }
    if (existing.notificationRecurrence) setNotifRecurrence(existing.notificationRecurrence as NotifRecurrence);
    if (existing.customNotifIntervalHours) setCustomIntervalH(String(existing.customNotifIntervalHours));
    if (existing.customNotifIntervalMinutes) setCustomIntervalM(String(existing.customNotifIntervalMinutes));
  }, [isEditMode, routineId]);

  const activeHabits = useMemo(() => habits.filter(h => !h.archived), [habits]);

  const filteredHabits = useMemo(() =>
    catFilter === "all"
      ? activeHabits
      : activeHabits.filter(h => h.category === catFilter),
    [activeHabits, catFilter]
  );

  const selectedHabits = useMemo(() =>
    selectedIds.map(id => activeHabits.find(h => h.id === id)).filter(Boolean) as typeof activeHabits,
    [selectedIds, activeHabits]
  );

  const estimatedMinutes = useMemo(() =>
    selectedHabits.reduce((sum, h) => {
      if (h.type === "timed" && h.targetDuration) return sum + Math.ceil(h.targetDuration / 60);
      return sum + 5;
    }, 0),
    [selectedHabits]
  );

  const swipePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 12 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
      onPanResponderRelease: (_, gs) => {
        if (Math.abs(gs.dx) > 50) {
          if (Platform.OS !== "web")
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.replace("/create" as any);
        }
      },
    })
  ).current;

  function toggleHabit(id: string) {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setSelectedIds(prev => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function moveDown(idx: number) {
    if (idx === selectedIds.length - 1) return;
    setSelectedIds(prev => {
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert("Name required", "Please give your routine a name.");
      return;
    }
    if (selectedIds.length === 0) {
      Alert.alert("No habits selected", "Add at least one habit to your routine.");
      return;
    }

    const routinePayload = {
      name: name.trim(),
      habitIds: selectedIds,
      timeOfDay,
      startDate,
      endDate,
      reminderTime: notifEnabled ? reminderTime : undefined,
      notificationRecurrence: notifEnabled ? notifRecurrence : undefined,
      customNotifIntervalHours:
        notifEnabled && notifRecurrence === "custom"
          ? parseInt(customIntervalH) || 4
          : undefined,
      customNotifIntervalMinutes:
        notifEnabled && notifRecurrence === "custom"
          ? parseInt(customIntervalM) || 0
          : undefined,
    };

    if (isEditMode && routineId) {
      updateRoutine(routineId, routinePayload);
    } else {
      addRoutine(routinePayload);
    }

    if (notifEnabled && notifSupport !== "none") {
      const granted = await requestNotificationPermission();
      if (granted) {
        await scheduleHabitReminder(
          `routine_${name.trim()}`,
          name.trim(),
          reminderTime,
          0
        );
        if (notifRecurrence === "twice") {
          const [hh, mm] = reminderTime.split(":").map(Number);
          const remMin = hh * 60 + mm;
          const midMin = Math.round((remMin + 23 * 60 + 59) / 2);
          const midHH = String(Math.floor(midMin / 60)).padStart(2, "0");
          const midMM = String(midMin % 60).padStart(2, "0");
          await scheduleHabitReminder(
            `routine_${name.trim()}_2`,
            name.trim(),
            `${midHH}:${midMM}`,
            0
          );
        }
      }
    }

    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  const chosenTime = TIME_OPTIONS.find(t => t.id === timeOfDay)!;

  const RECURRENCE_ITEMS: {
    id: NotifRecurrence;
    label: string;
    desc: () => string;
  }[] = [
    {
      id: "once",
      label: "Once",
      desc: () => `Notification at ${formatReminderTime(reminderTime)}`,
    },
    {
      id: "twice",
      label: "Twice",
      desc: () => {
        const [hh, mm] = reminderTime.split(":").map(Number);
        const remMin = hh * 60 + mm;
        const midMin = Math.round((remMin + 23 * 60 + 59) / 2);
        const midHH = String(Math.floor(midMin / 60)).padStart(2, "0");
        const midMM = String(midMin % 60).padStart(2, "0");
        return `${formatReminderTime(reminderTime)} + ${formatReminderTime(`${midHH}:${midMM}`)}`;
      },
    },
    {
      id: "custom",
      label: "Custom",
      desc: () => `Repeat every ${customIntervalH}h ${customIntervalM}min`,
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPadding, paddingBottom: insets.bottom + 48 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.titleArea} {...swipePan.panHandlers}>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: font.bold }]}>
            {isEditMode ? "Edit Routine" : "New Routine"}
          </Text>
          {!isEditMode && (
            <Text style={[styles.swipeHint, { color: colors.mutedForeground, fontFamily: font.regular }]}>
              ← swipe to switch to Habit →
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={handleCreate}
          style={[styles.saveBtn, { backgroundColor: chosenTime.color }]}
        >
          <Text style={[styles.saveBtnText, { fontFamily: font.semibold }]}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* ── Routine Identity ── */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.identityRow}>
          <TouchableOpacity
            onPress={() => setShowIcons(p => !p)}
            style={[styles.iconCircle, { backgroundColor: chosenTime.color + "22", borderColor: chosenTime.color }]}
          >
            <Feather name={routineIcon as any} size={22} color={chosenTime.color} />
          </TouchableOpacity>
          <TextInput
            style={[styles.nameInput, { color: colors.foreground, borderBottomColor: colors.border, fontFamily: font.semibold }]}
            placeholder="Routine name…"
            placeholderTextColor={colors.mutedForeground}
            value={name}
            onChangeText={setName}
            maxLength={40}
            returnKeyType="done"
          />
        </View>

        {showIcons && (
          <View style={styles.iconGrid}>
            {ROUTINE_ICONS.map(ic => (
              <TouchableOpacity
                key={ic}
                onPress={() => { setRoutineIcon(ic); setShowIcons(false); }}
                style={[
                  styles.iconOption,
                  {
                    backgroundColor: routineIcon === ic ? chosenTime.color + "22" : colors.secondary,
                    borderColor: routineIcon === ic ? chosenTime.color : colors.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <Feather name={ic as any} size={18} color={routineIcon === ic ? chosenTime.color : colors.mutedForeground} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* ── Time of Day ── */}
      <View style={styles.sectionHeader}>
        <Feather name="clock" size={13} color={colors.mutedForeground} />
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: font.semibold }]}>TIME OF DAY</Text>
      </View>
      <View style={styles.timeGrid}>
        {TIME_OPTIONS.map(t => {
          const active = timeOfDay === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => { setTimeOfDay(t.id); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[
                styles.timeCard,
                {
                  backgroundColor: active ? t.color + "1A" : colors.card,
                  borderColor: active ? t.color : colors.border,
                  borderWidth: active ? 1.5 : 1,
                },
              ]}
            >
              <View style={[styles.timeIconWrap, { backgroundColor: active ? t.color + "28" : colors.secondary }]}>
                <Feather name={t.icon as any} size={18} color={active ? t.color : colors.mutedForeground} />
              </View>
              <Text style={[styles.timeLabel, { color: active ? t.color : colors.foreground, fontFamily: font.semibold }]}>
                {t.label}
              </Text>
              <Text style={[styles.timeSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>{t.subtitle}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Habits Section ── */}
      <View style={styles.sectionHeader}>
        <Feather name="list" size={13} color={colors.mutedForeground} />
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: font.semibold }]}>
          HABITS ({selectedIds.length} selected)
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catScroll}
        contentContainerStyle={styles.catScrollContent}
      >
        {CATEGORY_FILTERS.map(cat => {
          const active = catFilter === cat;
          const catColor = cat === "all" ? colors.primary : PILLAR_COLORS[cat];
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setCatFilter(cat)}
              style={[
                styles.catChip,
                {
                  backgroundColor: active ? catColor + "22" : colors.secondary,
                  borderColor: active ? catColor : colors.border,
                  borderWidth: 1,
                },
              ]}
            >
              <Text style={[styles.catChipText, { color: active ? catColor : colors.mutedForeground, fontFamily: font.medium }]}>
                {cat === "all" ? "All" : PILLAR_LABELS[cat]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {activeHabits.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="inbox" size={28} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: font.regular }]}>
            No habits yet. Create some habits first.
          </Text>
        </View>
      ) : filteredHabits.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: font.regular }]}>
            No habits in this category
          </Text>
        </View>
      ) : (
        <View style={[styles.habitList, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {filteredHabits.map((habit, i) => {
            const selected = selectedIds.includes(habit.id);
            const habitColor = PILLAR_COLORS[habit.category];
            return (
              <TouchableOpacity
                key={habit.id}
                onPress={() => toggleHabit(habit.id)}
                style={[
                  styles.habitRow,
                  {
                    borderBottomColor: colors.border,
                    borderBottomWidth: i < filteredHabits.length - 1 ? 1 : 0,
                    backgroundColor: selected ? habitColor + "08" : "transparent",
                  },
                ]}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.checkbox,
                  { backgroundColor: selected ? habitColor : "transparent", borderColor: selected ? habitColor : colors.border },
                ]}>
                  {selected && <Feather name="check" size={12} color="#fff" />}
                </View>
                <View style={[styles.habitIcon, { backgroundColor: habitColor + "18" }]}>
                  <Feather name={habit.icon as any} size={15} color={habitColor} />
                </View>
                <View style={styles.habitInfo}>
                  <Text style={[styles.habitName, { color: colors.foreground, fontFamily: font.medium }]} numberOfLines={1}>
                    {habit.name}
                  </Text>
                  <View style={styles.habitMeta}>
                    <View style={[styles.catDot, { backgroundColor: habitColor }]} />
                    <Text style={[styles.habitCat, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                      {PILLAR_LABELS[habit.category]}
                    </Text>
                  </View>
                </View>
                {habit.streak > 0 && (
                  <View style={[styles.streakBadge, { backgroundColor: colors.warning + "22" }]}>
                    <Text style={[styles.streakText, { color: colors.warning, fontFamily: font.semibold }]}>🔥 {habit.streak}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── Flow Order ── */}
      {selectedIds.length > 1 && (
        <>
          <View style={styles.sectionHeader}>
            <Feather name="layers" size={13} color={colors.mutedForeground} />
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: font.semibold }]}>
              FLOW ORDER · drag to arrange
            </Text>
          </View>
          <View style={[styles.orderList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {selectedHabits.map((habit, idx) => {
              const habitColor = PILLAR_COLORS[habit.category];
              return (
                <View
                  key={habit.id}
                  style={[
                    styles.orderRow,
                    { borderBottomColor: colors.border, borderBottomWidth: idx < selectedHabits.length - 1 ? 1 : 0 },
                  ]}
                >
                  <View style={[styles.stepNum, { backgroundColor: chosenTime.color + "22", borderColor: chosenTime.color }]}>
                    <Text style={[styles.stepNumText, { color: chosenTime.color, fontFamily: font.bold }]}>{idx + 1}</Text>
                  </View>
                  <View style={[styles.habitIcon, { backgroundColor: habitColor + "18" }]}>
                    <Feather name={habit.icon as any} size={14} color={habitColor} />
                  </View>
                  <Text style={[styles.orderName, { color: colors.foreground, fontFamily: font.medium }]} numberOfLines={1}>
                    {habit.name}
                  </Text>
                  <View style={styles.reorderBtns}>
                    <TouchableOpacity
                      onPress={() => moveUp(idx)}
                      disabled={idx === 0}
                      style={[styles.reorderBtn, { opacity: idx === 0 ? 0.25 : 1 }]}
                    >
                      <Feather name="chevron-up" size={18} color={colors.mutedForeground} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => moveDown(idx)}
                      disabled={idx === selectedHabits.length - 1}
                      style={[styles.reorderBtn, { opacity: idx === selectedHabits.length - 1 ? 0.25 : 1 }]}
                    >
                      <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* ── Schedule (Start / End Date) ── */}
      <View style={styles.sectionHeader}>
        <Feather name="calendar" size={13} color={colors.mutedForeground} />
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: font.semibold }]}>SCHEDULE</Text>
      </View>
      <View style={[styles.scheduleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.dateRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
          <Text style={[styles.dateRowLabel, { color: colors.mutedForeground, fontFamily: font.medium }]}>Start</Text>
          <View style={styles.dateRowRight}>
            <DateSegInput value={startDate} onChange={setStartDate} colors={colors} />
            <TouchableOpacity
              onPress={() => setStartDate(todayStr())}
              style={[styles.dateTagBtn, { backgroundColor: chosenTime.color + "18" }]}
            >
              <Text style={[styles.dateTagText, { color: chosenTime.color, fontFamily: font.medium }]}>Today</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.dateRow}>
          <Text style={[styles.dateRowLabel, { color: colors.mutedForeground, fontFamily: font.medium }]}>End</Text>
          <View style={styles.dateRowRight}>
            {endDate ? (
              <>
                <DateSegInput value={endDate} onChange={setEndDate} colors={colors} />
                <TouchableOpacity
                  onPress={() => setEndDate(undefined)}
                  style={[styles.dateTagBtn, { backgroundColor: colors.destructive + "18" }]}
                >
                  <Text style={[styles.dateTagText, { color: colors.destructive, fontFamily: font.medium }]}>Clear</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.foreverText, { color: colors.mutedForeground, fontFamily: font.regular }]}>Forever</Text>
                <TouchableOpacity
                  onPress={() => setEndDate(endDateStr)}
                  style={[styles.dateTagBtn, { backgroundColor: chosenTime.color + "18" }]}
                >
                  <Text style={[styles.dateTagText, { color: chosenTime.color, fontFamily: font.medium }]}>Pick Date</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>

      {/* ── Reminder ── */}
      <View style={styles.sectionHeader}>
        <Feather name="bell" size={13} color={colors.mutedForeground} />
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: font.semibold }]}>REMINDER</Text>
      </View>
      <View style={[styles.reminderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => setNotifEnabled(p => !p)}
          style={styles.reminderToggleRow}
          activeOpacity={0.75}
        >
          <View style={[styles.reminderIconWrap, { backgroundColor: notifEnabled ? chosenTime.color + "22" : colors.secondary }]}>
            <Feather name="bell" size={15} color={notifEnabled ? chosenTime.color : colors.mutedForeground} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.reminderTitle, { color: notifEnabled ? chosenTime.color : colors.foreground, fontFamily: font.medium }]}>
              {notifEnabled ? `Reminder at ${formatReminderTime(reminderTime)}` : "Enable reminders"}
            </Text>
            <Text style={[styles.reminderSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
              Default 7:00 AM · tap to toggle
            </Text>
          </View>
          <View style={[styles.togglePill, { backgroundColor: notifEnabled ? chosenTime.color : colors.border }]}>
            <View style={[styles.toggleDot, { marginLeft: notifEnabled ? 16 : 2 }]} />
          </View>
        </TouchableOpacity>

        {notifEnabled && (
          <>
            <View style={[styles.reminderDivider, { backgroundColor: colors.border }]} />
            <View style={styles.quickTimeGrid}>
              {QUICK_TIMES.map(qt => {
                const active = reminderTime === qt.value;
                return (
                  <TouchableOpacity
                    key={qt.value}
                    onPress={() => {
                      const [hh, mm] = qt.value.split(":");
                      setReminderHH(hh);
                      setReminderMM(mm);
                    }}
                    style={[
                      styles.quickTimeChip,
                      {
                        backgroundColor: active ? chosenTime.color + "20" : colors.secondary,
                        borderColor: active ? chosenTime.color : colors.border,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <Text style={[styles.quickTimeText, { color: active ? chosenTime.color : colors.mutedForeground, fontFamily: font.medium }]}>
                      {qt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.customTimeRow}>
              <Text style={[styles.customTimeLabel, { color: colors.mutedForeground, fontFamily: font.regular }]}>Custom:</Text>
              <TextInput
                value={reminderHH}
                onChangeText={v => setReminderHH(v.replace(/\D/g, "").slice(0, 2))}
                onBlur={() => {
                  const clamped = Math.min(23, Math.max(0, parseInt(reminderHH) || 7));
                  setReminderHH(String(clamped).padStart(2, "0"));
                }}
                placeholder="HH"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                maxLength={2}
                style={[styles.timeInput, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border, fontFamily: font.bold }]}
              />
              <Text style={[styles.timeColon, { color: colors.foreground, fontFamily: font.bold }]}>:</Text>
              <TextInput
                value={reminderMM}
                onChangeText={v => setReminderMM(v.replace(/\D/g, "").slice(0, 2))}
                onBlur={() => {
                  const clamped = Math.min(59, Math.max(0, parseInt(reminderMM) || 0));
                  setReminderMM(String(clamped).padStart(2, "0"));
                }}
                placeholder="MM"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                maxLength={2}
                style={[styles.timeInput, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border, fontFamily: font.bold }]}
              />
            </View>
          </>
        )}
      </View>

      {/* ── Notification Recurrence ── */}
      {notifEnabled && (
        <>
          <View style={styles.sectionHeader}>
            <Feather name="repeat" size={13} color={colors.mutedForeground} />
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: font.semibold }]}>NOTIFICATION RECURRENCE</Text>
          </View>
          <View style={[styles.recurrenceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {RECURRENCE_ITEMS.map((item, i) => {
              const active = notifRecurrence === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setNotifRecurrence(item.id)}
                  style={[
                    styles.recurrenceRow,
                    {
                      borderBottomWidth: i < RECURRENCE_ITEMS.length - 1 ? 1 : 0,
                      borderBottomColor: colors.border,
                      backgroundColor: active ? chosenTime.color + "08" : "transparent",
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radio, { borderColor: active ? chosenTime.color : colors.border, backgroundColor: active ? chosenTime.color : "transparent" }]}>
                    {active && <View style={styles.radioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.recurrenceLabel, { color: active ? chosenTime.color : colors.foreground, fontFamily: font.semibold }]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.recurrenceSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                      {item.desc()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            {notifRecurrence === "custom" && (
              <View style={[styles.intervalRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.intervalLabel, { color: colors.mutedForeground, fontFamily: font.regular }]}>Repeat every</Text>
                <TextInput
                  value={customIntervalH}
                  onChangeText={setCustomIntervalH}
                  keyboardType="numeric"
                  maxLength={2}
                  style={[styles.intervalInput, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border, fontFamily: font.bold }]}
                />
                <Text style={[styles.intervalLabel, { color: colors.mutedForeground, fontFamily: font.regular }]}>h</Text>
                <TextInput
                  value={customIntervalM}
                  onChangeText={setCustomIntervalM}
                  keyboardType="numeric"
                  maxLength={2}
                  style={[styles.intervalInput, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border, fontFamily: font.bold }]}
                />
                <Text style={[styles.intervalLabel, { color: colors.mutedForeground, fontFamily: font.regular }]}>min</Text>
              </View>
            )}
          </View>
        </>
      )}

      {/* ── Summary Card ── */}
      {selectedIds.length > 0 && (
        <View style={[styles.summaryCard, { backgroundColor: chosenTime.color + "12", borderColor: chosenTime.color + "40" }]}>
          <Feather name={routineIcon as any} size={20} color={chosenTime.color} />
          <View style={styles.summaryInfo}>
            <Text style={[styles.summaryTitle, { color: colors.foreground, fontFamily: font.semibold }]}>
              {name.trim() || "Unnamed Routine"}
            </Text>
            <Text style={[styles.summarySub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
              {selectedIds.length} habit{selectedIds.length !== 1 ? "s" : ""}  ·  ~{estimatedMinutes} min  ·  {chosenTime.label}
              {notifEnabled ? `  ·  🔔 ${formatReminderTime(reminderTime)}` : ""}
            </Text>
          </View>
          <Feather name="check-circle" size={18} color={chosenTime.color} />
        </View>
      )}

      {/* ── Create Button ── */}
      <TouchableOpacity
        onPress={handleCreate}
        style={[
          styles.createBtn,
          {
            backgroundColor: name.trim() && selectedIds.length > 0 ? chosenTime.color : colors.border,
            opacity: name.trim() && selectedIds.length > 0 ? 1 : 0.5,
          },
        ]}
        disabled={!name.trim() || selectedIds.length === 0}
        activeOpacity={0.8}
      >
        <Feather name={isEditMode ? "check-circle" : "play-circle"} size={20} color="#fff" />
        <Text style={[styles.createBtnText, { fontFamily: font.bold }]}>{isEditMode ? "Save Changes" : "Create Routine"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 18, gap: 14 },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { padding: 4, width: 40 },
  titleArea: { flex: 1, alignItems: "center", paddingVertical: 4 },
  title: { fontSize: 18 },
  swipeHint: { fontSize: 10, marginTop: 2, opacity: 0.7 },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { fontSize: 14, color: "#fff" },

  card: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 14 },
  identityRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  iconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  nameInput: { flex: 1, fontSize: 18, borderBottomWidth: 1, paddingBottom: 6 },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  iconOption: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.1 },

  timeGrid: { flexDirection: "row", gap: 8 },
  timeCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: "center", gap: 6 },
  timeIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  timeLabel: { fontSize: 12, textAlign: "center" },
  timeSub: { fontSize: 10, textAlign: "center" },

  catScroll: { marginHorizontal: -18 },
  catScrollContent: { paddingHorizontal: 18, gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  catChipText: { fontSize: 12 },

  emptyBox: { borderRadius: 16, padding: 32, alignItems: "center", gap: 10, borderWidth: 1 },
  emptyText: { fontSize: 13, textAlign: "center" },

  habitList: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  habitRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  habitIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  habitInfo: { flex: 1, gap: 2 },
  habitName: { fontSize: 14 },
  habitMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  habitCat: { fontSize: 11 },
  streakBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  streakText: { fontSize: 11 },

  orderList: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  orderRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  stepNum: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  stepNumText: { fontSize: 12 },
  orderName: { flex: 1, fontSize: 13 },
  reorderBtns: { flexDirection: "row", gap: 2 },
  reorderBtn: { padding: 4 },

  scheduleCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  dateRowLabel: { fontSize: 13, width: 40 },
  dateRowRight: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  dateSegRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateSeg: { textAlign: "center", borderRadius: 8, borderWidth: 1, paddingVertical: 6, fontSize: 14, fontFamily: "Inter_500Medium" },
  dateSep: { fontSize: 14 },
  dateTagBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  dateTagText: { fontSize: 12 },
  foreverText: { fontSize: 14, flex: 1 },

  reminderCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  reminderToggleRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  reminderIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  reminderTitle: { fontSize: 14 },
  reminderSub: { fontSize: 11, marginTop: 2 },
  togglePill: { width: 38, height: 22, borderRadius: 11, justifyContent: "center" },
  toggleDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#fff" },
  reminderDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  quickTimeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 14, paddingTop: 12 },
  quickTimeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  quickTimeText: { fontSize: 13 },
  customTimeRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
  customTimeLabel: { fontSize: 13 },
  timeInput: { width: 52, textAlign: "center", borderRadius: 10, borderWidth: 1, paddingVertical: 8, fontSize: 17 },
  timeColon: { fontSize: 20 },

  recurrenceCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  recurrenceRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  recurrenceLabel: { fontSize: 14 },
  recurrenceSub: { fontSize: 11, marginTop: 2 },
  intervalRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderTopWidth: 1 },
  intervalLabel: { fontSize: 13 },
  intervalInput: { width: 46, textAlign: "center", borderRadius: 10, borderWidth: 1, paddingVertical: 8, fontSize: 16 },

  summaryCard: {
    borderRadius: 16, borderWidth: 1, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  summaryInfo: { flex: 1, gap: 3 },
  summaryTitle: { fontSize: 15 },
  summarySub: { fontSize: 12 },

  createBtn: {
    borderRadius: 16, paddingVertical: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
  },
  createBtnText: { fontSize: 16, color: "#fff" },
});
