import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { RoutineHeader } from "@/components/create/RoutineHeader";
import { HabitSelectionList } from "@/components/create/HabitSelectionList";
import { FlowOrderList } from "@/components/create/FlowOrderList";
import { ReminderSection } from "@/components/create/ReminderSection";
import { SectionLabel, DateSegInput } from "@/components/create/Common";

type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

const TIME_OPTIONS: { id: TimeOfDay; label: string; subtitle: string; icon: string; color: string }[] = [
  { id: "morning",   label: "Morning",   subtitle: "6 – 12 AM", icon: "sunrise", color: "#F97316" },
  { id: "afternoon", label: "Afternoon", subtitle: "12 – 5 PM", icon: "sun",     color: "#FBBF24" },
  { id: "evening",   label: "Evening",   subtitle: "5 – 9 PM",  icon: "sunset",  color: "#A855F7" },
  { id: "night",     label: "Night",     subtitle: "9 PM+",     icon: "moon",    color: "#3B82F6" },
];

const ROUTINE_ICONS = [
  "zap", "sunrise", "sun", "moon", "star", "target", "activity",
  "coffee", "book-open", "heart", "award", "wind", "music",
];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function CreateRoutineScreen() {
  const colors  = useColors();
  const font    = useFont();
  const insets  = useSafeAreaInsets();
  
  const { habits, routines } = useHabitsState();
  const { addRoutine, updateRoutine } = useHabitsActions();
  
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();
  const isEditMode = !!routineId;

  // --- State ---
  const [name,        setName       ] = useState("");
  const [timeOfDay,   setTimeOfDay  ] = useState<TimeOfDay>("morning");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [catFilter,   setCatFilter  ] = useState<"all" | HabitCategory>("all");
  const [routineIcon, setRoutineIcon] = useState("zap");
  const [showIcons,   setShowIcons  ] = useState(false);

  const [startDate, setStartDate] = useState(todayStr());
  const [endDate,   setEndDate  ] = useState<string | undefined>(undefined);
  
  const [endDateStr] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  });

  const [notifEnabled,    setNotifEnabled   ] = useState(false);
  const [reminderHH,      setReminderHH     ] = useState("07");
  const [reminderMM,      setReminderMM     ] = useState("00");
  const [notifRecurrence, setNotifRecurrence ] = useState<NotifRecurrence>("once");
  const [customIntervalH, setCustomIntervalH ] = useState("4");
  const [customIntervalM, setCustomIntervalM ] = useState("0");

  // --- Effects ---
  useEffect(() => {
    if (!isEditMode || !routineId) return;
    const existing = routines.find((r) => r.id === routineId);
    if (!existing) return;
    setName(existing.name);
    setTimeOfDay(existing.timeOfDay as TimeOfDay);
    setSelectedIds(existing.habitIds);
    if (existing.startDate) setStartDate(existing.startDate);
    if (existing.endDate) setEndDate(existing.endDate);
    if (existing.reminderTime) {
      setNotifEnabled(true);
      const [hh, mm] = existing.reminderTime.split(":");
      setReminderHH(hh ?? "07");
      setReminderMM(mm ?? "00");
    }
    if (existing.notificationRecurrence) setNotifRecurrence(existing.notificationRecurrence as NotifRecurrence);
    if (existing.customNotifIntervalHours) setCustomIntervalH(String(existing.customNotifIntervalHours));
    if (existing.customNotifIntervalMinutes) setCustomIntervalM(String(existing.customNotifIntervalMinutes));
  }, [isEditMode, routineId, routines]);

  // --- Derived ---
  const reminderTime = useMemo(() => 
    `${reminderHH.padStart(2, "0")}:${reminderMM.padStart(2, "0")}`,
    [reminderHH, reminderMM]
  );

  const activeHabits = useMemo(() => habits.filter(h => !h.archived), [habits]);

  const selectedHabits = useMemo(() =>
    selectedIds.map(id => activeHabits.find(h => h.id === id)).filter(Boolean) as typeof activeHabits,
    [selectedIds, activeHabits]
  );

  const chosenTime = TIME_OPTIONS.find(t => t.id === timeOfDay)!;

  // --- Handlers ---
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onEnd((event) => {
      if (Math.abs(event.translationX) > 50) {
        if (Platform.OS !== "web") runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
        runOnJS(router.replace)("/create" as any);
      }
    });

  function toggleHabit(id: string) {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
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

    if (notifEnabled) {
      await notificationService.schedule({
        id: `routine_${name.trim()}`,
        name: name.trim(),
        reminderTime,
        recurrence: notifRecurrence,
        customIntervalH: parseInt(customIntervalH),
        customIntervalM: parseInt(customIntervalM),
      });
    }

    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      <RoutineHeader 
        onBack={() => router.back()} 
        onSave={handleCreate} 
        isEditMode={isEditMode} 
        accentColor={chosenTime.color}
        gesture={swipeGesture}
      />

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

      <SectionLabel iconName="clock" title="Time of Day" />
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

      <SectionLabel iconName="list" title={`Habits (${selectedIds.length} selected)`} />
      <HabitSelectionList 
        habits={activeHabits} 
        selectedIds={selectedIds} 
        onToggle={toggleHabit} 
        catFilter={catFilter} 
        onFilterChange={setCatFilter} 
      />

      {selectedIds.length > 1 && (
        <>
          <SectionLabel iconName="layers" title="Flow Order · drag to arrange" />
          <FlowOrderList 
            selectedHabits={selectedHabits} 
            onReorder={setSelectedIds}
            accentColor={chosenTime.color} 
          />
        </>
      )}

      <SectionLabel iconName="calendar" title="Schedule" />
      <View style={[styles.scheduleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.dateRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
          <Text style={[styles.dateRowLabel, { color: colors.mutedForeground, fontFamily: font.medium }]}>Start</Text>
          <View style={styles.dateRowRight}>
            <DateSegInput value={startDate} onChange={setStartDate} colors={colors} />
            <TouchableOpacity onPress={() => setStartDate(todayStr())} style={[styles.dateTagBtn, { backgroundColor: chosenTime.color + "18" }]}>
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
                <TouchableOpacity onPress={() => setEndDate(undefined)} style={[styles.dateTagBtn, { backgroundColor: colors.destructive + "18" }]}>
                  <Text style={[styles.dateTagText, { color: colors.destructive, fontFamily: font.medium }]}>Clear</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.foreverText, { color: colors.mutedForeground, fontFamily: font.regular }]}>Forever</Text>
                <TouchableOpacity onPress={() => setEndDate(endDateStr)} style={[styles.dateTagBtn, { backgroundColor: chosenTime.color + "18" }]}>
                  <Text style={[styles.dateTagText, { color: chosenTime.color, fontFamily: font.medium }]}>Pick Date</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>

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
        accentColor={chosenTime.color} 
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  card: { borderRadius: 18, padding: 16, borderWidth: 1 },
  identityRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  nameInput: { flex: 1, fontSize: 18, paddingVertical: 4, borderBottomWidth: 1 },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 },
  iconOption: { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  timeCard: { flex: 1, minWidth: "45%", borderRadius: 16, padding: 12, gap: 8 },
  timeIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  timeLabel: { fontSize: 14 },
  timeSub: { fontSize: 11 },
  scheduleCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  dateRowLabel: { fontSize: 13, width: 40 },
  dateRowRight: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  dateTagBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  dateTagText: { fontSize: 12 },
  foreverText: { fontSize: 14, flex: 1 },
});
