import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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

type HabitType = "binary" | "quantitative";
type Priority = "low" | "medium" | "high";
type NotifRecurrence = "once" | "twice" | "custom";

const CATEGORIES: HabitCategory[] = [
  "physical", "mental", "academics", "creativity", "chores",
];

const QUICK_TIMES = [
  { label: "6 AM", value: "06:00" },
  { label: "7 AM", value: "07:00" },
  { label: "8 AM", value: "08:00" },
  { label: "9 AM", value: "09:00" },
  { label: "12 PM", value: "12:00" },
  { label: "3 PM", value: "15:00" },
  { label: "6 PM", value: "18:00" },
  { label: "9 PM", value: "21:00" },
];

const ICONS = [
  "activity", "book-open", "coffee", "droplet", "heart", "wind",
  "music", "pen-tool", "sun", "moon", "zap", "target",
  "trending-up", "user", "watch", "anchor", "award", "briefcase",
];

const COLORS = [
  "#13EC5B", "#A855F7", "#3B82F6", "#F97316", "#06B6D4",
  "#FBBF24", "#EC4899", "#34D399", "#F87171", "#818CF8",
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
  const seg = (
    width: number,
    val: string,
    ph: string,
    onChange2: (v: string) => void,
    max: number
  ) => (
    <TextInput
      value={val}
      onChangeText={(v) => onChange2(v.replace(/\D/g, "").slice(0, max))}
      placeholder={ph}
      placeholderTextColor={colors.mutedForeground}
      keyboardType="number-pad"
      maxLength={max}
      style={[
        styles.dateSeg,
        {
          width,
          backgroundColor: colors.secondary,
          color: colors.foreground,
          borderColor: colors.border,
        },
      ]}
    />
  );
  return (
    <View style={styles.dateSegRow}>
      {seg(54, y, "YYYY", (v) => update(v, m, d), 4)}
      <Text style={[styles.dateSep, { color: colors.mutedForeground }]}>/</Text>
      {seg(36, m, "MM", (v) => update(y, v, d), 2)}
      <Text style={[styles.dateSep, { color: colors.mutedForeground }]}>/</Text>
      {seg(36, d, "DD", (v) => update(y, m, v), 2)}
    </View>
  );
}

