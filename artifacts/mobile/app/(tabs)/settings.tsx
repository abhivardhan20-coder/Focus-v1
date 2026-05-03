import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useFont } from "@/hooks/useFont";
import { useTheme, type ColorMode } from "@/context/ThemeContext";
import { useHabits } from "@/context/HabitsContext";
import { BADGES, getBadge } from "@/constants/badges";
import { BadgesModal } from "@/components/BadgesModal";
import { useGraphPrefs, GRAPH_TYPES, GRAPH_TYPE_LABELS, GRAPH_TYPE_ICONS, type GraphType } from "@/context/GraphPreferencesContext";
import { ProgressRing } from "@/components/ProgressRing";
import { THEMES, type ThemeName } from "@/constants/themes";
import { FONTS, FONT_ORDER, type FontName } from "@/constants/fonts";
import {
  scheduleHabitReminder,
  cancelHabitReminder,
  requestNotificationPermission,
  formatReminderTime,
  getNotificationSupport,
  initializeNotifications,
} from "@/lib/notifications";
import { PILLAR_LABELS, PILLAR_COLORS, type HabitCategory } from "@/context/HabitsContext";
const APP_VERSION = "2.0.0";
const MOCK_IMPORT = JSON.stringify({
  version: 2,
  habits: [
    {
      id: "demo1",
      name: "Morning Run",
      description: "30 minute easy run",
      type: "timed",
      category: "physical",
      icon: "activity",
      color: "#13EC5B",
      frequency: "daily",
      targetDuration: 30,
      difficulty: "medium",
      priority: "high",
      archived: false,
      createdAt: Date.now() - 14 * 86400000,
      completions: [],
      streak: 4,
      longestStreak: 10,
      xpPoints: 80,
      order: 0,
    },
    {
      id: "demo2",
      name: "Read",
      description: "Read 20 pages",
      type: "quantitative",
      category: "academics",
      icon: "book-open",
      color: "#3B82F6",
      frequency: "daily",
      targetValue: 20,
      targetUnit: "pages",
      difficulty: "easy",
      priority: "medium",
      archived: false,
      createdAt: Date.now() - 10 * 86400000,
      completions: [],
      streak: 2,
      longestStreak: 6,
      xpPoints: 30,
      order: 1,
    }
  ],
  routines: [],
  userStats: {
    level: 2,
    totalXP: 620,
    totalCompleted: 18,
    freezeTokens: 3,
    badges: ["first_habit"],
    joinDate: Date.now() - 30 * 86400000,
    username: "Demo User",
    stepsGoal: 10000,
  },
  pomodoroSessions: [],
  stepsByDate: {},
  calendarEvents: [],
}, null, 2);

const THEME_ORDER: ThemeName[] = [
  "midnight","emerald","sunset","sand","cyber","ocean","graphite","mint","royal","rose",
];

const QUICK_TIMES = [
  { label: "6 AM",  value: "06:00" },
  { label: "7 AM",  value: "07:00" },
  { label: "8 AM",  value: "08:00" },
  { label: "9 AM",  value: "09:00" },
  { label: "12 PM", value: "12:00" },
  { label: "6 PM",  value: "18:00" },
  { label: "8 PM",  value: "20:00" },
  { label: "10 PM", value: "22:00" },
];

const PILLARS: HabitCategory[] = ["physical","mental","academics","creativity","chores"];

const SAMPLE_EXPORT = JSON.stringify({
  version: 2,
  exportedAt: "2026-05-03T10:00:00.000Z",
  appearance: { theme: "midnight", font: "inter", colorMode: "dark" },
  graphPrefs: { global: "bar", byCategory: { physical: "line" }, byRoutine: {}, byHabit: {} },
  habits: [{
    id: "example1", name: "Morning Run", type: "binary",
    category: "physical", icon: "activity", color: "#13EC5B",
    frequency: "daily", difficulty: "medium", priority: "high",
    archived: false, streak: 5, longestStreak: 14, xpPoints: 100,
    order: 0, createdAt: 1714735200000, completions: [],
  }],
  routines: [],
  userStats: {
    level: 3, totalXP: 1200, totalCompleted: 42, freezeTokens: 3,
    badges: [], joinDate: 1714735200000, username: "FOCUS User", stepsGoal: 10000,
  },
  pomodoroSessions: [],
  stepsByDate: { "2026-05-03": 8420 },
}, null, 2);

// ── Helpers ──────────────────────────────────────────────────────────────────
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

async function shareJson(json: string, filename: string) {
  if (Platform.OS === "web") {
    try {
      const blob = new Blob([json], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {}
  } else {
    await Share.share({ message: json, title: filename }).catch(() => {});
  }
}

// ── CollapsibleSection ────────────────────────────────────────────────────────
interface CollapsibleSectionProps {
  icon: string; iconColor: string; title: string;
  badge?: React.ReactNode; defaultOpen?: boolean;
  children: React.ReactNode;
}
function CollapsibleSection({
  icon, iconColor, title, badge, defaultOpen = false, children,
}: CollapsibleSectionProps) {
  const colors   = useColors();
  const font     = useFont();
  const [open, setOpen] = useState(defaultOpen);
  const [contentH, setContentH] = useState(0);
  const progress = useSharedValue(defaultOpen ? 1 : 0);

  const toggle = () => {
    const next = !open; setOpen(next);
    progress.value = withSpring(next ? 1 : 0, { damping: 20, stiffness: 180 });
  };

  const bodyStyle    = useAnimatedStyle(() => ({
    maxHeight: interpolate(progress.value, [0,1], [0, contentH > 0 ? contentH + 32 : 2400]),
    opacity:   interpolate(progress.value, [0,0.25,1], [0,0.6,1]),
    overflow:  "hidden",
  }));
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(progress.value,[0,1],[0,180])}deg` }],
  }));
  const headerBgStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(${iconColor.startsWith("#") ? hexToRgb(iconColor) : "255,255,255"}, ${interpolate(progress.value,[0,1],[0,0.04])})`,
  }));

  return (
    <View style={[s.accordion, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
      <TouchableOpacity onPress={toggle} activeOpacity={0.72} style={s.accordionHdr}>
        <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 16 }, headerBgStyle]} pointerEvents="none" />
        <View style={[s.accordionIconWrap, { backgroundColor: iconColor + "22" }]}>
          <Feather name={icon as any} size={16} color={iconColor} />
        </View>
        <Text style={[s.accordionTitle, { color: colors.foreground, fontFamily: font.semibold }]}>{title}</Text>
        {badge}
        <Animated.View style={chevronStyle}>
          <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
        </Animated.View>
      </TouchableOpacity>
      <Animated.View style={bodyStyle}>
        <View onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0 && Math.abs(h - contentH) > 2) setContentH(h);
        }}>
          <View style={[s.accordionDivider, { backgroundColor: colors.border }]} />
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

