import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useFont } from "@/hooks/useFont";
import {
  PILLAR_COLORS,
  type Habit,
  type CalendarEvent,
  type RecurrenceType,
  eventOccursOnDate,
} from "@/context/HabitsContext";

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");
const SHEET_H = SCREEN_H * 0.92;

const START_HOUR = 5;
const END_HOUR = 23;
const HOUR_H_DAY = 68;
const HOUR_H_WEEK = 52;
const TOTAL_H_DAY = (END_HOUR - START_HOUR) * HOUR_H_DAY;
const TOTAL_H_WEEK = (END_HOUR - START_HOUR) * HOUR_H_WEEK;
const TIME_COL_W = 46;
const DAY_COL_W = Math.floor((SCREEN_W - 32 - TIME_COL_W) / 7);

const CATEGORY_BASE: Record<string, number> = {
  physical: 7, mental: 8, academics: 10, creativity: 14, chores: 18,
};

const MONTH_NAMES = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];
const DAY_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAY_FULL  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAY_MIN   = ["S","M","T","W","T","F","S"];

const EVENT_COLORS = [
  "#3B82F6","#8B5CF6","#EC4899","#EF4444","#F97316",
  "#EAB308","#22C55E","#14B8A6","#06B6D4","#64748B",
];

const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  none: "Does not repeat",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  annually: "Annually",
  custom: "Custom (days of week)",
};

const REMINDER_OPTIONS = [
  { label: "5 min before", minutes: 5 },
  { label: "10 min before", minutes: 10 },
  { label: "15 min before", minutes: 15 },
  { label: "30 min before", minutes: 30 },
  { label: "1 hour before", minutes: 60 },
  { label: "1 day before", minutes: 1440 },
];

type ViewMode = "day" | "week" | "month";