export default function CreateScreen() {
  const colors = useColors();
  const font = useFont();
  const insets = useSafeAreaInsets();
  const { addHabit, routines, updateRoutine } = useHabits();
  const notifSupport = getNotificationSupport();

  const [name, setName] = useState("");
  const [type, setType] = useState<HabitType>("binary");
  const [category, setCategory] = useState<HabitCategory>("physical");
  const [priority, setPriority] = useState<Priority>("medium");
  const [icon, setIcon] = useState("activity");
  const [color, setColor] = useState(COLORS[0]);

  const [targetValue, setTargetValue] = useState("");
  const [targetUnit, setTargetUnit] = useState("");

  const [smartDetect, setSmartDetect] = useState<{
    value: string;
    unit: string;
  } | null>(null);

  const [selectedRoutineIds, setSelectedRoutineIds] = useState<string[]>([]);

  const [notifEnabled, setNotifEnabled] = useState(false);
  const [reminderHH, setReminderHH] = useState("07");
  const [reminderMM, setReminderMM] = useState("00");
  const reminderTime = `${reminderHH.padStart(2, "0")}:${reminderMM.padStart(2, "0")}`;

  const [notifRecurrence, setNotifRecurrence] =
    useState<NotifRecurrence>("once");
  const [customIntervalH, setCustomIntervalH] = useState("4");
  const [customIntervalM, setCustomIntervalM] = useState("0");

  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  const [endDateStr, setEndDateStr] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  });

  useEffect(() => {
    const lower = name.toLowerCase();
    const q = lower.match(
      /(\d+)\s*(pages?|reps?|times?|glasses?|cups?|km|miles?|laps?|sets?|pushups?|situps?|oz|ml|steps?|mins?|minutes?)/
    );
    if (q) {
      setSmartDetect({ value: q[1], unit: q[2].replace(/s$/, "") });
    } else {
      setSmartDetect(null);
    }
  }, [name]);

  const swipePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 12 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
      onPanResponderRelease: (_, gs) => {
        if (Math.abs(gs.dx) > 50) {
          if (Platform.OS !== "web")
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.replace("/create-routine" as any);
        }
      },
    })
  ).current;

  const canSave = name.trim().length > 0;

  async function handleSave() {
    if (!canSave) return;
    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const habitId = addHabit({
      name: name.trim(),
      type,
      category,
      icon,
      color,
      frequency: "daily",
      difficulty: "medium",
      priority,
      archived: false,
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
      targetValue:
        type === "quantitative" && targetValue
          ? parseInt(targetValue)
          : undefined,
      targetUnit:
        type === "quantitative" ? targetUnit || undefined : undefined,
      startDate,
      endDate,
    });

    const support = getNotificationSupport();
    if (notifEnabled && support !== "none") {
      const granted = await requestNotificationPermission();
      if (granted) {
        await scheduleHabitReminder(habitId, name.trim(), reminderTime, 0);
        if (notifRecurrence === "twice") {
          const [hh, mm] = reminderTime.split(":").map(Number);
          const remMin = hh * 60 + mm;
          const midMin = Math.round((remMin + 23 * 60 + 59) / 2);
          const midHH = String(Math.floor(midMin / 60)).padStart(2, "0");
          const midMM = String(midMin % 60).padStart(2, "0");
          await scheduleHabitReminder(
            `${habitId}_2`,
            name.trim(),
            `${midHH}:${midMM}`,
            0
          );
        }
      } else {
        Alert.alert(
          "Notifications Blocked",
          "Enable notifications in your device settings to receive reminders."
        );
      }
    }

    for (const routineId of selectedRoutineIds) {
      const routine = routines.find((r) => r.id === routineId);
      if (routine && !routine.habitIds.includes(habitId)) {
        updateRoutine(routineId, {
          habitIds: [...routine.habitIds, habitId],
        });
      }
    }

    router.back();
  }

  const topPadding =
    Platform.OS === "web"
      ? Math.max(insets.top, 67) + 16
      : insets.top + 16;

  function SectionLabel({
    iconName,
    title,
  }: {
    iconName?: string;
    title: string;
  }) {
    return (
      <View style={styles.sectionLabelRow}>
        {iconName && (
          <Feather
            name={iconName as any}
            size={12}
            color={colors.mutedForeground}
          />
        )}
        <Text
          style={[
            styles.sectionLabel,
            { color: colors.mutedForeground, fontFamily: font.semibold },
          ]}
        >
          {title.toUpperCase()}
        </Text>
      </View>
    );
  }

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
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding, paddingBottom: insets.bottom + 48 },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.titleArea} {...swipePan.panHandlers}>
          <Text
            style={[
              styles.pageTitle,
              { color: colors.foreground, fontFamily: font.bold },
            ]}
          >
            New Habit
          </Text>
          <Text
            style={[
              styles.swipeHint,
              { color: colors.mutedForeground, fontFamily: font.regular },
            ]}
          >
            ← swipe to switch to Routine →
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!canSave}
          style={[
            styles.saveBtn,
            {
              backgroundColor: canSave ? color : colors.muted,
            },
          ]}
        >
          <Text
            style={[
              styles.saveBtnText,
              {
                color: canSave ? "#fff" : colors.mutedForeground,
                fontFamily: font.semibold,
              },
            ]}
          >
            Save
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Preview card ── */}
      <View
        style={[
          styles.previewCard,
          { backgroundColor: color + "15", borderColor: color + "35" },
        ]}
      >
        <View
          style={[styles.previewIconWrap, { backgroundColor: color + "28" }]}
        >
          <Feather name={icon as any} size={28} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.previewName,
              { color: colors.foreground, fontFamily: font.bold },
            ]}
            numberOfLines={1}
          >
            {name || "Habit name"}
          </Text>
          <Text
            style={[
              styles.previewSub,
              { color: colors.mutedForeground, fontFamily: font.regular },
            ]}
          >
            {PILLAR_LABELS[category]} · {priority} priority ·{" "}
            {type === "binary"
              ? "Yes / No"
              : `${targetValue || "—"} ${targetUnit || "units"}`}
          </Text>
        </View>
      </View>

      {/* ── Name ── */}
      <SectionLabel title="Name" />
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Read 10 pages"
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            color: colors.foreground,
            borderColor: name ? color + "66" : colors.border,
            fontFamily: font.regular,
          },
        ]}
        maxLength={60}
        autoFocus
      />

      {/* Smart detect */}
      {smartDetect && type !== "quantitative" && (
        <TouchableOpacity
          onPress={() => {
            setType("quantitative");
            setTargetValue(smartDetect.value);
            setTargetUnit(smartDetect.unit);
          }}
          style={[
            styles.smartBanner,
            { backgroundColor: color + "12", borderColor: color + "40" },
          ]}
          activeOpacity={0.75}
        >
          <Text style={{ fontSize: 16 }}>✨</Text>
          <Text
            style={[
              styles.smartText,
              { color: color, fontFamily: font.medium },
            ]}
          >
            Detected: {smartDetect.value} {smartDetect.unit} — tap to set
            quantitative goal
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Habit Type ── */}
      <SectionLabel iconName="layers" title="Habit Type" />
      <View style={styles.typeRow}>
        {(["binary", "quantitative"] as HabitType[]).map((t) => {
          const active = type === t;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setType(t)}
              style={[
                styles.typeCard,
                {
                  backgroundColor: active ? color + "15" : colors.card,
                  borderColor: active ? color : colors.border,
                  borderWidth: active ? 1.5 : 1,
                },
              ]}
              activeOpacity={0.75}
            >
              <Feather
                name={t === "binary" ? "toggle-right" : "hash"}
                size={22}
                color={active ? color : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.typeLabel,
                  {
                    color: active ? color : colors.foreground,
                    fontFamily: font.semibold,
                  },
                ]}
              >
                {t === "binary" ? "Yes / No" : "Quantitative"}
              </Text>
              <Text
                style={[
                  styles.typeSub,
                  { color: colors.mutedForeground, fontFamily: font.regular },
                ]}
              >
                {t === "binary"
                  ? "Mark done or not done"
                  : "Count toward a goal"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quantitative fields */}
      {type === "quantitative" && (
        <View style={styles.twoCol}>
          <View style={{ flex: 1, gap: 6 }}>
            <SectionLabel title="Goal" />
            <TextInput
              value={targetValue}
              onChangeText={setTargetValue}
              placeholder="e.g. 10"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  color: colors.foreground,
                  borderColor: colors.border,
                  fontFamily: font.regular,
                },
              ]}
            />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <SectionLabel title="Unit" />
            <TextInput
              value={targetUnit}
              onChangeText={setTargetUnit}
              placeholder="e.g. pages"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  color: colors.foreground,
                  borderColor: colors.border,
                  fontFamily: font.regular,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* ── Category ── */}
      <SectionLabel iconName="grid" title="Life Pillar" />
      <View style={styles.chipRow}>
        {CATEGORIES.map((c) => {
          const active = category === c;
          const cc = PILLAR_COLORS[c];
          return (
            <TouchableOpacity
              key={c}
              onPress={() => {
                setCategory(c);
                setColor(cc);
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? cc + "20" : colors.secondary,
                  borderColor: active ? cc : colors.border,
                  borderWidth: 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: active ? cc : colors.mutedForeground,
                    fontFamily: font.medium,
                  },
                ]}
              >
                {PILLAR_LABELS[c]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Priority ── */}
      <SectionLabel iconName="alert-triangle" title="Priority" />
      <View style={styles.chipRow}>
        {(["high", "medium", "low"] as Priority[]).map((p) => {
          const active = priority === p;
          const pc =
            p === "high"
              ? colors.destructive
              : p === "medium"
              ? colors.warning
              : colors.accent;
          return (
            <TouchableOpacity
              key={p}
              onPress={() => setPriority(p)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? pc + "20" : colors.secondary,
                  borderColor: active ? pc : colors.border,
                  borderWidth: 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: active ? pc : colors.mutedForeground,
                    fontFamily: font.medium,
                    textTransform: "capitalize",
                  },
                ]}
              >
                {p}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Icon ── */}
      <SectionLabel iconName="image" title="Icon" />
      <View style={styles.iconGrid}>
        {ICONS.map((ic) => (
          <TouchableOpacity
            key={ic}
            onPress={() => setIcon(ic)}
            style={[
              styles.iconOption,
              {
                backgroundColor:
                  icon === ic ? color + "25" : colors.secondary,
                borderWidth: icon === ic ? 2 : 0,
                borderColor: color,
              },
            ]}
          >
            <Feather
              name={ic as any}
              size={20}
              color={icon === ic ? color : colors.mutedForeground}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Color ── */}
      <SectionLabel iconName="droplet" title="Color" />
      <View style={styles.colorRow}>
        {COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => setColor(c)}
            style={[
              styles.colorSwatch,
              {
                backgroundColor: c,
                borderWidth: color === c ? 3 : 0,
                borderColor: "#fff",
              },
            ]}
          >
            {color === c && <Feather name="check" size={13} color="#fff" />}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Add to Routine ── */}
      <SectionLabel iconName="list" title="Add to Routine" />
      {routines.length === 0 ? (
        <TouchableOpacity
          onPress={() => router.replace("/create-routine" as any)}
          style={[
            styles.routineEmptyBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="plus-circle" size={15} color={colors.primary} />
          <Text
            style={[
              styles.routineEmptyText,
              { color: colors.primary, fontFamily: font.medium },
            ]}
          >
            Create your first routine
          </Text>
        </TouchableOpacity>
      ) : (
        <View
          style={[
            styles.routineList,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {routines.map((r, i) => {
            const checked = selectedRoutineIds.includes(r.id);
            const timeColor =
              r.timeOfDay === "morning"
                ? "#F97316"
                : r.timeOfDay === "afternoon"
                ? "#FBBF24"
                : r.timeOfDay === "evening"
                ? "#A855F7"
                : "#3B82F6";
            const timeIcon =
              r.timeOfDay === "morning"
                ? "sunrise"
                : r.timeOfDay === "afternoon"
                ? "sun"
                : r.timeOfDay === "evening"
                ? "sunset"
                : "moon";
            return (
              <TouchableOpacity
                key={r.id}
                onPress={() =>
                  setSelectedRoutineIds((prev) =>
                    prev.includes(r.id)
                      ? prev.filter((x) => x !== r.id)
                      : [...prev, r.id]
                  )
                }
                style={[
                  styles.routineRow,
                  {
                    borderBottomWidth: i < routines.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                    backgroundColor: checked ? color + "08" : "transparent",
                  },
                ]}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.routineCheck,
                    {
                      borderColor: checked ? color : colors.border,
                      backgroundColor: checked ? color : "transparent",
                    },
                  ]}
                >
                  {checked && (
                    <Feather name="check" size={11} color="#fff" />
                  )}
                </View>
                <View
                  style={[
                    styles.routineTimeIcon,
                    { backgroundColor: timeColor + "18" },
                  ]}
                >
                  <Feather
                    name={timeIcon as any}
                    size={13}
                    color={timeColor}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.routineName,
                      { color: colors.foreground, fontFamily: font.medium },
                    ]}
                  >
                    {r.name}
                  </Text>
                  <Text
                    style={[
                      styles.routineMeta,
                      {
                        color: colors.mutedForeground,
                        fontFamily: font.regular,
                      },
                    ]}
                  >
                    {r.habitIds.length} habit
                    {r.habitIds.length !== 1 ? "s" : ""} · {r.timeOfDay}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            onPress={() => router.replace("/create-routine" as any)}
            style={[
              styles.routineAddBtn,
              { borderTopColor: colors.border },
            ]}
          >
            <Feather name="plus" size={13} color={colors.primary} />
            <Text
              style={[
                styles.routineAddBtnText,
                { color: colors.primary, fontFamily: font.medium },
              ]}
            >
              New Routine
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Reminder ── */}
      <SectionLabel iconName="bell" title="Reminder" />
      <View
        style={[
          styles.reminderCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => setNotifEnabled((p) => !p)}
          style={styles.reminderToggleRow}
          activeOpacity={0.75}
        >
          <View
            style={[
              styles.reminderIcon,
              {
                backgroundColor: notifEnabled
                  ? color + "22"
                  : colors.secondary,
              },
            ]}
          >
            <Feather
              name="bell"
              size={15}
              color={notifEnabled ? color : colors.mutedForeground}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.reminderTitle,
                {
                  color: notifEnabled ? color : colors.foreground,
                  fontFamily: font.medium,
                },
              ]}
            >
              {notifEnabled
                ? `Reminder at ${formatReminderTime(reminderTime)}`
                : "Enable reminders"}
            </Text>
            <Text
              style={[
                styles.reminderSub,
                { color: colors.mutedForeground, fontFamily: font.regular },
              ]}
            >
              Default 7:00 AM · tap to toggle
            </Text>
          </View>
          <View
            style={[
              styles.togglePill,
              { backgroundColor: notifEnabled ? color : colors.border },
            ]}
          >
            <View
              style={[
                styles.toggleDot,
                { marginLeft: notifEnabled ? 16 : 2 },
              ]}
            />
          </View>
        </TouchableOpacity>

        {notifEnabled && (
          <>
            <View
              style={[
                styles.reminderDivider,
                { backgroundColor: colors.border },
              ]}
            />
            {/* Quick time chips */}
            <View style={styles.quickTimeGrid}>
              {QUICK_TIMES.map((qt) => {
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
                        backgroundColor: active
                          ? color + "20"
                          : colors.secondary,
                        borderColor: active ? color : colors.border,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickTimeText,
                        {
                          color: active ? color : colors.mutedForeground,
                          fontFamily: font.medium,
                        },
                      ]}
                    >
                      {qt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {/* Custom HH:MM */}
            <View style={styles.customTimeRow}>
              <Text
                style={[
                  styles.customTimeLabel,
                  { color: colors.mutedForeground, fontFamily: font.regular },
                ]}
              >
                Custom:
              </Text>
              <TextInput
                value={reminderHH}
                onChangeText={(v) =>
                  setReminderHH(v.replace(/\D/g, "").slice(0, 2))
                }
                onBlur={() => {
                  const clamped = Math.min(
                    23,
                    Math.max(0, parseInt(reminderHH) || 7)
                  );
                  setReminderHH(String(clamped).padStart(2, "0"));
                }}
                placeholder="HH"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                maxLength={2}
                style={[
                  styles.timeInput,
                  {
                    backgroundColor: colors.secondary,
                    color: colors.foreground,
                    borderColor: colors.border,
                    fontFamily: font.bold,
                  },
                ]}
              />
              <Text
                style={[
                  styles.timeColon,
                  { color: colors.foreground, fontFamily: font.bold },
                ]}
              >
                :
              </Text>
              <TextInput
                value={reminderMM}
                onChangeText={(v) =>
                  setReminderMM(v.replace(/\D/g, "").slice(0, 2))
                }
                onBlur={() => {
                  const clamped = Math.min(
                    59,
                    Math.max(0, parseInt(reminderMM) || 0)
                  );
                  setReminderMM(String(clamped).padStart(2, "0"));
                }}
                placeholder="MM"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                maxLength={2}
                style={[
                  styles.timeInput,
                  {
                    backgroundColor: colors.secondary,
                    color: colors.foreground,
                    borderColor: colors.border,
                    fontFamily: font.bold,
                  },
                ]}
              />
            </View>
          </>
        )}
      </View>

      {/* ── Notification Recurrence ── */}
      {notifEnabled && (
        <>
          <SectionLabel iconName="repeat" title="Notification Recurrence" />
          <View
            style={[
              styles.recurrenceCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
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
                      backgroundColor: active ? color + "08" : "transparent",
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: active ? color : colors.border,
                        backgroundColor: active ? color : "transparent",
                      },
                    ]}
                  >
                    {active && <View style={styles.radioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.recurrenceLabel,
                        {
                          color: active ? color : colors.foreground,
                          fontFamily: font.semibold,
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={[
                        styles.recurrenceSub,
                        {
                          color: colors.mutedForeground,
                          fontFamily: font.regular,
                        },
                      ]}
                    >
                      {item.desc()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Custom interval inputs */}
            {notifRecurrence === "custom" && (
              <View
                style={[
                  styles.intervalRow,
                  { borderTopColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.intervalLabel,
                    { color: colors.mutedForeground, fontFamily: font.regular },
                  ]}
                >
                  Repeat every
                </Text>
                <TextInput
                  value={customIntervalH}
                  onChangeText={setCustomIntervalH}
                  keyboardType="numeric"
                  maxLength={2}
                  style={[
                    styles.intervalInput,
                    {
                      backgroundColor: colors.secondary,
                      color: colors.foreground,
                      borderColor: colors.border,
                      fontFamily: font.bold,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.intervalLabel,
                    { color: colors.mutedForeground, fontFamily: font.regular },
                  ]}
                >
                  h
                </Text>
                <TextInput
                  value={customIntervalM}
                  onChangeText={setCustomIntervalM}
                  keyboardType="numeric"
                  maxLength={2}
                  style={[
                    styles.intervalInput,
                    {
                      backgroundColor: colors.secondary,
                      color: colors.foreground,
                      borderColor: colors.border,
                      fontFamily: font.bold,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.intervalLabel,
                    { color: colors.mutedForeground, fontFamily: font.regular },
                  ]}
                >
                  min
                </Text>
              </View>
            )}
          </View>
        </>
      )}

      {/* ── Schedule (Start / End Date) ── */}
      <SectionLabel iconName="calendar" title="Schedule" />
      <View
        style={[
          styles.scheduleCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {/* Start date */}
        <View
          style={[
            styles.dateRow,
            { borderBottomWidth: 1, borderBottomColor: colors.border },
          ]}
        >
          <Text
            style={[
              styles.dateRowLabel,
              { color: colors.mutedForeground, fontFamily: font.medium },
            ]}
          >
            Start
          </Text>
          <View style={styles.dateRowRight}>
            <DateSegInput
              value={startDate}
              onChange={setStartDate}
              colors={colors}
            />
            <TouchableOpacity
              onPress={() => setStartDate(todayStr())}
              style={[styles.dateTagBtn, { backgroundColor: color + "18" }]}
            >
              <Text
                style={[
                  styles.dateTagText,
                  { color, fontFamily: font.medium },
                ]}
              >
                Today
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* End date */}
        <View style={styles.dateRow}>
          <Text
            style={[
              styles.dateRowLabel,
              { color: colors.mutedForeground, fontFamily: font.medium },
            ]}
          >
            End
          </Text>
          <View style={styles.dateRowRight}>
            {endDate ? (
              <>
                <DateSegInput
                  value={endDate}
                  onChange={setEndDate}
                  colors={colors}
                />
                <TouchableOpacity
                  onPress={() => setEndDate(undefined)}
                  style={[
                    styles.dateTagBtn,
                    { backgroundColor: colors.destructive + "18" },
                  ]}
                >
                  <Text
                    style={[
                      styles.dateTagText,
                      {
                        color: colors.destructive,
                        fontFamily: font.medium,
                      },
                    ]}
                  >
                    Clear
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text
                  style={[
                    styles.foreverText,
                    {
                      color: colors.mutedForeground,
                      fontFamily: font.regular,
                    },
                  ]}
                >
                  Forever
                </Text>
                <TouchableOpacity
                  onPress={() => setEndDate(endDateStr)}
                  style={[
                    styles.dateTagBtn,
                    { backgroundColor: color + "18" },
                  ]}
                >
                  <Text
                    style={[
                      styles.dateTagText,
                      { color, fontFamily: font.medium },
                    ]}
                  >
                    Pick Date
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>

      {/* ── Create button ── */}
      <TouchableOpacity
        onPress={handleSave}
        disabled={!canSave}
        style={[
          styles.createBtn,
          {
            backgroundColor: canSave ? color : colors.muted,
            opacity: canSave ? 1 : 0.5,
          },
        ]}
        activeOpacity={0.8}
      >
        <Feather name="check-circle" size={20} color="#fff" />
        <Text style={[styles.createBtnText, { fontFamily: font.bold }]}>
          Create Habit
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: { padding: 4, width: 36 },
  titleArea: { flex: 1, alignItems: "center", paddingVertical: 4 },
  pageTitle: { fontSize: 18 },
  swipeHint: { fontSize: 10, marginTop: 2, opacity: 0.7 },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    width: 60,
    alignItems: "center",
  },
  saveBtnText: { fontSize: 14 },

  previewCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  previewIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  previewName: { fontSize: 17 },
  previewSub: { fontSize: 12, marginTop: 3 },

  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: -4,
  },
  sectionLabel: { fontSize: 11, letterSpacing: 0.8 },

  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },

  smartBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: -4,
  },
  smartText: { flex: 1, fontSize: 13 },

  typeRow: { flexDirection: "row", gap: 10 },
  typeCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  typeLabel: { fontSize: 14, textAlign: "center" },
  typeSub: { fontSize: 11, textAlign: "center" },

  twoCol: { flexDirection: "row", gap: 10 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  chipText: { fontSize: 13 },

  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  routineEmptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  routineEmptyText: { fontSize: 14 },
  routineList: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  routineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  routineCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  routineTimeIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  routineName: { fontSize: 14 },
  routineMeta: { fontSize: 11, marginTop: 2 },
  routineAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  routineAddBtnText: { fontSize: 13 },

  reminderCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  reminderToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  reminderIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  reminderTitle: { fontSize: 14 },
  reminderSub: { fontSize: 11, marginTop: 2 },
  togglePill: {
    width: 38,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
  },
  toggleDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#fff",
  },
  reminderDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  quickTimeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 14,
    paddingTop: 12,
  },
  quickTimeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  quickTimeText: { fontSize: 13 },
  customTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  customTimeLabel: { fontSize: 13 },
  timeInput: {
    width: 52,
    textAlign: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    fontSize: 17,
  },
  timeColon: { fontSize: 20 },

  recurrenceCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  recurrenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  recurrenceLabel: { fontSize: 14 },
  recurrenceSub: { fontSize: 11, marginTop: 2 },
  intervalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderTopWidth: 1,
  },
  intervalLabel: { fontSize: 13 },
  intervalInput: {
    width: 46,
    textAlign: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    fontSize: 16,
  },

  scheduleCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateRowLabel: { fontSize: 13, width: 40 },
  dateRowRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dateSegRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateSeg: {
    textAlign: "center",
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 6,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  dateSep: { fontSize: 14 },
  dateTagBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  dateTagText: { fontSize: 12 },
  foreverText: { fontSize: 14, flex: 1 },

  createBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  createBtnText: { fontSize: 16, color: "#fff" },
});
