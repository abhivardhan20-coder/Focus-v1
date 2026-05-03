import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useFont } from "@/hooks/useFont";
import { useHabits, PILLAR_COLORS } from "@/context/HabitsContext";

const { height: SCREEN_H } = Dimensions.get("window");
const SHEET_H = SCREEN_H * 0.72;

function formatRetroDate(dateStr: string): { weekday: string; full: string } {
  const d = new Date(dateStr + "T12:00:00");
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const full = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return { weekday, full };
}

interface Props {
  visible: boolean;
  date: string | null;
  onClose: () => void;
}

export function RetroEditModal({ visible, date, onClose }: Props) {
  const colors = useColors();
  const font = useFont();
  const insets = useSafeAreaInsets();
  const { habits, isHabitDueOnDate, retroactiveEdit } = useHabits();

  const slideY = useRef(new Animated.Value(SHEET_H)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const [pendingEdits, setPendingEdits] = useState<Record<string, boolean>>({});

  const dueHabits = useMemo(() => {
    if (!date) return [];
    return habits
      .filter((h) => !h.archived && isHabitDueOnDate(h, date))
      .sort((a, b) => a.order - b.order);
  }, [habits, date, isHabitDueOnDate]);

  useEffect(() => {
    if (visible) {
      setPendingEdits({});
      Animated.parallel([
        Animated.spring(slideY, {
          toValue: 0,
          tension: 62,
          friction: 11,
          useNativeDriver: false,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY, {
          toValue: SHEET_H,
          duration: 240,
          useNativeDriver: false,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [visible]);

  function getStatusForHabit(habitId: string): boolean | undefined {
    if (pendingEdits[habitId] !== undefined) return pendingEdits[habitId];
    if (!date) return undefined;
    const h = habits.find((x) => x.id === habitId);
    const c = h?.completions.find((x) => x.date === date);
    return c?.completed;
  }

  function toggle(habitId: string, value: boolean) {
    setPendingEdits((prev) => ({ ...prev, [habitId]: value }));
  }

  function handleSave() {
    if (!date) { onClose(); return; }
    Object.entries(pendingEdits).forEach(([id, completed]) => {
      retroactiveEdit(id, date, completed);
    });
    onClose();
  }

  const dateLabel = date ? formatRetroDate(date) : { weekday: "", full: "" };
  const changeCount = Object.keys(pendingEdits).length;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        {/* Dim overlay */}
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleSave} activeOpacity={1} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.glassBorder,
              paddingBottom: insets.bottom + 16,
              transform: [{ translateY: slideY }],
            },
          ]}
        >
          {/* Glass highlight */}
          <LinearGradient
            colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 0.45 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
            pointerEvents="none"
          />

          {/* Drag pill */}
          <View style={[styles.dragPill, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: colors.primary + "20" }]}>
              <Feather name="edit-3" size={17} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerWeekday, { color: colors.foreground, fontFamily: font.bold }]}>
                {dateLabel.weekday}
              </Text>
              <Text style={[styles.headerFull, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                {dateLabel.full}
              </Text>
            </View>
            <TouchableOpacity onPress={handleSave} style={[styles.closeBtn, { backgroundColor: colors.muted }]}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Subheader */}
          <View style={[styles.subheaderRow, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "28" }]}>
            <Feather name="clock" size={12} color={colors.primary} />
            <Text style={[styles.subheaderText, { color: colors.primary, fontFamily: font.medium }]}>
              Retroactive edit — mark each habit done or missed for this day
            </Text>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {dueHabits.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Feather name="calendar" size={32} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                  No habits were scheduled for this day
                </Text>
              </View>
            ) : (
              dueHabits.map((habit, idx) => {
                const status = getStatusForHabit(habit.id);
                const pillarColor = PILLAR_COLORS[habit.category];
                const isModified = pendingEdits[habit.id] !== undefined;

                return (
                  <View
                    key={habit.id}
                    style={[
                      styles.habitRow,
                      {
                        backgroundColor: isModified
                          ? (pendingEdits[habit.id] ? colors.success + "0A" : colors.destructive + "0A")
                          : colors.background + "60",
                        borderColor: isModified
                          ? (pendingEdits[habit.id] ? colors.success + "30" : colors.destructive + "30")
                          : colors.border,
                      },
                    ]}
                  >
                    {/* Icon */}
                    <View style={[styles.habitIcon, { backgroundColor: habit.color + "22" }]}>
                      <Feather name={habit.icon as any} size={15} color={habit.color} />
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.habitName, { color: colors.foreground, fontFamily: font.semibold }]}>
                        {habit.name}
                      </Text>
                      <View style={styles.habitMeta}>
                        <View style={[styles.categoryPill, { backgroundColor: pillarColor + "20" }]}>
                          <View style={[styles.categoryDot, { backgroundColor: pillarColor }]} />
                          <Text style={[styles.categoryLabel, { color: pillarColor, fontFamily: font.medium }]}>
                            {habit.category}
                          </Text>
                        </View>
                        {habit.streak > 0 && (
                          <Text style={[styles.streakHint, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                            🔥 {habit.streak}d streak
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Toggle buttons */}
                    <View style={styles.toggleGroup}>
                      <TouchableOpacity
                        onPress={() => toggle(habit.id, true)}
                        style={[
                          styles.toggleBtn,
                          {
                            backgroundColor:
                              status === true ? colors.success : colors.success + "15",
                            borderColor:
                              status === true ? colors.success : colors.success + "35",
                          },
                        ]}
                        activeOpacity={0.75}
                      >
                        <Feather
                          name="check"
                          size={13}
                          color={status === true ? "#fff" : colors.success}
                        />
                        <Text
                          style={[
                            styles.toggleLabel,
                            {
                              color: status === true ? "#fff" : colors.success,
                              fontFamily: font.semibold,
                            },
                          ]}
                        >
                          Done
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => toggle(habit.id, false)}
                        style={[
                          styles.toggleBtn,
                          {
                            backgroundColor:
                              status === false ? colors.destructive : colors.destructive + "15",
                            borderColor:
                              status === false ? colors.destructive : colors.destructive + "35",
                          },
                        ]}
                        activeOpacity={0.75}
                      >
                        <Feather
                          name="x"
                          size={13}
                          color={status === false ? "#fff" : colors.destructive}
                        />
                        <Text
                          style={[
                            styles.toggleLabel,
                            {
                              color: status === false ? "#fff" : colors.destructive,
                              fontFamily: font.semibold,
                            },
                          ]}
                        >
                          Missed
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Save button */}
          <TouchableOpacity
            onPress={handleSave}
            style={[
              styles.saveBtn,
              {
                backgroundColor: changeCount > 0 ? colors.primary : colors.muted,
                borderColor: changeCount > 0 ? colors.primary : colors.border,
              },
            ]}
            activeOpacity={0.8}
          >
            <Feather
              name={changeCount > 0 ? "save" : "check-circle"}
              size={17}
              color={changeCount > 0 ? "#000" : colors.mutedForeground}
            />
            <Text
              style={[
                styles.saveBtnText,
                {
                  color: changeCount > 0 ? "#000" : colors.mutedForeground,
                  fontFamily: font.bold,
                },
              ]}
            >
              {changeCount > 0 ? `Save ${changeCount} Change${changeCount > 1 ? "s" : ""}` : "Close"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    height: SHEET_H,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingTop: 12,
    gap: 12,
  },
  dragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerWeekday: { fontSize: 18, lineHeight: 22 },
  headerFull: { fontSize: 12, marginTop: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  subheaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  subheaderText: { fontSize: 12, flex: 1 },
  listContent: { gap: 10, paddingBottom: 4 },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: { fontSize: 14, textAlign: "center" },
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  habitIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  habitName: { fontSize: 14 },
  habitMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryDot: { width: 5, height: 5, borderRadius: 2.5 },
  categoryLabel: { fontSize: 10 },
  streakHint: { fontSize: 10 },
  toggleGroup: { flexDirection: "row", gap: 6 },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  toggleLabel: { fontSize: 11 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 4,
  },
  saveBtnText: { fontSize: 15 },
});