function fmtHour(h: number): string {
  if (h === 0 || h === 24) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function habitHour(h: Habit, idxInCat: number): number {
  if (h.reminderTime) {
    const hh = parseInt(h.reminderTime.split(":")[0], 10);
    return Math.max(START_HOUR, Math.min(END_HOUR - 1, hh));
  }
  const base = CATEGORY_BASE[h.category] ?? 9;
  return Math.min(base + idxInCat, END_HOUR - 1);
}

function ds(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const mn = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mn).padStart(2, "0")}`;
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

interface BlankEvent {
  title: string;
  description: string;
  location: string;
  type: "event" | "task";
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  color: string;
  recurrence: RecurrenceType;
  recurrenceInterval: string;
  recurrenceDays: number[];
  recurrenceEndDate: string;
  reminders: number[];
}

function blankForm(date: string): BlankEvent {
  return {
    title: "",
    description: "",
    location: "",
    type: "event",
    date,
    startTime: "09:00",
    endTime: "10:00",
    allDay: false,
    color: EVENT_COLORS[0],
    recurrence: "none",
    recurrenceInterval: "1",
    recurrenceDays: [],
    recurrenceEndDate: "",
    reminders: [],
  };
}

interface Props {
  visible: boolean;
  onClose: () => void;
  habits: Habit[];
  selectedDate: string;
  calendarEvents: CalendarEvent[];
  onAddEvent: (ev: Omit<CalendarEvent, "id" | "createdAt">) => string;
  onUpdateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  onDeleteEvent: (id: string) => void;
  onToggleComplete: (id: string) => void;
}

export function PrecisionTimeline({
  visible, onClose, habits, selectedDate,
  calendarEvents, onAddEvent, onUpdateEvent, onDeleteEvent, onToggleComplete,
}: Props) {
  const colors = useColors();
  const font   = useFont();
  const insets = useSafeAreaInsets();

  const [mounted, setMounted]           = useState(false);
  const [viewMode, setViewMode]         = useState<ViewMode>("day");
  const [weekStart, setWeekStart]       = useState(() => getWeekStart(new Date(selectedDate + "T12:00:00")));
  const [monthDate, setMonthDate]       = useState(() => {
    const d = new Date(selectedDate + "T12:00:00");
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [formVisible, setFormVisible]   = useState(false);
  const [form, setForm]                 = useState<BlankEvent>(() => blankForm(selectedDate));
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [detailEvent, setDetailEvent]   = useState<CalendarEvent | null>(null);
  const [showRecurrencePicker, setShowRecurrencePicker] = useState(false);
  const [showColorPicker, setShowColorPicker]           = useState(false);

  const slideY    = useSharedValue(SCREEN_H);
  const bgOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      slideY.value    = withSpring(0, { damping: 24, stiffness: 200, mass: 1 });
      bgOpacity.value = withTiming(1, { duration: 260 });
    } else {
      slideY.value    = withSpring(SCREEN_H, { damping: 24, stiffness: 200 });
      bgOpacity.value = withTiming(0, { duration: 200 });
      const t = setTimeout(() => setMounted(false), 380);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const sheetAnim   = useAnimatedStyle(() => ({ transform: [{ translateY: slideY.value }] }));
  const overlayAnim = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));

  const now      = new Date();
  const nowTodayStr = now.toISOString().split("T")[0];
  const nowH     = now.getHours();
  const nowM     = now.getMinutes();
  const isToday  = selectedDate === nowTodayStr;

  const habitHourMap = useMemo(() => {
    const map: Record<string, number> = {};
    const ci: Record<string, number> = {};
    habits.forEach(h => {
      const i = ci[h.category] ?? 0;
      ci[h.category] = i + 1;
      map[h.id] = habitHour(h, i);
    });
    return map;
  }, [habits]);

  function openCreate(date?: string) {
    setEditingId(null);
    setForm(blankForm(date ?? selectedDate));
    setFormVisible(true);
  }

  function openEdit(ev: CalendarEvent) {
    setDetailEvent(null);
    setEditingId(ev.id);
    setForm({
      title: ev.title,
      description: ev.description ?? "",
      location: ev.location ?? "",
      type: ev.type,
      date: ev.date,
      startTime: ev.startTime,
      endTime: ev.endTime,
      allDay: ev.allDay,
      color: ev.color,
      recurrence: ev.recurrence,
      recurrenceInterval: String(ev.recurrenceInterval ?? 1),
      recurrenceDays: ev.recurrenceDays ?? [],
      recurrenceEndDate: ev.recurrenceEndDate ?? "",
      reminders: ev.reminders.map(r => r.minutesBefore),
    });
    setFormVisible(true);
  }

  function saveForm() {
    if (!form.title.trim()) {
      Alert.alert("Title required", "Please enter a title for your event.");
      return;
    }
    const payload: Omit<CalendarEvent, "id" | "createdAt"> = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      location: form.location.trim() || undefined,
      type: form.type,
      date: form.date || selectedDate,
      startTime: form.startTime,
      endTime: form.endTime,
      allDay: form.allDay,
      color: form.color,
      recurrence: form.recurrence,
      recurrenceInterval: parseInt(form.recurrenceInterval) || 1,
      recurrenceDays: form.recurrenceDays,
      recurrenceEndDate: form.recurrenceEndDate || undefined,
      reminders: form.reminders.map(m => ({ minutesBefore: m })),
      completed: false,
    };
    if (editingId) {
      onUpdateEvent(editingId, payload);
    } else {
      onAddEvent(payload);
    }
    setFormVisible(false);
    setEditingId(null);
  }

  function confirmDelete(id: string) {
    Alert.alert("Delete", "Delete this event?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => {
        onDeleteEvent(id);
        setDetailEvent(null);
      }},
    ]);
  }

  function getEventsForDate(date: string): CalendarEvent[] {
    return calendarEvents.filter(ev => eventOccursOnDate(ev, date));
  }

  // ─── EVENT FORM MODAL ────────────────────────────────────────────────────
  function renderForm() {
    return (
      <Modal visible={formVisible} transparent animationType="slide" onRequestClose={() => setFormVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={[styles.formOverlay]}>
            <View style={[styles.formSheet, { backgroundColor: colors.background, borderColor: colors.glassBorder }]}>
              {/* Form header */}
              <View style={[styles.formHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setFormVisible(false)} style={[styles.formBtn, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.formBtnTxt, { color: colors.mutedForeground, fontFamily: font.regular }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.formTitle, { color: colors.foreground, fontFamily: font.bold }]}>
                  {editingId ? "Edit" : "New"} {form.type === "task" ? "Task" : "Event"}
                </Text>
                <TouchableOpacity onPress={saveForm} style={[styles.formBtn, { backgroundColor: form.color }]}>
                  <Text style={[styles.formBtnTxt, { color: "#fff", fontFamily: font.semibold }]}>Save</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Type toggle */}
                <View style={[styles.typeRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  {(["event", "task"] as const).map(t => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setForm(f => ({ ...f, type: t }))}
                      style={[styles.typeBtn, form.type === t && { backgroundColor: form.color }]}
                    >
                      <Feather name={t === "event" ? "calendar" : "check-square"} size={13} color={form.type === t ? "#fff" : colors.mutedForeground} />
                      <Text style={[styles.typeTxt, { color: form.type === t ? "#fff" : colors.mutedForeground, fontFamily: form.type === t ? font.semibold : font.regular }]}>
                        {t === "event" ? "Event" : "Task"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Title */}
                <TextInput
                  value={form.title}
                  onChangeText={t => setForm(f => ({ ...f, title: t }))}
                  placeholder="Title"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card, fontFamily: font.medium }]}
                />

                {/* Date */}
                <View style={styles.fieldRow}>
                  <Feather name="calendar" size={15} color={colors.mutedForeground} style={{ marginTop: 2 }} />
                  <TextInput
                    value={form.date}
                    onChangeText={t => setForm(f => ({ ...f, date: t }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.inlineInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card, fontFamily: font.regular }]}
                  />
                </View>

                {/* All Day toggle */}
                <View style={[styles.rowBetween, { paddingHorizontal: 4 }]}>
                  <View style={styles.rowLeft}>
                    <Feather name="sun" size={15} color={colors.mutedForeground} />
                    <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: font.regular }]}>All Day</Text>
                  </View>
                  <Switch
                    value={form.allDay}
                    onValueChange={v => setForm(f => ({ ...f, allDay: v }))}
                    thumbColor={form.allDay ? form.color : colors.mutedForeground}
                    trackColor={{ false: colors.border, true: form.color + "55" }}
                  />
                </View>

                {/* Start / End time */}
                {!form.allDay && (
                  <View style={styles.timeRow}>
                    <View style={styles.timeField}>
                      <Text style={[styles.timeLabel, { color: colors.mutedForeground, fontFamily: font.regular }]}>Start</Text>
                      <TextInput
                        value={form.startTime}
                        onChangeText={t => setForm(f => ({ ...f, startTime: t }))}
                        placeholder="09:00"
                        placeholderTextColor={colors.mutedForeground}
                        keyboardType="numeric"
                        style={[styles.timeInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card, fontFamily: font.medium }]}
                      />
                    </View>
                    <Feather name="arrow-right" size={14} color={colors.mutedForeground} style={{ marginTop: 18 }} />
                    <View style={styles.timeField}>
                      <Text style={[styles.timeLabel, { color: colors.mutedForeground, fontFamily: font.regular }]}>End</Text>
                      <TextInput
                        value={form.endTime}
                        onChangeText={t => setForm(f => ({ ...f, endTime: t }))}
                        placeholder="10:00"
                        placeholderTextColor={colors.mutedForeground}
                        keyboardType="numeric"
                        style={[styles.timeInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card, fontFamily: font.medium }]}
                      />
                    </View>
                  </View>
                )}

                {/* Color */}
                <View style={styles.fieldRow}>
                  <Feather name="circle" size={15} color={form.color} style={{ marginTop: 2 }} />
                  <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: font.regular }]}>Color</Text>
                  <TouchableOpacity
                    onPress={() => setShowColorPicker(v => !v)}
                    style={[styles.colorSwatch, { backgroundColor: form.color, marginLeft: "auto" }]}
                  />
                </View>
                {showColorPicker && (
                  <View style={styles.colorGrid}>
                    {EVENT_COLORS.map(c => (
                      <TouchableOpacity
                        key={c}
                        onPress={() => { setForm(f => ({ ...f, color: c })); setShowColorPicker(false); }}
                        style={[styles.colorCircle, { backgroundColor: c, borderWidth: form.color === c ? 2 : 0, borderColor: "#fff" }]}
                      />
                    ))}
                  </View>
                )}

                {/* Recurrence */}
                <TouchableOpacity
                  onPress={() => setShowRecurrencePicker(v => !v)}
                  style={[styles.fieldRow, styles.selectRow, { borderColor: colors.border, backgroundColor: colors.card }]}
                >
                  <Feather name="repeat" size={15} color={colors.mutedForeground} />
                  <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: font.regular, flex: 1 }]}>
                    {RECURRENCE_LABELS[form.recurrence]}
                  </Text>
                  <Feather name={showRecurrencePicker ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
                </TouchableOpacity>
                {showRecurrencePicker && (
                  <View style={[styles.pickerList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {(Object.keys(RECURRENCE_LABELS) as RecurrenceType[]).map(r => (
                      <TouchableOpacity
                        key={r}
                        onPress={() => { setForm(f => ({ ...f, recurrence: r })); setShowRecurrencePicker(false); }}
                        style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                      >
                        <Text style={[styles.pickerTxt, { color: form.recurrence === r ? form.color : colors.foreground, fontFamily: form.recurrence === r ? font.semibold : font.regular }]}>
                          {RECURRENCE_LABELS[r]}
                        </Text>
                        {form.recurrence === r && <Feather name="check" size={13} color={form.color} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Custom days of week picker */}
                {form.recurrence === "custom" && (
                  <View style={styles.daysRow}>
                    {DAY_FULL.map((d, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => {
                          setForm(f => ({
                            ...f,
                            recurrenceDays: f.recurrenceDays.includes(i)
                              ? f.recurrenceDays.filter(x => x !== i)
                              : [...f.recurrenceDays, i],
                          }));
                        }}
                        style={[styles.dayChip, {
                          backgroundColor: form.recurrenceDays.includes(i) ? form.color : colors.secondary,
                          borderColor: form.recurrenceDays.includes(i) ? form.color : colors.border,
                        }]}
                      >
                        <Text style={[styles.dayChipTxt, { color: form.recurrenceDays.includes(i) ? "#fff" : colors.mutedForeground, fontFamily: font.medium }]}>
                          {DAY_SHORT[i].substring(0, 1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Recurrence end date */}
                {form.recurrence !== "none" && (
                  <View style={styles.fieldRow}>
                    <Feather name="calendar" size={15} color={colors.mutedForeground} />
                    <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: font.regular }]}>End date</Text>
                    <TextInput
                      value={form.recurrenceEndDate}
                      onChangeText={t => setForm(f => ({ ...f, recurrenceEndDate: t }))}
                      placeholder="YYYY-MM-DD (optional)"
                      placeholderTextColor={colors.mutedForeground}
                      style={[styles.inlineInputSm, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card, fontFamily: font.regular }]}
                    />
                  </View>
                )}

                {/* Reminders */}
                <View>
                  <View style={styles.rowLeft}>
                    <Feather name="bell" size={15} color={colors.mutedForeground} />
                    <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: font.regular, marginLeft: 8 }]}>Reminders</Text>
                  </View>
                  <View style={styles.reminderRow}>
                    {REMINDER_OPTIONS.map(opt => {
                      const active = form.reminders.includes(opt.minutes);
                      return (
                        <TouchableOpacity
                          key={opt.minutes}
                          onPress={() => {
                            setForm(f => ({
                              ...f,
                              reminders: active
                                ? f.reminders.filter(m => m !== opt.minutes)
                                : [...f.reminders, opt.minutes],
                            }));
                          }}
                          style={[styles.reminderChip, {
                            backgroundColor: active ? form.color : colors.secondary,
                            borderColor: active ? form.color : colors.border,
                          }]}
                        >
                          <Text style={[styles.reminderTxt, { color: active ? "#fff" : colors.mutedForeground, fontFamily: font.medium }]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Description */}
                <View style={styles.fieldCol}>
                  <View style={styles.rowLeft}>
                    <Feather name="align-left" size={15} color={colors.mutedForeground} />
                    <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: font.regular, marginLeft: 8 }]}>Description</Text>
                  </View>
                  <TextInput
                    value={form.description}
                    onChangeText={t => setForm(f => ({ ...f, description: t }))}
                    placeholder="Add notes, agenda, or links..."
                    placeholderTextColor={colors.mutedForeground}
                    multiline
                    numberOfLines={3}
                    style={[styles.textarea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card, fontFamily: font.regular }]}
                  />
                </View>

                {/* Location */}
                <View style={styles.fieldRow}>
                  <Feather name="map-pin" size={15} color={colors.mutedForeground} />
                  <TextInput
                    value={form.location}
                    onChangeText={t => setForm(f => ({ ...f, location: t }))}
                    placeholder="Add location..."
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.inlineInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card, fontFamily: font.regular }]}
                  />
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  // ─── EVENT DETAIL MODAL ──────────────────────────────────────────────────
  function renderDetail() {
    if (!detailEvent) return null;
    const ev = detailEvent;
    return (
      <Modal visible={!!detailEvent} transparent animationType="fade" onRequestClose={() => setDetailEvent(null)}>
        <TouchableOpacity style={styles.detailOverlay} activeOpacity={1} onPress={() => setDetailEvent(null)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={[styles.detailCard, { backgroundColor: colors.background, borderColor: colors.glassBorder }]}>
              {/* Color strip */}
              <View style={[styles.detailStrip, { backgroundColor: ev.color }]} />
              <View style={{ padding: 16, gap: 10 }}>
                {/* Header row */}
                <View style={styles.rowBetween}>
                  <View style={styles.rowLeft}>
                    <View style={[styles.detailTypeTag, { backgroundColor: ev.color + "22" }]}>
                      <Feather name={ev.type === "task" ? "check-square" : "calendar"} size={11} color={ev.color} />
                      <Text style={[styles.detailTypeTxt, { color: ev.color, fontFamily: font.semibold }]}>
                        {ev.type === "task" ? "Task" : "Event"}
                      </Text>
                    </View>
                    {ev.recurrence !== "none" && (
                      <View style={[styles.detailTypeTag, { backgroundColor: colors.secondary }]}>
                        <Feather name="repeat" size={11} color={colors.mutedForeground} />
                        <Text style={[styles.detailTypeTxt, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                          {RECURRENCE_LABELS[ev.recurrence]}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.rowLeft}>
                    <TouchableOpacity onPress={() => openEdit(ev)} style={[styles.iconBtn, { backgroundColor: colors.secondary }]}>
                      <Feather name="edit-2" size={14} color={colors.mutedForeground} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDelete(ev.id)} style={[styles.iconBtn, { backgroundColor: colors.secondary }]}>
                      <Feather name="trash-2" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Title + complete toggle for tasks */}
                <View style={styles.rowBetween}>
                  <Text style={[styles.detailTitle, { color: colors.foreground, fontFamily: font.bold,
                    textDecorationLine: ev.type === "task" && ev.completed ? "line-through" : "none",
                    opacity: ev.type === "task" && ev.completed ? 0.55 : 1,
                  }]}>{ev.title}</Text>
                  {ev.type === "task" && (
                    <TouchableOpacity
                      onPress={() => {
                        onToggleComplete(ev.id);
                        setDetailEvent({ ...ev, completed: !ev.completed });
                      }}
                      style={[styles.checkBtn, {
                        backgroundColor: ev.completed ? ev.color : "transparent",
                        borderColor: ev.color,
                      }]}
                    >
                      {ev.completed && <Feather name="check" size={12} color="#fff" />}
                    </TouchableOpacity>
                  )}
                </View>

                {/* Time */}
                <View style={styles.rowLeft}>
                  <Feather name="clock" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.detailMeta, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                    {ev.allDay ? "All day" : `${ev.startTime} – ${ev.endTime}`}
                    {" · "}{new Date(ev.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </Text>
                </View>

                {/* Location */}
                {ev.location && (
                  <View style={styles.rowLeft}>
                    <Feather name="map-pin" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.detailMeta, { color: colors.mutedForeground, fontFamily: font.regular }]}>{ev.location}</Text>
                  </View>
                )}

                {/* Description */}
                {ev.description && (
                  <View style={[styles.descBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                    <Feather name="align-left" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.detailDesc, { color: colors.foreground, fontFamily: font.regular }]}>{ev.description}</Text>
                  </View>
                )}

                {/* Reminders */}
                {ev.reminders.length > 0 && (
                  <View style={styles.rowLeft}>
                    <Feather name="bell" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.detailMeta, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                      {ev.reminders.map(r => {
                        const opt = REMINDER_OPTIONS.find(o => o.minutesBefore === r.minutesBefore);
                        return opt?.label ?? `${r.minutesBefore}m`;
                      }).join(", ")}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  }

  // ─── DAY VIEW ────────────────────────────────────────────────────────────
  function renderDayView() {
    const eventsToday = getEventsForDate(selectedDate);
    const allDayEvs   = eventsToday.filter(e => e.allDay);
    const timedEvs    = eventsToday.filter(e => !e.allDay);
    const byHour: Record<number, Habit[]> = {};
    habits.forEach(h => {
      const hr = habitHourMap[h.id];
      (byHour[hr] = byHour[hr] ?? []).push(h);
    });
    const nowY   = (nowH - START_HOUR + nowM / 60) * HOUR_H_DAY;
    const done   = habits.filter(h => h.completions.find(c => c.date === selectedDate && c.completed)).length;
    const pending = habits.length - done;
    const dateLabel = new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

    return (
      <>
        {/* Stats row */}
        <View style={[styles.statsRow, { borderColor: colors.border }]}>
          {[
            { label: "Habits",   value: habits.length,          color: colors.foreground },
            { label: "Done",     value: done,                   color: colors.success },
            { label: "Pending",  value: pending,                color: colors.warning },
            { label: "Events",   value: eventsToday.length,     color: colors.primary },
          ].map(s => (
            <View key={s.label} style={styles.stat}>
              <Text style={[styles.statVal, { color: s.color, fontFamily: font.bold }]}>{s.value}</Text>
              <Text style={[styles.statLbl, { color: colors.mutedForeground, fontFamily: font.regular }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.viewSubtitle, { color: colors.mutedForeground, fontFamily: font.regular }]}>{dateLabel}</Text>

        {/* All-day events banner */}
        {allDayEvs.length > 0 && (
          <View style={[styles.allDayBanner, { borderBottomColor: colors.border, backgroundColor: colors.secondary + "66" }]}>
            <Text style={[styles.allDayLabel, { color: colors.mutedForeground, fontFamily: font.medium }]}>ALL DAY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 8 }}>
              {allDayEvs.map(ev => (
                <TouchableOpacity
                  key={ev.id}
                  onPress={() => setDetailEvent(ev)}
                  style={[styles.allDayChip, { backgroundColor: ev.color + "22", borderColor: ev.color + "66" }]}
                >
                  <View style={[styles.allDayDot, { backgroundColor: ev.color }]} />
                  <Text style={[styles.allDayTitle, { color: ev.color, fontFamily: font.semibold }]} numberOfLines={1}>{ev.title}</Text>
                  {ev.type === "task" && ev.completed && <Feather name="check-circle" size={11} color={ev.color} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 }]} showsVerticalScrollIndicator={false}>
          <View style={[styles.timelineWrap, { height: TOTAL_H_DAY + 48 }]}>
            {/* Hour rows + habit pills */}
            {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => {
              const h = START_HOUR + i;
              const isNowHour = isToday && h === nowH;
              const habitsHere = byHour[h] ?? [];
              const isMajor = h % 3 === 0;
              return (
                <View key={h} style={[styles.hourRow, {
                  top: i * HOUR_H_DAY, height: HOUR_H_DAY,
                  borderTopColor: isNowHour ? colors.primary + "35" : isMajor ? colors.border + "BB" : colors.border + "44",
                  borderTopWidth: isMajor ? 0.8 : 0.5,
                }]}>
                  <Text style={[styles.hourLabel, {
                    color: isNowHour ? colors.primary : isMajor ? colors.mutedForeground : colors.mutedForeground + "66",
                    fontFamily: isNowHour ? font.bold : font.regular,
                    fontSize: isMajor ? 10 : 9,
                  }]}>{fmtHour(h)}</Text>
                  {habitsHere.length > 0 && (
                    <View style={styles.pillsRow}>
                      {habitsHere.map(habit => {
                        const isDone = !!habit.completions.find(c => c.date === selectedDate && c.completed);
                        const c = PILLAR_COLORS[habit.category];
                        return (
                          <View key={habit.id} style={[styles.pill, {
                            backgroundColor: isDone ? c + "1E" : colors.card,
                            borderColor: isDone ? c + "60" : colors.glassBorder,
                          }]}>
                            <View style={[styles.pillDot, { backgroundColor: c, opacity: isDone ? 1 : 0.5 }]} />
                            <Text style={[styles.pillName, {
                              color: isDone ? c : colors.foreground, fontFamily: font.medium,
                              textDecorationLine: isDone ? "line-through" : "none", opacity: isDone ? 0.75 : 1,
                            }]} numberOfLines={1}>{habit.name}</Text>
                            {habit.streak > 0 && (
                              <View style={styles.pillStreak}>
                                <Feather name="zap" size={8} color={colors.warning} />
                                <Text style={[styles.pillStreakNum, { color: colors.warning, fontFamily: font.bold }]}>{habit.streak}</Text>
                              </View>
                            )}
                            {isDone && <Feather name="check-circle" size={11} color={c} />}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}

            {/* Timed event blocks */}
            {timedEvs.map(ev => {
              const startMin = timeToMinutes(ev.startTime);
              const endMin   = Math.max(timeToMinutes(ev.endTime), startMin + 30);
              const topPx    = Math.max(0, (startMin / 60 - START_HOUR)) * HOUR_H_DAY;
              const heightPx = Math.max(20, ((endMin - startMin) / 60) * HOUR_H_DAY - 2);
              const isTask   = ev.type === "task";
              return (
                <TouchableOpacity
                  key={ev.id}
                  onPress={() => setDetailEvent(ev)}
                  style={[styles.eventBlock, {
                    top: topPx, height: heightPx,
                    backgroundColor: ev.color + "22",
                    borderColor: ev.color + "88",
                    borderLeftColor: ev.color,
                    opacity: isTask && ev.completed ? 0.5 : 1,
                  }]}
                  activeOpacity={0.8}
                >
                  <View style={styles.eventBlockInner}>
                    <Text style={[styles.eventBlockTitle, { color: ev.color, fontFamily: font.semibold,
                      textDecorationLine: isTask && ev.completed ? "line-through" : "none",
                    }]} numberOfLines={1}>{ev.title}</Text>
                    {heightPx > 32 && (
                      <Text style={[styles.eventBlockTime, { color: ev.color + "BB", fontFamily: font.regular }]}>
                        {ev.startTime} – {ev.endTime}
                      </Text>
                    )}
                    {heightPx > 50 && ev.location && (
                      <View style={styles.rowLeft}>
                        <Feather name="map-pin" size={9} color={ev.color + "BB"} />
                        <Text style={[styles.eventBlockMeta, { color: ev.color + "BB", fontFamily: font.regular }]} numberOfLines={1}>{ev.location}</Text>
                      </View>
                    )}
                  </View>
                  {isTask && (
                    <View style={[styles.taskDot, { backgroundColor: ev.completed ? ev.color : "transparent", borderColor: ev.color }]}>
                      {ev.completed && <Feather name="check" size={8} color="#fff" />}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Now indicator */}
            {isToday && nowH >= START_HOUR && nowH < END_HOUR && (
              <View style={[styles.nowWrap, { top: nowY }]} pointerEvents="none">
                <View style={[styles.nowDot, { backgroundColor: colors.primary }]} />
                <View style={[styles.nowGlow, { backgroundColor: colors.primary + "28" }]} />
                <View style={[styles.nowLine, { backgroundColor: colors.primary }]} />
                <View style={[styles.nowBadge, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.nowText, { fontFamily: font.bold }]}>NOW</Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </>
    );
  }

  // ─── WEEK VIEW ────────────────────────────────────────────────────────────
  function renderWeekView() {
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
    const weekRange = `${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

    const dayHourMap: Record<string, Record<number, Habit[]>> = {};
    weekDays.forEach(d => { dayHourMap[ds(d)] = {}; });
    habits.forEach(h => {
      const hr = habitHourMap[h.id];
      weekDays.forEach(d => {
        const dStr = ds(d);
        (dayHourMap[dStr][hr] = dayHourMap[dStr][hr] ?? []).push(h);
      });
    });
    const nowY = (nowH - START_HOUR + nowM / 60) * HOUR_H_WEEK;

    return (
      <>
        <View style={[styles.navRow, { borderColor: colors.border }]}>
          <TouchableOpacity onPress={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }} style={styles.navBtn}>
            <Feather name="chevron-left" size={18} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.navLabel, { color: colors.foreground, fontFamily: font.semibold }]}>{weekRange}</Text>
          <TouchableOpacity onPress={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }} style={styles.navBtn}>
            <Feather name="chevron-right" size={18} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View style={[styles.weekHeaderRow, { borderBottomColor: colors.border }]}>
          <View style={{ width: TIME_COL_W }} />
          {weekDays.map((d, i) => {
            const dStr = ds(d);
            const isT  = dStr === nowTodayStr;
            const done  = habits.filter(h => h.completions.find(c => c.date === dStr && c.completed)).length;
            const total = habits.length;
            const evCount = getEventsForDate(dStr).length;
            return (
              <View key={i} style={[styles.weekDayHeader, { width: DAY_COL_W, borderLeftColor: colors.border }]}>
                <Text style={[styles.weekDayName, { color: isT ? colors.primary : colors.mutedForeground, fontFamily: font.medium }]}>
                  {DAY_SHORT[d.getDay()].substring(0, 1)}
                </Text>
                <View style={[styles.weekDayNum, isT && { backgroundColor: colors.primary }]}>
                  <Text style={[styles.weekDayNumTxt, { color: isT ? colors.background : colors.foreground, fontFamily: font.bold }]}>
                    {d.getDate()}
                  </Text>
                </View>
                {total > 0 && (
                  <Text style={[styles.weekDayRate, { color: done === total ? colors.success : colors.mutedForeground, fontFamily: font.regular }]}>
                    {done}/{total}
                  </Text>
                )}
                {evCount > 0 && (
                  <View style={[styles.weekEvDot, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.weekEvCount, { color: "#fff", fontFamily: font.bold }]}>{evCount}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          <View style={{ height: TOTAL_H_WEEK + 48, position: "relative" }}>
            {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => {
              const h = START_HOUR + i;
              const isMajor = h % 2 === 0;
              return (
                <View key={h} style={[styles.weekHourRow, {
                  top: i * HOUR_H_WEEK, height: HOUR_H_WEEK,
                  borderTopColor: isMajor ? colors.border + "99" : colors.border + "33",
                  borderTopWidth: isMajor ? 0.7 : 0.4,
                }]}>
                  <Text style={[styles.weekHourLabel, {
                    color: isMajor ? colors.mutedForeground : colors.mutedForeground + "55",
                    fontFamily: font.regular, width: TIME_COL_W,
                  }]}>{isMajor ? fmtHour(h) : ""}</Text>
                  {weekDays.map((d, di) => {
                    const dStr = ds(d);
                    const habitsHere = dayHourMap[dStr]?.[h] ?? [];
                    const timedEvs = getEventsForDate(dStr).filter(e => !e.allDay && parseInt(e.startTime.split(":")[0]) === h);
                    const isT = dStr === nowTodayStr;
                    return (
                      <View key={di} style={[styles.weekCell, {
                        width: DAY_COL_W, height: HOUR_H_WEEK,
                        borderLeftColor: isT ? colors.primary + "22" : colors.border + "33",
                        backgroundColor: isT ? colors.primary + "04" : "transparent",
                      }]}>
                        {timedEvs.slice(0, 2).map(ev => (
                          <TouchableOpacity key={ev.id} onPress={() => setDetailEvent(ev)} style={[styles.weekEventBlock, {
                            backgroundColor: ev.color + "33", borderColor: ev.color + "88", borderLeftColor: ev.color,
                          }]}>
                            <Text style={[styles.weekHabitTxt, { color: ev.color, fontFamily: font.semibold }]} numberOfLines={1}>{ev.title}</Text>
                          </TouchableOpacity>
                        ))}
                        {habitsHere.slice(0, 3 - timedEvs.length).map(habit => {
                          const isDone = !!habit.completions.find(c => c.date === dStr && c.completed);
                          const col = PILLAR_COLORS[habit.category];
                          return (
                            <View key={habit.id} style={[styles.weekHabitBlock, {
                              backgroundColor: isDone ? col + "33" : col + "15",
                              borderColor: isDone ? col + "88" : col + "40",
                              borderLeftColor: col,
                            }]}>
                              <Text style={[styles.weekHabitTxt, { color: isDone ? col : colors.mutedForeground, fontFamily: font.medium }]} numberOfLines={1}>
                                {habit.name}
                              </Text>
                            </View>
                          );
                        })}
                        {habitsHere.length + timedEvs.length > 3 && (
                          <Text style={[styles.weekOverflow, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                            +{habitsHere.length + timedEvs.length - 3}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}

            {nowH >= START_HOUR && nowH < END_HOUR && (
              <View style={[styles.weekNowWrap, { top: nowY }]} pointerEvents="none">
                <View style={[styles.nowDot, { backgroundColor: colors.primary, marginLeft: TIME_COL_W - 5 }]} />
                <View style={[styles.nowLine, { backgroundColor: colors.primary, flex: 1 }]} />
              </View>
            )}
          </View>
        </ScrollView>
      </>
    );
  }

  // ─── MONTH VIEW ───────────────────────────────────────────────────────────
  function renderMonthView() {
    const year  = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const cells = buildMonthGrid(year, month);
    const today = now;
    const CELL_W = Math.floor((SCREEN_W - 32) / 7);
    const CELL_H = 62;

    const rateByDay: Record<string, { done: number; total: number }> = {};
    cells.forEach(d => {
      if (!d) return;
      const dStr = ds(d);
      const done  = habits.filter(h => h.completions.find(c => c.date === dStr && c.completed)).length;
      rateByDay[dStr] = { done, total: habits.length };
    });

    return (
      <>
        <View style={[styles.navRow, { borderColor: colors.border }]}>
          <TouchableOpacity onPress={() => setMonthDate(new Date(year, month - 1, 1))} style={styles.navBtn}>
            <Feather name="chevron-left" size={18} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.navLabel, { color: colors.foreground, fontFamily: font.semibold }]}>
            {MONTH_NAMES[month]} {year}
          </Text>
          <TouchableOpacity onPress={() => setMonthDate(new Date(year, month + 1, 1))} style={styles.navBtn}>
            <Feather name="chevron-right" size={18} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View style={styles.monthDoW}>
          {DAY_MIN.map((d, i) => (
            <View key={i} style={{ width: CELL_W, alignItems: "center" }}>
              <Text style={[styles.monthDoWTxt, { color: colors.mutedForeground, fontFamily: font.medium }]}>{d}</Text>
            </View>
          ))}
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
          <View style={styles.monthGrid}>
            {cells.map((d, idx) => {
              if (!d) return <View key={idx} style={{ width: CELL_W, height: CELL_H }} />;
              const dStr = ds(d);
              const isT  = dStr === nowTodayStr;
              const isSel = dStr === selectedDate;
              const { done, total } = rateByDay[dStr] ?? { done: 0, total: 0 };
              const rate = total > 0 ? done / total : -1;
              const barColor = rate >= 1 ? colors.success : rate >= 0.6 ? colors.primary : rate >= 0 ? colors.warning : colors.border;
              const dayEvs = getEventsForDate(dStr);

              return (
                <View key={idx} style={[styles.monthCell, {
                  width: CELL_W, height: CELL_H,
                  backgroundColor: isSel ? colors.primary + "18" : "transparent",
                  borderColor: isSel ? colors.primary + "50" : "transparent",
                  borderWidth: 1, borderRadius: 10,
                }]}>
                  <View style={[styles.monthDateCircle, isT && { backgroundColor: colors.primary }]}>
                    <Text style={[styles.monthDateNum, {
                      color: isT ? colors.background : d.getMonth() !== month ? colors.mutedForeground + "55" : colors.foreground,
                      fontFamily: isT ? font.bold : font.regular,
                    }]}>{d.getDate()}</Text>
                  </View>

                  {/* Habit + event dots */}
                  <View style={styles.monthDots}>
                    {habits.slice(0, 3).map((h, hi) => {
                      const isDone = !!h.completions.find(c => c.date === dStr && c.completed);
                      const col = PILLAR_COLORS[h.category];
                      return <View key={hi} style={[styles.monthDot, { backgroundColor: isDone ? col : col + "30" }]} />;
                    })}
                    {dayEvs.slice(0, 2).map(ev => (
                      <View key={ev.id} style={[styles.monthDot, { backgroundColor: ev.color }]} />
                    ))}
                    {(habits.length + dayEvs.length) > 5 && (
                      <Text style={[styles.monthDotMore, { color: colors.mutedForeground, fontFamily: font.regular }]}>…</Text>
                    )}
                  </View>

                  {/* Event mini-labels */}
                  {dayEvs.slice(0, 1).map(ev => (
                    <TouchableOpacity key={ev.id} onPress={() => setDetailEvent(ev)} style={[styles.monthEvLabel, { backgroundColor: ev.color + "22" }]}>
                      <Text style={[styles.monthEvTxt, { color: ev.color, fontFamily: font.semibold }]} numberOfLines={1}>{ev.title}</Text>
                    </TouchableOpacity>
                  ))}

                  {rate >= 0 && (
                    <View style={[styles.monthBar, { backgroundColor: colors.border }]}>
                      <View style={[styles.monthBarFill, { backgroundColor: barColor, width: `${Math.round(rate * 100)}%` as any }]} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <View style={[styles.monthLegend, { borderTopColor: colors.border }]}>
            {[
              { label: "Perfect", color: colors.success },
              { label: "Good",    color: colors.primary },
              { label: "Partial", color: colors.warning },
              { label: "None",    color: colors.border },
            ].map(l => (
              <View key={l.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                <Text style={[styles.legendTxt, { color: colors.mutedForeground, fontFamily: font.regular }]}>{l.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </>
    );
  }

  if (!mounted) return null;

  const VIEW_TABS: { mode: ViewMode; label: string }[] = [
    { mode: "day",   label: "Day" },
    { mode: "week",  label: "Week" },
    { mode: "month", label: "Month" },
  ];

  return (
    <>
      <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose} statusBarTranslucent>
        <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, overlayAnim]} pointerEvents="box-none">
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        </Animated.View>

        <Animated.View style={[styles.sheet, {
          backgroundColor: colors.background,
          borderColor: colors.glassBorder,
          paddingBottom: insets.bottom + 12,
        }, sheetAnim]}>
          <LinearGradient
            colors={[colors.primary + "0D", "transparent"]}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.2 }}
            style={StyleSheet.absoluteFill} pointerEvents="none"
          />

          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIcon, { backgroundColor: colors.primary + "1A" }]}>
                <Feather name="clock" size={14} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.foreground, fontFamily: font.bold }]}>Timeline</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={() => openCreate()} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
                <Feather name="plus" size={14} color="#fff" />
                <Text style={[styles.addBtnTxt, { fontFamily: font.semibold }]}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.secondary }]}>
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          {/* View mode tabs */}
          <View style={[styles.tabRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            {VIEW_TABS.map(t => (
              <TouchableOpacity
                key={t.mode}
                onPress={() => setViewMode(t.mode)}
                style={[styles.tabBtn, viewMode === t.mode && { backgroundColor: colors.card }]}
                activeOpacity={0.75}
              >
                <Text style={[styles.tabTxt, {
                  color: viewMode === t.mode ? colors.primary : colors.mutedForeground,
                  fontFamily: viewMode === t.mode ? font.semibold : font.regular,
                }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {viewMode === "day"   && renderDayView()}
          {viewMode === "week"  && renderWeekView()}
          {viewMode === "month" && renderMonthView()}
        </Animated.View>
      </Modal>

      {renderForm()}
      {renderDetail()}
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: { backgroundColor: "rgba(0,0,0,0.62)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    height: SHEET_H, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderBottomWidth: 0, overflow: "hidden",
  },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 6 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 8 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 19 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  addBtnTxt: { fontSize: 13, color: "#fff" },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },

  tabRow: {
    flexDirection: "row", marginHorizontal: 16, marginBottom: 8,
    borderRadius: 12, padding: 3, borderWidth: 1, gap: 2,
  },
  tabBtn: { flex: 1, paddingVertical: 7, alignItems: "center", borderRadius: 10 },
  tabTxt: { fontSize: 13 },

  navRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 4,
  },
  navBtn: { padding: 6 },
  navLabel: { fontSize: 13 },

  // Day view
  viewSubtitle: { fontSize: 11, paddingHorizontal: 16, marginBottom: 6 },
  statsRow: {
    flexDirection: "row", justifyContent: "space-around", paddingVertical: 10,
    marginHorizontal: 16, borderTopWidth: 1, borderBottomWidth: 1, marginBottom: 6,
  },
  stat: { alignItems: "center", gap: 2 },
  statVal: { fontSize: 18 },
  statLbl: { fontSize: 10 },

  allDayBanner: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
    paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 4, gap: 8,
  },
  allDayLabel: { fontSize: 9, letterSpacing: 0.6, width: 44, textAlign: "right" },
  allDayChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1,
  },
  allDayDot: { width: 6, height: 6, borderRadius: 3 },
  allDayTitle: { fontSize: 12, maxWidth: 120 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  timelineWrap: { position: "relative" },
  hourRow: { position: "absolute", left: 0, right: 0, flexDirection: "row", alignItems: "flex-start", paddingTop: 6 },
  hourLabel: { width: 44, textAlign: "right", paddingRight: 6, lineHeight: 14 },
  pillsRow: { flex: 1, paddingLeft: 10, flexDirection: "row", flexWrap: "wrap", gap: 5, alignItems: "flex-start" },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 18, borderWidth: 1, maxWidth: SCREEN_W - 110 },
  pillDot: { width: 5, height: 5, borderRadius: 2.5 },
  pillName: { fontSize: 12 },
  pillStreak: { flexDirection: "row", alignItems: "center", gap: 1 },
  pillStreakNum: { fontSize: 9 },

  // Event blocks (day view)
  eventBlock: {
    position: "absolute", left: 52, right: 4,
    borderRadius: 8, borderWidth: 1, borderLeftWidth: 3,
    paddingHorizontal: 8, paddingVertical: 4, flexDirection: "row",
    alignItems: "flex-start", justifyContent: "space-between",
  },
  eventBlockInner: { flex: 1, gap: 1 },
  eventBlockTitle: { fontSize: 11 },
  eventBlockTime: { fontSize: 9 },
  eventBlockMeta: { fontSize: 9, marginLeft: 3 },
  taskDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginTop: 2 },

  // Now indicator
  nowWrap: { position: "absolute", left: 0, right: 0, flexDirection: "row", alignItems: "center", zIndex: 20 },
  nowDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 44, zIndex: 21 },
  nowGlow: { position: "absolute", left: 40, width: 18, height: 18, borderRadius: 9, zIndex: 20 },
  nowLine: { flex: 1, height: 1.5, opacity: 0.85, marginHorizontal: 2, zIndex: 20 },
  nowBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, marginLeft: 4, zIndex: 21 },
  nowText: { fontSize: 8, color: "#fff", letterSpacing: 0.8 },

  // Week view
  weekHeaderRow: {
    flexDirection: "row", paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 6, marginBottom: 2,
  },
  weekDayHeader: { alignItems: "center", gap: 2, borderLeftWidth: StyleSheet.hairlineWidth, paddingBottom: 4 },
  weekDayName: { fontSize: 10 },
  weekDayNum: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  weekDayNumTxt: { fontSize: 12 },
  weekDayRate: { fontSize: 8 },
  weekEvDot: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 6, marginTop: 1 },
  weekEvCount: { fontSize: 8 },
  weekHourRow: { position: "absolute", left: 0, right: 0, flexDirection: "row", paddingHorizontal: 16 },
  weekHourLabel: { textAlign: "right", paddingRight: 6, paddingTop: 3, fontSize: 9 },
  weekCell: { borderLeftWidth: StyleSheet.hairlineWidth, paddingHorizontal: 2, paddingTop: 2, gap: 2 },
  weekEventBlock: { paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderLeftWidth: 2 },
  weekHabitBlock: { paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderLeftWidth: 2 },
  weekHabitTxt: { fontSize: 9 },
  weekOverflow: { fontSize: 9, paddingLeft: 3 },
  weekNowWrap: { position: "absolute", left: 16, right: 16, flexDirection: "row", alignItems: "center", zIndex: 20 },

  // Month view
  monthDoW: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 4 },
  monthDoWTxt: { fontSize: 10 },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16 },
  monthCell: { alignItems: "center", paddingTop: 5, paddingBottom: 3, gap: 2 },
  monthDateCircle: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  monthDateNum: { fontSize: 12 },
  monthDots: { flexDirection: "row", gap: 2, flexWrap: "wrap", justifyContent: "center" },
  monthDot: { width: 5, height: 5, borderRadius: 2.5 },
  monthDotMore: { fontSize: 8 },
  monthEvLabel: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, maxWidth: "95%" },
  monthEvTxt: { fontSize: 8 },
  monthBar: { height: 3, borderRadius: 1.5, width: "70%", overflow: "hidden" },
  monthBarFill: { height: "100%", borderRadius: 1.5 },
  monthLegend: { flexDirection: "row", justifyContent: "center", gap: 16, paddingTop: 10, borderTopWidth: 1, marginHorizontal: 16, marginTop: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { fontSize: 10 },

  // ─── Form Modal ──────────────────────────────────────────────────────────
  formOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  formSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderBottomWidth: 0, maxHeight: SCREEN_H * 0.9,
  },
  formHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  formTitle: { fontSize: 16 },
  formBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  formBtnTxt: { fontSize: 13 },

  typeRow: {
    flexDirection: "row", borderRadius: 12, padding: 3, borderWidth: 1, gap: 2,
  },
  typeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, borderRadius: 10 },
  typeTxt: { fontSize: 13 },

  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15,
  },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  fieldCol: { gap: 8 },
  fieldLabel: { fontSize: 14 },
  inlineInput: {
    flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13,
  },
  inlineInputSm: {
    flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12,
  },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 6 },

  timeRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  timeField: { flex: 1, gap: 4 },
  timeLabel: { fontSize: 11 },
  timeInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, textAlign: "center" },

  colorSwatch: { width: 26, height: 26, borderRadius: 13 },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 4 },
  colorCircle: { width: 30, height: 30, borderRadius: 15 },

  selectRow: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  pickerList: { borderWidth: 1, borderRadius: 10, overflow: "hidden" },
  pickerItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  pickerTxt: { fontSize: 13 },

  daysRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  dayChip: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  dayChipTxt: { fontSize: 12 },

  reminderRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  reminderChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  reminderTxt: { fontSize: 11 },

  textarea: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, minHeight: 70, textAlignVertical: "top",
  },

  // ─── Detail Modal ─────────────────────────────────────────────────────────
  detailOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center", alignItems: "center", paddingHorizontal: 20,
  },
  detailCard: {
    width: "100%", borderRadius: 20, overflow: "hidden",
    borderWidth: 1, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
  },
  detailStrip: { height: 4 },
  detailTypeTag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  detailTypeTxt: { fontSize: 11 },
  detailTitle: { fontSize: 18, flex: 1, paddingRight: 8 },
  detailMeta: { fontSize: 12 },
  detailDesc: { fontSize: 13, flex: 1, lineHeight: 18 },
  descBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  iconBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  checkBtn: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
});
