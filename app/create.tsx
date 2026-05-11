import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useFont } from "@/hooks/useFont";
import { useHabitsActions, useHabitsState, type HabitCategory } from "@/context/HabitsContext";
import { notificationService, NotifRecurrence } from "@/lib/notificationService";

// Modular Components
import { CreateHeader } from "@/components/create/CreateHeader";
import { HabitPreview } from "@/components/create/HabitPreview";
import { TypeSelector, HabitType } from "@/components/create/TypeSelector";
import { PillarSelector } from "@/components/create/PillarSelector";
import { RoutineSelector } from "@/components/create/RoutineSelector";
import { ReminderSection } from "@/components/create/ReminderSection";
import { SectionLabel, DateSegInput } from "@/components/create/Common";

type Priority = "low" | "medium" | "high";

const COLORS = [
  "#13EC5B", "#A855F7", "#3B82F6", "#F97316", "#06B6D4",
  "#FBBF24", "#EC4899", "#34D399", "#F87171", "#818CF8",
];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function CreateScreen() {
  const colors = useColors();
  const font = useFont();
  const insets = useSafeAreaInsets();
  
  const { routines } = useHabitsState();
  const { addHabit, updateRoutine } = useHabitsActions();

  // --- State ---
  const [name, setName] = useState("");
  const [type, setType] = useState<HabitType>("binary");
  const [category, setCategory] = useState<HabitCategory>("physical");
  const [priority, setPriority] = useState<Priority>("medium");
  const [icon, setIcon] = useState("activity");
  const [color, setColor] = useState(COLORS[0]);

  const [targetValue, setTargetValue] = useState("");
  const [targetUnit, setTargetUnit] = useState("");

  const [smartDetect, setSmartDetect] = useState<{ value: string; unit: string } | null>(null);
  const [selectedRoutineIds, setSelectedRoutineIds] = useState<string[]>([]);

  const [notifEnabled, setNotifEnabled] = useState(false);
  const [reminderHH, setReminderHH] = useState("07");
  const [reminderMM, setReminderMM] = useState("00");
  const [notifRecurrence, setNotifRecurrence] = useState<NotifRecurrence>("once");
  const [customIntervalH, setCustomIntervalH] = useState("4");
  const [customIntervalM, setCustomIntervalM] = useState("0");

  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  
  const [endDateStr] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  });

  // --- Derived ---
  const reminderTime = useMemo(() => 
    `${reminderHH.padStart(2, "0")}:${reminderMM.padStart(2, "0")}`,
    [reminderHH, reminderMM]
  );
  
  const canSave = name.trim().length > 0;

  // --- Effects ---
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

  // --- Handlers ---
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onEnd((event) => {
      if (Math.abs(event.translationX) > 50) {
        if (Platform.OS !== "web") runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
        runOnJS(router.replace)("/create-routine" as any);
      }
    });

  async function handleSave() {
    if (!canSave) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

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
      targetValue: type === "quantitative" && targetValue ? parseInt(targetValue) : undefined,
      targetUnit: type === "quantitative" ? targetUnit || undefined : undefined,
      startDate,
      endDate,
    });

    if (notifEnabled) {
      const scheduled = await notificationService.schedule({
        id: habitId,
        name: name.trim(),
        reminderTime,
        recurrence: notifRecurrence,
        customIntervalH: parseInt(customIntervalH),
        customIntervalM: parseInt(customIntervalM),
      });

      if (!scheduled && Platform.OS !== "web") {
        Alert.alert("Notifications Blocked", "Enable notifications in settings to receive reminders.");
      }
    }

    // Add to routines
    for (const routineId of selectedRoutineIds) {
      const routine = routines.find((r) => r.id === routineId);
      if (routine) {
        updateRoutine(routineId, {
          habitIds: [...routine.habitIds, habitId],
        });
      }
    }

    router.back();
  }

  const topPadding = Platform.OS === "web" ? Math.max(insets.top, 67) + 16 : insets.top + 16;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPadding, paddingBottom: insets.bottom + 48 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <CreateHeader 
        onBack={() => router.back()} 
        onSave={handleSave} 
        canSave={canSave} 
        accentColor={color}
        gesture={swipeGesture}
      />

      <HabitPreview 
        name={name} 
        category={category} 
        icon={icon} 
        color={color} 
        priority={priority} 
      />

      <SectionLabel iconName="edit-3" title="Identity" />
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border, fontFamily: font.medium }]}
        placeholder="Habit name (e.g. Drink 8 glasses of water)"
        placeholderTextColor={colors.mutedForeground}
        value={name}
        onChangeText={setName}
        autoFocus={Platform.OS !== "web"}
        maxLength={50}
      />

      {smartDetect && (
        <TouchableOpacity
          onPress={() => {
            setType("quantitative");
            setTargetValue(smartDetect.value);
            setTargetUnit(smartDetect.unit);
            setSmartDetect(null);
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          style={[styles.smartBanner, { backgroundColor: color + "12", borderColor: color + "30" }]}
        >
          <Feather name="zap" size={14} color={color} />
          <Text style={[styles.smartText, { color: colors.foreground, fontFamily: font.medium }]}>
            Detect <Text style={{ color, fontFamily: font.bold }}>{smartDetect.value} {smartDetect.unit}</Text>? Tap to auto-fill.
          </Text>
        </TouchableOpacity>
      )}

      <SectionLabel iconName="layers" title="Habit Type" />
      <TypeSelector value={type} onChange={setType} accentColor={color} />

      {type === "quantitative" && (
        <View style={styles.twoCol}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: font.semibold }]}>GOAL</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border, fontFamily: font.bold }]}
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              value={targetValue}
              onChangeText={setTargetValue}
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: font.semibold }]}>UNIT</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border, fontFamily: font.medium }]}
              placeholder="unit (e.g. pages)"
              placeholderTextColor={colors.mutedForeground}
              value={targetUnit}
              onChangeText={setTargetUnit}
            />
          </View>
        </View>
      )}

      <SectionLabel iconName="box" title="Pillar & Style" />
      <PillarSelector 
        category={category} 
        onCategoryChange={setCategory} 
        color={color} 
        onColorChange={setColor} 
        icon={icon} 
        onIconChange={setIcon} 
      />

      <SectionLabel iconName="flag" title="Priority" />
      <View style={styles.chipRow}>
        {(["low", "medium", "high"] as Priority[]).map((p) => {
          const active = priority === p;
          return (
            <TouchableOpacity
              key={p}
              onPress={() => setPriority(p)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? color + "20" : colors.secondary,
                  borderColor: active ? color : colors.border,
                  borderWidth: 1,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? color : colors.mutedForeground, fontFamily: font.medium }]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <SectionLabel iconName="package" title="Add to Routines" />
      <RoutineSelector 
        routines={routines} 
        selectedIds={selectedRoutineIds} 
        onToggle={(id) => setSelectedRoutineIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])} 
        accentColor={color} 
        onNewRoutine={() => router.replace("/create-routine" as any)} 
      />

      <SectionLabel iconName="bell" title="Reminder" />
      <ReminderSection 
        enabled={notifEnabled} 
        onToggle={setNotifEnabled} 
        reminderHH={reminderHH} 
        setReminderHH={setReminderHH} 
        reminderMM={reminderMM} 
        setReminderMM={setReminderMM} 
        recurrence={notifRecurrence} 
        onRecurrenceChange={setNotifRecurrence} 
        customIntervalH={customIntervalH} 
        setCustomIntervalH={setCustomIntervalH} 
        customIntervalM={customIntervalM} 
        setCustomIntervalM={setCustomIntervalM} 
        accentColor={color} 
      />

      <SectionLabel iconName="calendar" title="Schedule" />
      <View style={[styles.scheduleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.dateRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
          <Text style={[styles.dateRowLabel, { color: colors.mutedForeground, fontFamily: font.medium }]}>Start</Text>
          <View style={styles.dateRowRight}>
            <DateSegInput value={startDate} onChange={setStartDate} colors={colors} />
            <TouchableOpacity onPress={() => setStartDate(todayStr())} style={[styles.dateTagBtn, { backgroundColor: color + "18" }]}>
              <Text style={[styles.dateTagText, { color, fontFamily: font.medium }]}>Today</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.dateRow}>
          <Text style={[styles.dateRowLabel, { color: colors.mutedForeground, fontFamily: font.medium }]}>End</Text>
          <View style={styles.dateRowRight}>
            {endDate ? (
              <>
                <DateSegInput value={endDate} onChange={setEndDate} colors={colors} />
                <TouchableOpacity onPress={() => setEndDate(undefined)} style={[styles.dateTagBtn, { backgroundColor: colors.destructive + "18" }]}>
                  <Text style={[styles.dateTagText, { color: colors.destructive, fontFamily: font.medium }]}>Clear</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.foreverText, { color: colors.mutedForeground, fontFamily: font.regular }]}>Forever</Text>
                <TouchableOpacity onPress={() => setEndDate(endDateStr)} style={[styles.dateTagBtn, { backgroundColor: color + "18" }]}>
                  <Text style={[styles.dateTagText, { color, fontFamily: font.medium }]}>Pick Date</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>

      <TouchableOpacity
        onPress={handleSave}
        disabled={!canSave}
        style={[styles.createBtn, { backgroundColor: canSave ? color : colors.muted, opacity: canSave ? 1 : 0.5 }]}
        activeOpacity={0.8}
      >
        <Feather name="check-circle" size={20} color="#fff" />
        <Text style={[styles.createBtnText, { fontFamily: font.bold }]}>Create Habit</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  smartBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginTop: -4 },
  smartText: { flex: 1, fontSize: 13 },
  twoCol: { flexDirection: "row", gap: 10 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  chipText: { fontSize: 13 },
  sectionLabel: { fontSize: 11, letterSpacing: 0.8 },
  scheduleCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  dateRowLabel: { fontSize: 13, width: 40 },
  dateRowRight: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  dateTagBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  dateTagText: { fontSize: 12 },
  foreverText: { fontSize: 14, flex: 1 },
  createBtn: { borderRadius: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
  createBtnText: { fontSize: 16, color: "#fff" },
});