// ── GraphTypePicker ───────────────────────────────────────────────────────────
function GraphTypePicker({
  value, onChange, accentColor,
}: { value: GraphType; onChange: (t: GraphType) => void; accentColor: string }) {
  const colors = useColors();
  const font   = useFont();
  return (
    <View style={s.graphPickerRow}>
      {GRAPH_TYPES.map((type) => {
        const active = value === type;
        return (
          <TouchableOpacity
            key={type}
            onPress={() => onChange(type)}
            style={[s.graphTile, {
              backgroundColor: active ? accentColor + "18" : colors.secondary,
              borderColor:     active ? accentColor        : colors.border,
              borderWidth:     active ? 2 : 1,
            }]}
          >
            <Feather name={GRAPH_TYPE_ICONS[type] as any} size={18} color={active ? accentColor : colors.mutedForeground} />
            <Text style={[s.graphTileLabel, { color: active ? accentColor : colors.mutedForeground, fontFamily: font.medium }]} numberOfLines={1}>
              {GRAPH_TYPE_LABELS[type]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── InfoBanner ────────────────────────────────────────────────────────────────
function InfoBanner({ icon, color, text }: { icon: string; color: string; text: string }) {
  const colors = useColors(); const font = useFont();
  return (
    <View style={[s.infoBanner, { backgroundColor: color + "10", borderColor: color + "25" }]}>
      <Feather name={icon as any} size={13} color={color} />
      <Text style={[s.infoBannerText, { color: colors.mutedForeground, fontFamily: font.regular }]}>{text}</Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const colors  = useColors();
  const font    = useFont();
  const insets  = useSafeAreaInsets();
  const { themeName, setTheme, fontName, setFont, colorMode, setColorMode } = useTheme();
  const {
    habits, routines, userStats, updateHabit, clearAllData, updateUsername, exportData, importData,
    loadMockData,
  } = useHabits();
  const {
    graphPrefs, setGlobalGraphType, setCategoryGraphType,
    setRoutineGraphType, setHabitGraphType, resetGraphPrefs, loadGraphPrefs,
  } = useGraphPrefs();

  // ── Badges
  const [badgesModalOpen, setBadgesModalOpen] = useState(false);

  // ── Username
  const [editingUsername, setEditingUsername]  = useState(false);
  const [usernameInput, setUsernameInput]      = useState(userStats.username ?? "FOCUS User");

  // ── Clear data progress
  const [clearProgress, setClearProgress]   = useState(0);
  const clearIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clearStartRef    = useRef(0);

  // ── Import
  const [importVisible, setImportVisible] = useState(false);
  const [importJson, setImportJson]       = useState("");

  // ── Sample JSON modal
  const [sampleVisible, setSampleVisible] = useState(false);

  // ── Notifications
  const notifSupport         = getNotificationSupport();
  const habitsWithReminder   = habits.filter((h) => !h.archived && h.reminderTime);
  const habitsWithoutReminder = habits.filter((h) => !h.archived && !h.reminderTime);
  const [expandedHabit, setExpandedHabit] = useState<string | null>(null);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [customHH, setCustomHH] = useState("08");
  const [customMM, setCustomMM] = useState("00");

  // ── Graph section expand states
  const [graphCatOpen,     setGraphCatOpen]    = useState(false);
  const [graphRoutineOpen, setGraphRoutineOpen] = useState(false);
  const [graphHabitOpen,   setGraphHabitOpen]  = useState(false);

  const activeHabits   = habits.filter((h) => !h.archived);
  const archivedHabits = habits.filter((h) => h.archived);
  const xpToNext    = 500;
  const xpProgress  = (userStats.totalXP % xpToNext) / xpToNext;
  const xpInLevel   = userStats.totalXP % xpToNext;
  const topPadding  = Platform.OS === "web" ? Math.max(insets.top, 67) + 16 : insets.top + 16;

  // ── Clear hold
  const onClearPressIn = () => {
    clearStartRef.current = Date.now();
    clearIntervalRef.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - clearStartRef.current) / 3000);
      setClearProgress(p);
      if (p >= 1) {
        clearInterval(clearIntervalRef.current!);
        clearIntervalRef.current = null;
        clearAllData();
        setClearProgress(0);
      }
    }, 32);
  };
  const onClearPressOut = () => {
    if (clearIntervalRef.current) { clearInterval(clearIntervalRef.current); clearIntervalRef.current = null; }
    setClearProgress(0);
  };

  // ── Notifications helpers
  const setReminderForHabit = useCallback(async (habitId: string, time: string) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert("Permission Denied","Enable notifications in your browser or device settings.");
      return;
    }
    await scheduleHabitReminder(habit.id, habit.name, time, habit.streak);
    updateHabit(habit.id, { reminderTime: time });
    setEditingHabitId(null);
  }, [habits, updateHabit]);

  const removeReminderForHabit = useCallback(async (habitId: string) => {
    await cancelHabitReminder(habitId);
    updateHabit(habitId, { reminderTime: undefined });
  }, [updateHabit]);

  const turnOffAllReminders = useCallback(async () => {
    for (const h of habitsWithReminder) {
      await cancelHabitReminder(h.id);
      updateHabit(h.id, { reminderTime: undefined });
    }
  }, [habitsWithReminder, updateHabit]);

  const reSyncReminders = useCallback(async () => {
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert("Permission Denied","Enable notifications in settings first.");
      return;
    }
    await initializeNotifications(habits);
    Alert.alert("Reminders Synced","All active reminders have been rescheduled.");
  }, [habits]);

  const openExternal = useCallback((url: string) => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    Alert.alert("Open Link", url);
  }, []);

  const testNotification = useCallback(async () => {
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert("Permission Denied","Enable notifications in settings first.");
      return;
    }
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && "Notification" in window && window.Notification.permission === "granted") {
        setTimeout(() => {
          try {
            new window.Notification("FOCUS · Test", {
              body: "Notifications are working! Tap to open a habit.",
              icon: "/icon.png",
            });
          } catch {}
        }, 3000);
        Alert.alert("Test Scheduled","A notification will appear in 3 seconds.");
      }
    } else {
      import("expo-notifications").then((Notif) => {
        Notif.scheduleNotificationAsync({
          content: { title: "FOCUS · Test", body: "Notifications working! Tap to open a habit.", data: {} },
          trigger: { type: "timeInterval", seconds: 3 } as any,
        });
        Alert.alert("Test Scheduled","A notification will appear in 3 seconds.");
      }).catch(() => {});
    }
  }, []);

  // ── Export/Import
  const handleExport = useCallback(() => {
    const habitsData = JSON.parse(exportData());
    const full = {
      ...habitsData,
      appearance: { theme: themeName, font: fontName, colorMode },
      graphPrefs,
    };
    const json = JSON.stringify(full, null, 2);
    Alert.alert(
      "Export Ready",
      `${habits.length} habits · ${routines.length} routines · ${Math.round(json.length/1024)}KB`,
      [
        { text: "Download / Share", onPress: () => shareJson(json, "focus-backup.json") },
        { text: "Preview", onPress: () => Alert.alert("Preview", json.slice(0,600) + "\n…[truncated]") },
        { text: "Cancel", style: "cancel" },
      ]
    );
  }, [exportData, habits, routines, themeName, fontName, colorMode, graphPrefs]);

  const handleImport = useCallback(async () => {
    try {
      const ok = await importData(importJson);
      if (ok) {
        const parsed = JSON.parse(importJson);
        if (parsed.appearance?.theme && parsed.appearance.theme in THEMES) setTheme(parsed.appearance.theme);
        if (parsed.appearance?.font  && parsed.appearance.font  in FONTS)  setFont(parsed.appearance.font);
        if (["light","dark","system"].includes(parsed.appearance?.colorMode)) setColorMode(parsed.appearance.colorMode);
        if (parsed.graphPrefs) loadGraphPrefs(parsed.graphPrefs);
        setImportVisible(false); setImportJson("");
        Alert.alert("Import Successful","App has been fully restored from backup.");
      } else {
        Alert.alert("Import Failed","Invalid JSON. Check the format and try again.");
      }
    } catch {
      Alert.alert("Import Failed","Could not parse JSON.");
    }
  }, [importData, importJson, setTheme, setFont, setColorMode, loadGraphPrefs]);

  const handleLoadMockData = useCallback(async () => {
    await loadMockData();
    Alert.alert("Demo Data Loaded", "Mock data is ready for testing.");
  }, [loadMockData]);

  function SettingRow({
    icon, label, value, onPress, rightEl, danger,
  }: { icon: string; label: string; value?: string; onPress?: () => void; rightEl?: React.ReactNode; danger?: boolean }) {
    return (
      <TouchableOpacity
        onPress={onPress} activeOpacity={onPress ? 0.7 : 1}
        style={[s.settingRow, { borderBottomColor: colors.border }]}
      >
        <View style={[s.settingIcon, { backgroundColor: danger ? colors.destructive + "22" : colors.secondary }]}>
          <Feather name={icon as any} size={15} color={danger ? colors.destructive : colors.foreground} />
        </View>
        <Text style={[s.settingLabel, { color: danger ? colors.destructive : colors.foreground, fontFamily: font.regular }]}>{label}</Text>
        <View style={s.settingRight}>
          {value ? <Text style={[s.settingValue, { color: colors.mutedForeground, fontFamily: font.regular }]}>{value}</Text> : null}
          {rightEl ?? (onPress ? <Feather name="chevron-right" size={15} color={colors.mutedForeground} /> : null)}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[s.content, { paddingTop: topPadding, paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[s.pageTitle, { color: colors.foreground, fontFamily: font.bold }]}>Settings</Text>

      {/* ── PROFILE CARD ── */}
      <View style={[s.profileCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
        <ProgressRing size={76} strokeWidth={5} progress={xpProgress} color={colors.primary} backgroundColor={colors.border}>
          <View style={s.levelInner}>
            <Text style={[s.levelNum, { color: colors.foreground, fontFamily: font.bold }]}>{userStats.level}</Text>
            <Text style={[s.levelLbl, { color: colors.mutedForeground, fontFamily: font.medium }]}>LVL</Text>
          </View>
        </ProgressRing>
        <View style={{ flex: 1, gap: 4 }}>
          {editingUsername ? (
            <View style={{ flexDirection:"row", alignItems:"center", gap:8 }}>
              <TextInput
                value={usernameInput} onChangeText={setUsernameInput} autoFocus maxLength={32}
                onBlur={() => { updateUsername(usernameInput); setEditingUsername(false); }}
                onSubmitEditing={() => { updateUsername(usernameInput); setEditingUsername(false); }}
                style={[s.userName, { color: colors.foreground, fontFamily: font.bold, borderBottomWidth:1, borderBottomColor:colors.primary, paddingBottom:1 }]}
              />
              <TouchableOpacity onPress={() => { updateUsername(usernameInput); setEditingUsername(false); }}>
                <Feather name="check" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => { setUsernameInput(userStats.username ?? "FOCUS User"); setEditingUsername(true); }}
              style={{ flexDirection:"row", alignItems:"center", gap:6 }}
            >
              <Text style={[s.userName, { color: colors.foreground, fontFamily: font.bold }]}>{userStats.username ?? "FOCUS User"}</Text>
              <Feather name="edit-2" size={12} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
          <Text style={[s.userSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
            {userStats.totalXP} XP · {xpInLevel}/{xpToNext} to next level
          </Text>
          <View style={[s.xpBar, { backgroundColor: colors.border }]}>
            <View style={[s.xpFill, { backgroundColor: colors.primary, width: `${xpProgress * 100}%` }]} />
          </View>
          <View style={s.badgesRow}>
            {userStats.level >= 2 && (
              <View style={[s.badge, { backgroundColor: colors.warning + "22" }]}>
                <Text style={[s.badgeText, { color: colors.warning, fontFamily: font.medium }]}>Consistent</Text>
              </View>
            )}
            {userStats.totalCompleted >= 10 && (
              <View style={[s.badge, { backgroundColor: colors.success + "22" }]}>
                <Text style={[s.badgeText, { color: colors.success, fontFamily: font.medium }]}>Achiever</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ── STATS GRID ── */}
      <View style={s.statsGrid}>
        {[
          { label:"Active",   value: activeHabits.length,     icon:"activity",     color: colors.primary },
          { label:"Done",     value: userStats.totalCompleted, icon:"check-circle", color: colors.success },
          { label:"Frozen",   value: userStats.freezeTokens,   icon:"shield",       color: colors.info },
          { label:"Archived", value: archivedHabits.length,    icon:"archive",      color: colors.mutedForeground },
        ].map((stat) => (
          <View key={stat.label} style={[s.statBox, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <Feather name={stat.icon as any} size={16} color={stat.color} />
            <Text style={[s.statVal, { color: colors.foreground, fontFamily: font.bold }]}>{stat.value}</Text>
            <Text style={[s.statLbl, { color: colors.mutedForeground, fontFamily: font.regular }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* ══════════════════════════════════════════════════════════════════
          ACHIEVEMENTS
      ══════════════════════════════════════════════════════════════════ */}
      <CollapsibleSection
        icon="award" iconColor="#FBBF24" title="Achievements"
        badge={
          <View style={[s.chip, { backgroundColor: "#FBBF2422" }]}>
            <Text style={[s.chipTxt, { color: "#FBBF24", fontFamily: font.bold }]}>
              {userStats.badges.length}/{BADGES.length}
            </Text>
          </View>
        }
      >
        <View style={s.subSection}>
          <View style={s.subHeader}>
            <Text style={[s.subTitle, { color: colors.mutedForeground, fontFamily: font.semibold }]}>YOUR PROGRESS</Text>
          </View>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: colors.mutedForeground, fontFamily: font.regular, fontSize: 13 }}>
                {userStats.badges.length} of {BADGES.length} badges earned
              </Text>
              <Text style={{ color: "#FBBF24", fontFamily: font.semibold, fontSize: 13 }}>
                {Math.round(userStats.badges.length / BADGES.length * 100)}%
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: "hidden" }}>
              <View style={{ height: "100%", backgroundColor: "#FBBF24", borderRadius: 3, width: `${(userStats.badges.length / BADGES.length) * 100}%` as any }} />
            </View>
          </View>
          {userStats.badges.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {userStats.badges.slice(-6).map((id) => {
                const badge = getBadge(id);
                if (!badge) return null;
                return (
                  <View key={id} style={{ alignItems: "center", padding: 10, borderRadius: 14, borderWidth: 1, backgroundColor: badge.color + "10", borderColor: badge.color + "40", gap: 4, width: "30%" }}>
                    <Feather name={badge.icon as any} size={20} color={badge.color} />
                    <Text style={{ color: colors.foreground, fontFamily: font.semibold, fontSize: 11, textAlign: "center" }} numberOfLines={2}>
                      {badge.name}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
          {userStats.badges.length === 0 && (
            <View style={{ alignItems: "center", paddingVertical: 16, gap: 8 }}>
              <Feather name="award" size={32} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontFamily: font.regular, fontSize: 13, textAlign: "center" }}>
                Complete habits to earn your first badge!
              </Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => setBadgesModalOpen(true)}
            style={{ backgroundColor: "#FBBF2418", borderColor: "#FBBF2440", borderWidth: 1, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 }}
          >
            <Feather name="award" size={16} color="#FBBF24" />
            <Text style={{ color: "#FBBF24", fontFamily: font.semibold, fontSize: 14 }}>View All Achievements</Text>
          </TouchableOpacity>
        </View>
      </CollapsibleSection>

      {/* ══════════════════════════════════════════════════════════════════
          COLOR MODE
      ══════════════════════════════════════════════════════════════════ */}
      <CollapsibleSection
        icon="sun" iconColor={colors.warning} title="Color Mode" defaultOpen
        badge={
          <View style={[s.chip, { backgroundColor: colors.warning + "20" }]}>
            <Text style={[s.chipTxt, { color: colors.warning, fontFamily: font.bold }]}>
              {colorMode === "system" ? "System" : colorMode === "light" ? "Light" : "Dark"}
            </Text>
          </View>
        }
      >
        <View style={s.subSection}>
          <Text style={[s.subDesc, { color: colors.mutedForeground, fontFamily: font.regular }]}>
            Choose how FOCUS appears. Light and Dark override the theme; System follows your device.
          </Text>
          <View style={[s.colorModeRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            {([
              { mode:"light"  as ColorMode, icon:"sun",       label:"Light"  },
              { mode:"dark"   as ColorMode, icon:"moon",      label:"Dark"   },
              { mode:"system" as ColorMode, icon:"monitor",   label:"System" },
            ] as const).map(({ mode, icon, label }) => {
              const active = colorMode === mode;
              return (
                <TouchableOpacity
                  key={mode} onPress={() => setColorMode(mode)}
                  style={[s.colorModeBtn, {
                    backgroundColor: active ? colors.primary + "18" : "transparent",
                    borderColor:     active ? colors.primary         : "transparent",
                    borderWidth: active ? 1.5 : 1,
                  }]}
                >
                  <Feather name={icon as any} size={16} color={active ? colors.primary : colors.mutedForeground} />
                  <Text style={[s.colorModeBtnLabel, { color: active ? colors.primary : colors.mutedForeground, fontFamily: active ? font.semibold : font.regular }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </CollapsibleSection>

      {/* ══════════════════════════════════════════════════════════════════
          THEME & TYPOGRAPHY
      ══════════════════════════════════════════════════════════════════ */}
      <CollapsibleSection
        icon="layout" iconColor={colors.accent} title="Theme & Typography"
        badge={
          <View style={[s.chip, { backgroundColor: colors.accent + "20" }]}>
            <Text style={[s.chipTxt, { color: colors.accent, fontFamily: font.bold }]}>{THEMES[themeName].label.split(" ")[0]}</Text>
          </View>
        }
      >
        {/* Theme Engine */}
        <View style={s.subSection}>
          <View style={s.subHeader}>
            <Text style={[s.subTitle, { color: colors.mutedForeground, fontFamily: font.semibold }]}>THEME ENGINE</Text>
          </View>
          <View style={s.themeGrid}>
            {THEME_ORDER.map((name) => {
              const t = THEMES[name];
              const isActive = themeName === name;
              return (
                <TouchableOpacity
                  key={name} onPress={() => setTheme(name)}
                  style={[s.themeCard, { backgroundColor: t.colors.card, borderColor: isActive ? t.colors.primary : t.colors.border, borderWidth: isActive ? 2 : 1 }]}
                >
                  <View style={s.themePreviewDots}>
                    {t.preview.map((c, i) => (
                      <View key={i} style={[s.themeDot, { backgroundColor: c, width: i === 0 ? 28 : 10, borderRadius: i === 0 ? 6 : 5 }]} />
                    ))}
                  </View>
                  <Text style={[s.themeName, { color: t.colors.foreground, fontFamily: font.semibold }]} numberOfLines={1}>{t.label}</Text>
                  <Text style={[s.themeTagline, { color: t.colors.mutedForeground, fontFamily: font.regular }]} numberOfLines={1}>{t.tagline}</Text>
                  {isActive && (
                    <View style={[s.activeCheck, { backgroundColor: t.colors.primary }]}>
                      <Feather name="check" size={9} color={t.colors.background} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Font Engine */}
        <View style={[s.subSection, { paddingTop: 0 }]}>
          <View style={s.subHeader}>
            <Text style={[s.subTitle, { color: colors.mutedForeground, fontFamily: font.semibold }]}>FONT ENGINE</Text>
          </View>
          <View style={s.fontGrid}>
            {FONT_ORDER.map((name) => {
              const f = FONTS[name];
              const isActive = fontName === name;
              return (
                <TouchableOpacity
                  key={name} onPress={() => setFont(name)} activeOpacity={0.78}
                  style={[s.fontCard, { backgroundColor: isActive ? colors.primary + "14" : colors.secondary, borderColor: isActive ? colors.primary : colors.glassBorder, borderWidth: isActive ? 2 : 1 }]}
                >
                  <Text style={[s.fontPreview, { color: isActive ? colors.primary : colors.foreground, fontFamily: f.weights.bold }]}>{f.preview}</Text>
                  <View style={s.fontInfo}>
                    <Text style={[s.fontLabel, { color: isActive ? colors.primary : colors.foreground, fontFamily: f.weights.semibold }]} numberOfLines={1}>{f.label}</Text>
                    <Text style={[s.fontTagline, { color: colors.mutedForeground, fontFamily: font.regular }]} numberOfLines={1}>{f.tagline}</Text>
                  </View>
                  {isActive && (
                    <View style={[s.activeCheck, { backgroundColor: colors.primary }]}>
                      <Feather name="check" size={9} color={colors.background} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </CollapsibleSection>

      {/* ══════════════════════════════════════════════════════════════════
          GRAPH PREFERENCES
      ══════════════════════════════════════════════════════════════════ */}
      <CollapsibleSection
        icon="bar-chart-2" iconColor={colors.info} title="Graph Preferences"
        badge={
          <View style={[s.chip, { backgroundColor: colors.info + "18" }]}>
            <Text style={[s.chipTxt, { color: colors.info, fontFamily: font.bold }]}>{GRAPH_TYPE_LABELS[graphPrefs.global]}</Text>
          </View>
        }
      >
        <View style={s.subSection}>
          <Text style={[s.subDesc, { color: colors.mutedForeground, fontFamily: font.regular }]}>
            Customise every chart in the app. Specific overrides take priority over the global default.
          </Text>

          {/* App-wide default */}
          <View style={s.graphSubGroup}>
            <View style={s.subHeader}>
              <Feather name="globe" size={12} color={colors.info} />
              <Text style={[s.subTitle, { color: colors.info, fontFamily: font.semibold }]}>APP-WIDE DEFAULT</Text>
            </View>
            <GraphTypePicker value={graphPrefs.global} onChange={setGlobalGraphType} accentColor={colors.info} />
          </View>

          {/* Per Category */}
          <View style={s.graphSubGroup}>
            <TouchableOpacity
              onPress={() => setGraphCatOpen((v) => !v)}
              style={[s.graphGroupToggle, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            >
              <View style={[s.accordionIconWrap, { backgroundColor: colors.success + "18", width:28, height:28, borderRadius:8 }]}>
                <Feather name="tag" size={12} color={colors.success} />
              </View>
              <Text style={[s.graphGroupLabel, { color: colors.foreground, fontFamily: font.semibold }]}>Per Category</Text>
              <Text style={[s.graphGroupSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                {Object.keys(graphPrefs.byCategory).length} overrides
              </Text>
              <Feather name={graphCatOpen ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
            {graphCatOpen && (
              <View style={s.graphGroupBody}>
                {PILLARS.map((cat) => (
                  <View key={cat} style={s.graphOverrideRow}>
                    <View style={[s.catDotBig, { backgroundColor: PILLAR_COLORS[cat] }]} />
                    <Text style={[s.graphOverrideLabel, { color: colors.foreground, fontFamily: font.medium }]}>{PILLAR_LABELS[cat]}</Text>
                    <View style={{ flex: 1 }}>
                      <GraphTypePicker
                        value={graphPrefs.byCategory[cat] ?? graphPrefs.global}
                        onChange={(t) => setCategoryGraphType(cat, t)}
                        accentColor={PILLAR_COLORS[cat]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Per Routine */}
          {routines.length > 0 && (
            <View style={s.graphSubGroup}>
              <TouchableOpacity
                onPress={() => setGraphRoutineOpen((v) => !v)}
                style={[s.graphGroupToggle, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              >
                <View style={[s.accordionIconWrap, { backgroundColor: colors.accent + "18", width:28, height:28, borderRadius:8 }]}>
                  <Feather name="list" size={12} color={colors.accent} />
                </View>
                <Text style={[s.graphGroupLabel, { color: colors.foreground, fontFamily: font.semibold }]}>Per Routine</Text>
                <Text style={[s.graphGroupSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                  {Object.keys(graphPrefs.byRoutine).length} overrides
                </Text>
                <Feather name={graphRoutineOpen ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
              {graphRoutineOpen && (
                <View style={s.graphGroupBody}>
                  {routines.map((routine) => (
                    <View key={routine.id} style={s.graphOverrideRow}>
                      <Feather name="list" size={13} color={colors.accent} />
                      <Text style={[s.graphOverrideLabel, { color: colors.foreground, fontFamily: font.medium }]} numberOfLines={1}>{routine.name}</Text>
                      <View style={{ flex: 1 }}>
                        <GraphTypePicker
                          value={graphPrefs.byRoutine[routine.id] ?? graphPrefs.global}
                          onChange={(t) => setRoutineGraphType(routine.id, t)}
                          accentColor={colors.accent}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Per Habit */}
          <View style={s.graphSubGroup}>
            <TouchableOpacity
              onPress={() => setGraphHabitOpen((v) => !v)}
              style={[s.graphGroupToggle, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            >
              <View style={[s.accordionIconWrap, { backgroundColor: colors.warning + "18", width:28, height:28, borderRadius:8 }]}>
                <Feather name="activity" size={12} color={colors.warning} />
              </View>
              <Text style={[s.graphGroupLabel, { color: colors.foreground, fontFamily: font.semibold }]}>Per Habit</Text>
              <Text style={[s.graphGroupSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                {Object.keys(graphPrefs.byHabit).length} overrides
              </Text>
              <Feather name={graphHabitOpen ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
            {graphHabitOpen && (
              <View style={s.graphGroupBody}>
                {activeHabits.length === 0 ? (
                  <Text style={[s.graphEmptyNote, { color: colors.mutedForeground, fontFamily: font.regular }]}>No active habits.</Text>
                ) : (
                  activeHabits.map((habit) => (
                    <View key={habit.id} style={s.graphOverrideRow}>
                      <View style={[s.catDotBig, { backgroundColor: habit.color }]} />
                      <Text style={[s.graphOverrideLabel, { color: colors.foreground, fontFamily: font.medium }]} numberOfLines={1}>{habit.name}</Text>
                      <View style={{ flex: 1 }}>
                        <GraphTypePicker
                          value={graphPrefs.byHabit[habit.id] ?? graphPrefs.global}
                          onChange={(t) => setHabitGraphType(habit.id, t)}
                          accentColor={habit.color}
                        />
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>

          {/* Reset to Default */}
          <TouchableOpacity
            onPress={() => Alert.alert(
              "Reset Graph Preferences",
              "This will clear all custom graph settings and restore the defaults.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Reset", style: "destructive", onPress: resetGraphPrefs },
              ]
            )}
            style={[s.graphResetBtn, { borderColor: colors.border, backgroundColor: colors.secondary }]}
          >
            <Feather name="rotate-ccw" size={14} color={colors.mutedForeground} />
            <Text style={[s.graphResetBtnTxt, { color: colors.mutedForeground, fontFamily: font.medium }]}>Set as Default</Text>
          </TouchableOpacity>
        </View>
      </CollapsibleSection>

      {/* ══════════════════════════════════════════════════════════════════
          NOTIFICATIONS
      ══════════════════════════════════════════════════════════════════ */}
      <CollapsibleSection
        icon="bell" iconColor={colors.warning} title="Notifications"
        badge={
          habitsWithReminder.length > 0 ? (
            <View style={[s.chip, { backgroundColor: colors.warning + "20" }]}>
              <Text style={[s.chipTxt, { color: colors.warning, fontFamily: font.bold }]}>{habitsWithReminder.length} active</Text>
            </View>
          ) : undefined
        }
      >
        <View style={s.subSection}>
          <View style={[s.remMasterRow, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
            <View style={[s.remMasterIcon, { backgroundColor: colors.warning + "18" }]}>
              <Feather name="bell" size={16} color={colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.remMasterTitle, { color: colors.foreground, fontFamily: font.semibold }]}>All Habit Reminders</Text>
              <Text style={[s.remMasterSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                {habitsWithReminder.length > 0
                  ? `${habitsWithReminder.length} habit${habitsWithReminder.length===1?"":"s"} scheduled`
                  : "No reminders active"}
              </Text>
            </View>
            {habitsWithReminder.length > 0 && (
              <TouchableOpacity
                onPress={() => Alert.alert("Turn Off All Reminders",`Cancel reminders for all ${habitsWithReminder.length} habits?`,[
                  { text:"Cancel", style:"cancel" },
                  { text:"Turn Off All", style:"destructive", onPress: turnOffAllReminders },
                ])}
                style={[s.remMasterOff, { borderColor: colors.destructive + "40" }]}
              >
                <Text style={[s.remMasterOffTxt, { color: colors.destructive, fontFamily: font.medium }]}>Turn Off All</Text>
              </TouchableOpacity>
            )}
          </View>

          {notifSupport === "web" && habitsWithReminder.length > 0 && (
            <InfoBanner icon="monitor" color={colors.primary} text="Browser notifications active. Install the mobile app for OS-level alarms." />
          )}

          {habitsWithReminder.length > 0 ? (
            <View style={{ gap: 4, paddingTop: 6 }}>
              {habitsWithReminder.slice().sort((a,b) => a.reminderTime!<b.reminderTime!?-1:1).map((habit) => {
                const isExpanded = expandedHabit === habit.id;
                const isEditing  = editingHabitId === habit.id;
                return (
                  <View key={habit.id} style={[s.remHabitCard, { backgroundColor: colors.secondary, borderColor: isExpanded ? habit.color + "40" : "transparent" }]}>
                    <TouchableOpacity onPress={() => setExpandedHabit(isExpanded ? null : habit.id)} activeOpacity={0.75} style={s.remHabitRow}>
                      <View style={[s.remHabitIcon, { backgroundColor: habit.color + "22" }]}>
                        <Feather name={habit.icon as any} size={14} color={habit.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.remHabitName, { color: colors.foreground, fontFamily: font.medium }]} numberOfLines={1}>{habit.name}</Text>
                        <View style={s.remHabitMeta}>
                          <Feather name="clock" size={10} color={colors.accent} />
                          <Text style={[s.remHabitTime, { color: colors.accent, fontFamily: font.semibold }]}>{formatReminderTime(habit.reminderTime!)}</Text>
                          <Text style={[s.remHabitFreq, { color: colors.mutedForeground, fontFamily: font.regular }]}>· daily</Text>
                        </View>
                      </View>
                      <View style={s.remHabitActions}>
                        <TouchableOpacity onPress={() => router.push(`/habit/${habit.id}`)} style={[s.remActionBtn, { backgroundColor: colors.card }]}>
                          <Feather name="external-link" size={12} color={colors.mutedForeground} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeReminderForHabit(habit.id)} style={[s.remActionBtn, { backgroundColor: colors.destructive + "15" }]}>
                          <Feather name="bell-off" size={12} color={colors.destructive} />
                        </TouchableOpacity>
                        <Feather name={isExpanded?"chevron-up":"chevron-down"} size={14} color={colors.mutedForeground} />
                      </View>
                    </TouchableOpacity>
                    {isExpanded && (
                      <View style={[s.remExpandBody, { borderTopColor: colors.border }]}>
                        <Text style={[s.remExpandLabel, { color: colors.mutedForeground, fontFamily: font.medium }]}>Change time</Text>
                        {!isEditing ? (
                          <View style={s.remQuickRow}>
                            {QUICK_TIMES.map((qt) => (
                              <TouchableOpacity
                                key={qt.value} onPress={() => setReminderForHabit(habit.id, qt.value)}
                                style={[s.remQuickChip, { backgroundColor: habit.reminderTime===qt.value ? habit.color : colors.card, borderColor: habit.reminderTime===qt.value ? habit.color : colors.border }]}
                              >
                                <Text style={[s.remQuickChipTxt, { color: habit.reminderTime===qt.value ? "#fff" : colors.mutedForeground, fontFamily: font.medium }]}>{qt.label}</Text>
                              </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                              onPress={() => { const [hh,mm]=(habit.reminderTime??"08:00").split(":"); setCustomHH(hh); setCustomMM(mm); setEditingHabitId(habit.id); }}
                              style={[s.remQuickChip, { backgroundColor: colors.card, borderColor: colors.border, borderStyle: "dashed" }]}
                            >
                              <Feather name="edit" size={9} color={colors.mutedForeground} />
                              <Text style={[s.remQuickChipTxt, { color: colors.mutedForeground, fontFamily: font.medium }]}>Custom</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={s.remCustomRow}>
                            <TextInput value={customHH} onChangeText={(v) => setCustomHH(v.replace(/\D/g,"").slice(0,2))} placeholder="HH" placeholderTextColor={colors.mutedForeground} keyboardType="number-pad" maxLength={2} style={[s.remCustomInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border, fontFamily: font.bold }]} />
                            <Text style={[s.remCustomColon, { color: colors.foreground, fontFamily: font.bold }]}>:</Text>
                            <TextInput value={customMM} onChangeText={(v) => setCustomMM(v.replace(/\D/g,"").slice(0,2))} placeholder="MM" placeholderTextColor={colors.mutedForeground} keyboardType="number-pad" maxLength={2} style={[s.remCustomInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border, fontFamily: font.bold }]} />
                            <TouchableOpacity
                              onPress={() => { const hh=Math.min(23,parseInt(customHH)||0).toString().padStart(2,"0"); const mm=Math.min(59,parseInt(customMM)||0).toString().padStart(2,"0"); setReminderForHabit(habit.id,`${hh}:${mm}`); }}
                              style={[s.remCustomSet, { backgroundColor: habit.color }]}
                            >
                              <Feather name="check" size={13} color="#fff" />
                              <Text style={[s.remCustomSetTxt, { fontFamily: font.semibold }]}>Set</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setEditingHabitId(null)}>
                              <Feather name="x" size={15} color={colors.mutedForeground} />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={[s.remEmpty, { backgroundColor: colors.secondary }]}>
              <View style={[s.remEmptyIcon, { backgroundColor: colors.muted }]}>
                <Feather name="bell-off" size={20} color={colors.mutedForeground} />
              </View>
              <Text style={[s.remEmptyTitle, { color: colors.foreground, fontFamily: font.semibold }]}>No Reminders Set</Text>
              <Text style={[s.remEmptyBody, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                Open any habit's detail page and turn on its Daily Reminder.
              </Text>
            </View>
          )}

          {habitsWithoutReminder.length > 0 && (
            <View style={{ gap: 8, paddingTop: 8 }}>
              <View style={[s.remDivider, { backgroundColor: colors.border }]} />
              <Text style={[s.remAddTitle, { color: colors.mutedForeground, fontFamily: font.semibold }]}>ADD REMINDERS</Text>
              <View style={{ gap: 4 }}>
                {habitsWithoutReminder.slice(0, 5).map((habit) => (
                  <View key={habit.id} style={[s.remAddRow, { borderBottomColor: colors.border }]}>
                    <View style={[s.remHabitIcon, { backgroundColor: habit.color + "20" }]}>
                      <Feather name={habit.icon as any} size={13} color={habit.color} />
                    </View>
                    <Text style={[s.remAddName, { color: colors.foreground, fontFamily: font.regular }]} numberOfLines={1}>{habit.name}</Text>
                    <TouchableOpacity onPress={() => setReminderForHabit(habit.id,"08:00")} style={[s.remAddBtn, { backgroundColor: colors.accent + "18", borderColor: colors.accent + "30" }]}>
                      <Feather name="bell" size={11} color={colors.accent} />
                      <Text style={[s.remAddBtnTxt, { color: colors.accent, fontFamily: font.medium }]}>8 AM</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push(`/habit/${habit.id}`)} style={[s.remAddBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                      <Feather name="sliders" size={11} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                ))}
                {habitsWithoutReminder.length > 5 && (
                  <Text style={[s.remMoreTxt, { color: colors.mutedForeground, fontFamily: font.regular }]}>+{habitsWithoutReminder.length - 5} more habits without reminders</Text>
                )}
              </View>
            </View>
          )}
        </View>
      </CollapsibleSection>

      {/* ══════════════════════════════════════════════════════════════════
          TROUBLESHOOTING
      ══════════════════════════════════════════════════════════════════ */}
      <CollapsibleSection icon="tool" iconColor={colors.destructive} title="Troubleshooting">
        <View style={s.subSection}>

          {/* Notifications */}
          <View style={s.subHeader}>
            <Feather name="bell" size={12} color={colors.warning} />
            <Text style={[s.subTitle, { color: colors.warning, fontFamily: font.semibold }]}>NOTIFICATIONS</Text>
          </View>

          <InfoBanner icon="info" color={colors.info}
            text="Tap a notification to open that habit directly. On native, notifications include a 'Mark Done' action." />
          <InfoBanner icon="check-circle" color={colors.success}
            text="When a habit is completed, its reminder is automatically cancelled for the day (native only)." />
          {activeHabits.some((h) => h.type === "quantitative") && (
            <InfoBanner icon="plus-circle" color={colors.accent}
              text="Tapping a quantitative habit notification opens it so you can increment the count from the habit screen." />
          )}

          <View style={{ gap: 8, paddingTop: 8 }}>
            <View style={[s.troubleRow, { borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.troubleLabel, { color: colors.foreground, fontFamily: font.semibold }]}>Permission Status</Text>
                <Text style={[s.troubleSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                  {notifSupport === "full" ? "Native — full support"
                   : notifSupport === "web" ? "Browser — limited"
                   : "Unavailable in this environment"}
                </Text>
              </View>
              <View style={[s.troubleStatusDot, {
                backgroundColor: notifSupport !== "none" ? colors.success + "22" : colors.destructive + "22",
                borderColor:     notifSupport !== "none" ? colors.success        : colors.destructive,
              }]}>
                <Feather name={notifSupport !== "none" ? "check" : "x"} size={11}
                  color={notifSupport !== "none" ? colors.success : colors.destructive} />
              </View>
            </View>

            <TouchableOpacity
              onPress={reSyncReminders}
              style={[s.troubleBtn, { backgroundColor: colors.info + "14", borderColor: colors.info + "30" }]}
            >
              <Feather name="refresh-cw" size={14} color={colors.info} />
              <Text style={[s.troubleBtnTxt, { color: colors.info, fontFamily: font.semibold }]}>Re-sync All Reminders</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={testNotification}
              style={[s.troubleBtn, { backgroundColor: colors.warning + "14", borderColor: colors.warning + "30" }]}
            >
              <Feather name="bell" size={14} color={colors.warning} />
              <Text style={[s.troubleBtnTxt, { color: colors.warning, fontFamily: font.semibold }]}>Send Test Notification (3s)</Text>
            </TouchableOpacity>
          </View>

          {/* Step Tracking */}
          <View style={[s.subHeader, { marginTop: 16 }]}>
            <Feather name="navigation" size={12} color={colors.success} />
            <Text style={[s.subTitle, { color: colors.success, fontFamily: font.semibold }]}>STEP TRACKING</Text>
          </View>

          <InfoBanner icon="smartphone" color={colors.success}
            text="On a real device, steps are counted automatically via the built-in pedometer." />
          <InfoBanner icon="monitor" color={colors.primary}
            text="In the web/browser preview, steps are entered manually from the Home screen." />

          <View style={[s.troubleRow, { borderColor: colors.border, marginTop: 8 }]}>
            <View style={{ flex:1 }}>
              <Text style={[s.troubleLabel, { color: colors.foreground, fontFamily: font.semibold }]}>Daily Step Goal</Text>
              <Text style={[s.troubleSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>{userStats.stepsGoal.toLocaleString()} steps</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/")}
              style={[s.remAddBtn, { backgroundColor: colors.success + "14", borderColor: colors.success + "30" }]}
            >
              <Feather name="edit-2" size={11} color={colors.success} />
              <Text style={[s.remAddBtnTxt, { color: colors.success, fontFamily: font.medium }]}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CollapsibleSection>

      {/* ══════════════════════════════════════════════════════════════════
          DATA MANAGEMENT
      ══════════════════════════════════════════════════════════════════ */}
      <CollapsibleSection
        icon="hard-drive" iconColor={colors.success} title="Data Management"
        badge={
          <View style={[s.chip, { backgroundColor: colors.success + "18" }]}>
            <Text style={[s.chipTxt, { color: colors.success, fontFamily: font.bold }]}>{habits.length} habits</Text>
          </View>
        }
      >
        <View style={s.subSection}>

          {/* Export */}
          <SettingRow
            icon="download" label="Export Full Backup (JSON)"
            onPress={handleExport}
          />
          <InfoBanner icon="info" color={colors.info}
            text="Export includes habits, routines, stats, steps, theme, fonts, color mode, and graph preferences." />

          {/* Import */}
          <SettingRow
            icon="upload" label="Import Backup (JSON)"
            onPress={() => setImportVisible(true)}
          />
          {importVisible && (
            <View style={[s.importBox, { backgroundColor: colors.secondary, borderColor: colors.glassBorder }]}>
              <Text style={[s.importLabel, { color: colors.foreground, fontFamily: font.semibold }]}>Paste exported JSON:</Text>
              <TextInput
                value={importJson} onChangeText={setImportJson} multiline numberOfLines={5}
                placeholder={'{"version":2,"habits":[...],"appearance":{"theme":"midnight",...}}'}
                placeholderTextColor={colors.mutedForeground}
                style={[s.importInput, { color: colors.foreground, borderColor: colors.glassBorder, backgroundColor: colors.card, fontFamily: font.regular }]}
              />
              <View style={{ flexDirection:"row", gap:8 }}>
                <TouchableOpacity onPress={handleImport} style={[s.importBtn, { backgroundColor: colors.primary }]}>
                  <Feather name="check" size={14} color={colors.background} />
                  <Text style={[s.importBtnTxt, { color: colors.background, fontFamily: font.semibold }]}>Import & Restore</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setImportVisible(false); setImportJson(""); }} style={[s.importBtn, { backgroundColor: colors.secondary, borderColor: colors.glassBorder, borderWidth:1 }]}>
                  <Text style={[s.importBtnTxt, { color: colors.foreground, fontFamily: font.regular }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Sample JSON */}
          <SettingRow
            icon="file-text" label="View Sample JSON Format"
            onPress={() => setSampleVisible(true)}
          />
          <SettingRow
            icon="database" label="Load Demo Data"
            onPress={handleLoadMockData}
          />

          {/* Clear All */}
          <View style={[s.nuclearSection, { backgroundColor: colors.destructive + "09", borderColor: colors.destructive + "28" }]}>
            <View style={s.nuclearHeader}>
              <Feather name="alert-triangle" size={14} color={colors.destructive} />
              <Text style={[s.nuclearTitle, { color: colors.destructive, fontFamily: font.bold }]}>Clear All Data</Text>
            </View>
            <Text style={[s.nuclearSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
              Permanently deletes all habits, routines, history, and steps. Hold 3 seconds to confirm.
            </Text>
            {clearProgress > 0 && (
              <View style={[s.nuclearTrack, { backgroundColor: colors.border }]}>
                <View style={[s.nuclearFill, { backgroundColor: colors.destructive, width: `${clearProgress * 100}%` }]} />
              </View>
            )}
            <TouchableOpacity
              onPressIn={onClearPressIn} onPressOut={onClearPressOut} activeOpacity={0.82}
              style={[s.nuclearBtn, { backgroundColor: clearProgress > 0 ? colors.destructive + "22" : "transparent", borderColor: colors.destructive + "50" }]}
            >
              <Feather name="trash-2" size={15} color={colors.destructive} />
              <Text style={[s.nuclearBtnText, { color: colors.destructive, fontFamily: font.bold }]}>
                {clearProgress > 0 ? `Deleting… ${Math.round(clearProgress * 100)}%` : "Hold to Clear All Data"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </CollapsibleSection>

      {/* ── ABOUT ── */}
      <CollapsibleSection
        icon="info" iconColor={colors.mutedForeground} title="About"
        badge={<View style={[s.chip, { backgroundColor: colors.secondary }]}><Text style={[s.chipTxt, { color: colors.mutedForeground, fontFamily: font.bold }]}>v{APP_VERSION}</Text></View>}
      >
        <View style={s.subSection}>
          <SettingRow icon="info"      label="Version"          value={APP_VERSION} />
          <SettingRow icon="shield"    label="Privacy Policy"   onPress={() => openExternal("https://example.com/privacy")} />
          <SettingRow icon="file-text" label="Terms of Service" onPress={() => openExternal("https://example.com/terms")} />
        </View>
      </CollapsibleSection>

      {/* ── BRAND FOOTER ── */}
      <View style={[s.brandCard, { borderColor: colors.primary + "30" }]}>
        <Text style={[s.brandTitle, { color: colors.primary, fontFamily: font.bold }]}>FOCUS</Text>
        <Text style={[s.brandSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
          Cinematic Glass & Kinetic Depth.{"\n"}Build consistency. Understand patterns.
        </Text>
        <View style={s.brandDots}>
          {[colors.primary, colors.accent, colors.warning].map((c, i) => (
            <View key={i} style={[s.brandDot, { backgroundColor: c }]} />
          ))}
        </View>
      </View>

      {/* ════════════════════════════════════════════════════════════════
          SAMPLE JSON MODAL
      ════════════════════════════════════════════════════════════════ */}
      <Modal visible={sampleVisible} transparent animationType="slide" onRequestClose={() => setSampleVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.foreground, fontFamily: font.bold }]}>Sample Export Format</Text>
              <TouchableOpacity onPress={() => setSampleVisible(false)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text style={[s.modalSubtitle, { color: colors.mutedForeground, fontFamily: font.regular }]}>
              Your import JSON must match this structure. All fields are optional except habits.
            </Text>
            <ScrollView style={s.sampleScroll} showsVerticalScrollIndicator={false}>
              <Text style={[s.sampleCode, { color: colors.foreground, fontFamily: "monospace", backgroundColor: colors.secondary, borderColor: colors.border }]}>
                {SAMPLE_EXPORT}
              </Text>
            </ScrollView>
            <TouchableOpacity
              onPress={() => shareJson(SAMPLE_EXPORT, "focus-sample-format.json")}
              style={[s.modalBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="download" size={15} color={colors.background} />
              <Text style={[s.modalBtnTxt, { color: colors.background, fontFamily: font.semibold }]}>Download Sample</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BadgesModal
        visible={badgesModalOpen}
        onClose={() => setBadgesModalOpen(false)}
      />
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },
  content:   { paddingHorizontal: 16, gap: 12 },
  pageTitle: { fontSize: 28 },

  profileCard: { borderRadius: 18, padding: 18, flexDirection: "row", gap: 16, alignItems: "center", borderWidth: 1 },
  levelInner:  { alignItems: "center" },
  levelNum:    { fontSize: 18 },
  levelLbl:    { fontSize: 8 },
  userName:    { fontSize: 17 },
  userSub:     { fontSize: 11 },
  xpBar:       { height: 3, borderRadius: 2, overflow: "hidden", marginTop: 2 },
  xpFill:      { height: "100%", borderRadius: 2 },
  badgesRow:   { flexDirection: "row", gap: 6, marginTop: 2, flexWrap: "wrap" },
  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText:   { fontSize: 10 },

  statsGrid: { flexDirection: "row", gap: 10 },
  statBox:   { flex: 1, borderRadius: 12, padding: 12, alignItems: "center", gap: 3, borderWidth: 1 },
  statVal:   { fontSize: 18 },
  statLbl:   { fontSize: 10 },

  accordion:       { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  accordionHdr:    { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  accordionIconWrap:{ width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  accordionTitle:  { flex: 1, fontSize: 15 },
  accordionDivider:{ height: StyleSheet.hairlineWidth, marginHorizontal: 16 },

  subSection: { padding: 14, gap: 8 },
  subHeader:  { flexDirection: "row", alignItems: "center", gap: 6, paddingBottom: 4 },
  subTitle:   { fontSize: 10, letterSpacing: 1 },
  subDesc:    { fontSize: 12, lineHeight: 17 },

  chip:    { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  chipTxt: { fontSize: 10 },

  // Color Mode
  colorModeRow: { flexDirection: "row", borderRadius: 14, borderWidth: 1, overflow: "hidden", gap: 0 },
  colorModeBtn: { flex: 1, alignItems: "center", paddingVertical: 12, gap: 5, borderRadius: 12, margin: 4 },
  colorModeBtnLabel: { fontSize: 12 },

  // Theme grid
  themeGrid:        { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  themeCard:        { width: "47%", borderRadius: 14, padding: 12, gap: 5, position: "relative" },
  themePreviewDots: { flexDirection: "row", gap: 4, marginBottom: 2 },
  themeDot:         { height: 10, borderRadius: 5 },
  themeName:        { fontSize: 12 },
  themeTagline:     { fontSize: 9 },
  activeCheck:      { position: "absolute", top: 8, right: 8, width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },

  // Font grid
  fontGrid:    { gap: 8 },
  fontCard:    { borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 14, position: "relative" },
  fontPreview: { fontSize: 34, lineHeight: 40, minWidth: 44, textAlign: "center" },
  fontInfo:    { flex: 1, gap: 2 },
  fontLabel:   { fontSize: 15 },
  fontTagline: { fontSize: 10 },

  // Graph preferences
  graphPickerRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  graphTile:      { flex: 1, minWidth: 56, alignItems: "center", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 4, gap: 4 },
  graphTileLabel: { fontSize: 9, textAlign: "center" },
  graphSubGroup:  { gap: 8 },
  graphGroupToggle: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 12, borderWidth: 1 },
  graphGroupLabel:  { flex: 1, fontSize: 13 },
  graphGroupSub:    { fontSize: 11 },
  graphGroupBody:   { gap: 12, paddingLeft: 4, paddingTop: 4 },
  graphOverrideRow: { gap: 6 },
  graphOverrideLabel: { fontSize: 12 },
  catDotBig:       { width: 8, height: 8, borderRadius: 4, marginTop: 2 },
  graphResetBtn:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingVertical: 10, marginTop: 4 },
  graphResetBtnTxt:{ fontSize: 13 },
  graphEmptyNote:  { fontSize: 12, paddingVertical: 8 },

  // Setting rows
  settingRow:   { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  settingIcon:  { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  settingLabel: { flex: 1, fontSize: 14 },
  settingRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  settingValue: { fontSize: 13 },

  // Info banner
  infoBanner:     { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  infoBannerText: { fontSize: 11, lineHeight: 16, flex: 1 },

  // Troubleshooting
  troubleRow:       { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 10, borderWidth: 1 },
  troubleLabel:     { fontSize: 13 },
  troubleSub:       { fontSize: 11, marginTop: 1 },
  troubleStatusDot: { width: 26, height: 26, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  troubleBtn:       { flexDirection: "row", alignItems: "center", gap: 8, padding: 11, borderRadius: 10, borderWidth: 1 },
  troubleBtnTxt:    { fontSize: 13 },

  // Reminders
  remMasterRow:    { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 12 },
  remMasterIcon:   { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  remMasterTitle:  { fontSize: 14 },
  remMasterSub:    { fontSize: 11, marginTop: 1 },
  remMasterOff:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  remMasterOffTxt: { fontSize: 11 },
  remHabitCard:    { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  remHabitRow:     { flexDirection: "row", alignItems: "center", gap: 10, padding: 10 },
  remHabitIcon:    { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  remHabitName:    { fontSize: 13 },
  remHabitMeta:    { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
  remHabitTime:    { fontSize: 11 },
  remHabitFreq:    { fontSize: 10 },
  remHabitActions: { flexDirection: "row", alignItems: "center", gap: 5 },
  remActionBtn:    { width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  remExpandBody:   { padding: 10, paddingTop: 8, borderTopWidth: 1, gap: 8 },
  remExpandLabel:  { fontSize: 10, letterSpacing: 0.5 },
  remQuickRow:     { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  remQuickChip:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 3 },
  remQuickChipTxt: { fontSize: 11 },
  remCustomRow:    { flexDirection: "row", alignItems: "center", gap: 7 },
  remCustomInput:  { width: 48, borderRadius: 9, borderWidth: 1, paddingVertical: 6, textAlign: "center", fontSize: 16 },
  remCustomColon:  { fontSize: 18 },
  remCustomSet:    { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9 },
  remCustomSetTxt: { fontSize: 12, color: "#fff" },
  remEmpty:        { borderRadius: 14, padding: 24, alignItems: "center", gap: 8 },
  remEmptyIcon:    { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  remEmptyTitle:   { fontSize: 14 },
  remEmptyBody:    { fontSize: 12, textAlign: "center", lineHeight: 18 },
  remDivider:      { height: 1 },
  remAddTitle:     { fontSize: 9, letterSpacing: 1 },
  remAddRow:       { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  remAddName:      { flex: 1, fontSize: 13 },
  remAddBtn:       { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  remAddBtnTxt:    { fontSize: 11 },
  remMoreTxt:      { fontSize: 11, paddingTop: 4 },

  // Import/Export
  importBox:    { borderRadius: 12, borderWidth: 1, padding: 12, gap: 10, marginTop: 4 },
  importLabel:  { fontSize: 12 },
  importInput:  { borderRadius: 10, borderWidth: 1, padding: 10, fontSize: 12, minHeight: 90, textAlignVertical: "top" as const },
  importBtn:    { flex: 1, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  importBtnTxt: { fontSize: 13 },

  // Nuclear
  nuclearSection: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10, marginTop: 4 },
  nuclearHeader:  { flexDirection: "row", alignItems: "center", gap: 7 },
  nuclearTitle:   { fontSize: 13 },
  nuclearSub:     { fontSize: 12, lineHeight: 17 },
  nuclearTrack:   { height: 4, borderRadius: 2, overflow: "hidden" },
  nuclearFill:    { height: "100%", borderRadius: 2 },
  nuclearBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 11, borderRadius: 10, borderWidth: 1 },
  nuclearBtnText: { fontSize: 13 },

  // Brand
  brandCard:  { borderRadius: 14, padding: 20, alignItems: "center", gap: 6, borderWidth: 1 },
  brandTitle: { fontSize: 22, letterSpacing: 6 },
  brandSub:   { fontSize: 12, textAlign: "center", lineHeight: 18 },
  brandDots:  { flexDirection: "row", gap: 6, marginTop: 4 },
  brandDot:   { width: 6, height: 6, borderRadius: 3 },

  // Sample JSON modal
  modalOverlay:  { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalCard:     { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, maxHeight: "85%", gap: 12 },
  modalHeader:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle:    { fontSize: 17 },
  modalSubtitle: { fontSize: 12, lineHeight: 17 },
  sampleScroll:  { maxHeight: 340 },
  sampleCode:    { fontSize: 10, lineHeight: 15, padding: 12, borderRadius: 10, borderWidth: 1, fontFamily: "monospace" },
  modalBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 13 },
  modalBtnTxt:   { fontSize: 14 },
});
