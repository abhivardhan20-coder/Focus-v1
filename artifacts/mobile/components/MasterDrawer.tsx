import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useFont } from "@/hooks/useFont";
import { PILLAR_COLORS, type Habit, type Routine } from "@/context/HabitsContext";
import { ProgressRing } from "./ProgressRing";
import { SparklineChart } from "./SparklineChart";

const { width: W } = Dimensions.get("window");
const PANEL_W = Math.min(W * 0.86, 360);
const SPARK_DAYS = 14;

function buildSparkline(habit: Habit): number[] {
  return Array.from({ length: SPARK_DAYS }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (SPARK_DAYS - 1 - i));
    const ds = d.toISOString().split("T")[0];
    return habit.completions.find((c) => c.date === ds)?.completed ? 1 : 0;
  });
}

export interface MasterDrawerProps {
  visible: boolean;
  onClose: () => void;
  habits: Habit[];
  routines: Routine[];
  habitStats: Record<string, { rate: number; done: number; due: number }>;
  onHabitPress?: (habit: Habit) => void;
}

export function MasterDrawer({ visible, onClose, habits, routines, habitStats, onHabitPress }: MasterDrawerProps) {
  const colors = useColors();
  const font = useFont();
  const [tab, setTab] = useState<"habits" | "routines">("habits");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const translateX = useSharedValue(PANEL_W);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateX.value = withSpring(0, { damping: 22, stiffness: 200 });
      backdropOpacity.value = withTiming(1, { duration: 260 });
    } else {
      translateX.value = withTiming(PANEL_W, { duration: 220 });
      backdropOpacity.value = withTiming(0, { duration: 200 });
      setExpandedId(null);
    }
  }, [visible]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        </Animated.View>

        {/* Panel */}
        <Animated.View style={[styles.panel, { backgroundColor: colors.card, borderColor: "rgba(255,255,255,0.08)" }, panelStyle]}>
          <LinearGradient
            colors={["rgba(255,255,255,0.05)", "transparent"]}
            style={StyleSheet.absoluteFill} pointerEvents="none"
          />

          {/* Header */}
          <View style={[styles.panelHdr, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.panelTitle, { color: colors.primary, fontFamily: font.bold }]}>
                FOCUS
              </Text>
              <Text style={[styles.panelSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                Master Analytics Panel
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.secondary }]}>
              <Feather name="x" size={17} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Tab bar */}
          <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
            {(["habits", "routines"] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => { setTab(t); setExpandedId(null); }}
                style={[styles.tab, tab === t && [styles.tabActive, { borderBottomColor: colors.primary }]]}
              >
                <Text style={[
                  styles.tabTxt,
                  { color: tab === t ? colors.primary : colors.mutedForeground, fontFamily: tab === t ? font.semibold : font.regular }
                ]}>
                  {t === "habits" ? "HABITS" : "ROUTINES"}
                </Text>
                <View style={[styles.tabBadge, { backgroundColor: tab === t ? colors.primary + "20" : colors.secondary }]}>
                  <Text style={[styles.tabBadgeTxt, { color: tab === t ? colors.primary : colors.mutedForeground, fontFamily: font.bold }]}>
                    {t === "habits" ? activeHabits.length : routines.length}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* List */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
            {tab === "habits" ? (
              activeHabits.length === 0 ? (
                <View style={styles.empty}>
                  <Feather name="activity" size={30} color={colors.mutedForeground} />
                  <Text style={[styles.emptyTxt, { color: colors.mutedForeground, fontFamily: font.regular }]}>No habits yet</Text>
                </View>
              ) : (
                activeHabits.map((h) => {
                  const hs = habitStats[h.id] ?? { rate: 0, done: 0, due: 0 };
                  const isOpen = expandedId === h.id;
                  const clr = PILLAR_COLORS[h.category];
                  const spark = buildSparkline(h);
                  return (
                    <View key={h.id}>
                      <TouchableOpacity
                        onPress={() => onHabitPress ? onHabitPress(h) : setExpandedId(isOpen ? null : h.id)}
                        activeOpacity={0.75}
                        style={[
                          styles.habitRow,
                          {
                            backgroundColor: isOpen ? clr + "0E" : "transparent",
                            borderColor: isOpen ? clr + "35" : colors.border,
                          },
                        ]}
                      >
                        <View style={[styles.habitIcon, { backgroundColor: clr + "22" }]}>
                          <Feather name={h.icon as any} size={15} color={clr} />
                        </View>
                        <View style={styles.habitBody}>
                          <Text style={[styles.habitName, { color: colors.foreground, fontFamily: font.medium }]} numberOfLines={1}>
                            {h.name}
                          </Text>
                          <View style={[styles.miniBar, { backgroundColor: colors.border }]}>
                            <View style={[styles.miniBarFill, { backgroundColor: hs.rate >= 0.8 ? colors.success : clr, width: `${hs.rate * 100}%` }]} />
                          </View>
                        </View>
                        <View style={styles.habitRight}>
                          {h.streak > 0 && (
                            <Text style={[styles.streakTxt, { color: "#FBBF24", fontFamily: font.bold }]}>
                              {h.streak}🔥
                            </Text>
                          )}
                          <Text style={[styles.rateTxt, { color: hs.rate >= 0.8 ? colors.success : clr, fontFamily: font.bold }]}>
                            {Math.round(hs.rate * 100)}%
                          </Text>
                        </View>
                        <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={13} color={colors.mutedForeground} />
                      </TouchableOpacity>

                      {/* Micro-dashboard */}
                      {isOpen && (
                        <View style={[styles.microDash, { backgroundColor: clr + "08", borderColor: clr + "25" }]}>
                          <View style={styles.microTop}>
                            <ProgressRing size={68} strokeWidth={5} progress={hs.rate} color={clr} backgroundColor={clr + "22"}>
                              <Text style={[styles.microRingNum, { color: colors.foreground, fontFamily: font.bold }]}>
                                {Math.round(hs.rate * 100)}%
                              </Text>
                            </ProgressRing>
                            <View style={styles.microStats}>
                              {[
                                { val: hs.done, lbl: "done" },
                                { val: h.streak, lbl: "streak", clr: "#FBBF24" },
                                { val: h.longestStreak, lbl: "best" },
                              ].map((s) => (
                                <View key={s.lbl} style={styles.microStat}>
                                  <Text style={[styles.microStatVal, { color: (s as any).clr ?? colors.foreground, fontFamily: font.bold }]}>
                                    {s.val}
                                  </Text>
                                  <Text style={[styles.microStatLbl, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                                    {s.lbl}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </View>
                          <Text style={[styles.sparkLbl, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                            14-day completion
                          </Text>
                          <SparklineChart data={spark} width={PANEL_W - 52} height={36} color={clr} strokeWidth={2} />
                        </View>
                      )}
                    </View>
                  );
                })
              )
            ) : (
              routines.length === 0 ? (
                <View style={styles.empty}>
                  <Feather name="list" size={30} color={colors.mutedForeground} />
                  <Text style={[styles.emptyTxt, { color: colors.mutedForeground, fontFamily: font.regular }]}>No routines yet</Text>
                  <TouchableOpacity
                    onPress={() => router.push("/create-routine" as any)}
                    style={[styles.createRoutineBtn, { backgroundColor: colors.primary }]}
                  >
                    <Feather name="plus" size={14} color={colors.background} />
                    <Text style={[styles.createRoutineBtnTxt, { color: colors.background, fontFamily: font.semibold }]}>
                      Create Routine
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                routines.map((r) => (
                  <View key={r.id} style={[styles.routineRow, { borderColor: colors.border }]}>
                    <View style={[styles.routineIcon, { backgroundColor: colors.primary + "20" }]}>
                      <Feather name="list" size={15} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.habitName, { color: colors.foreground, fontFamily: font.medium }]} numberOfLines={1}>
                        {r.name}
                      </Text>
                      <Text style={[styles.routineSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                        {r.habitIds.length} habit{r.habitIds.length !== 1 ? "s" : ""} · {r.timeOfDay}
                      </Text>
                    </View>
                  </View>
                ))
              )
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.65)" },
  panel: {
    width: PANEL_W,
    flex: 1,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    overflow: "hidden",
    borderLeftWidth: 1,
  },
  panelHdr: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: 56,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  panelTitle: { fontSize: 20 },
  panelSub: { fontSize: 11, marginTop: 1 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2 },
  tabTxt: { fontSize: 11 },
  tabBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 9 },
  tabBadgeTxt: { fontSize: 10 },
  listContent: { padding: 12, gap: 5, paddingBottom: 48 },
  habitRow: { flexDirection: "row", alignItems: "center", gap: 9, padding: 10, borderRadius: 12, borderWidth: 1 },
  habitIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  habitBody: { flex: 1, gap: 6 },
  habitName: { fontSize: 13 },
  miniBar: { height: 3, borderRadius: 2, overflow: "hidden" },
  miniBarFill: { height: "100%" },
  habitRight: { alignItems: "flex-end", gap: 2 },
  streakTxt: { fontSize: 10 },
  rateTxt: { fontSize: 12 },
  microDash: { marginTop: 3, marginBottom: 5, padding: 12, borderRadius: 12, borderWidth: 1, gap: 8 },
  microTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  microRingNum: { fontSize: 12 },
  microStats: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
  microStat: { alignItems: "center", gap: 2 },
  microStatVal: { fontSize: 18 },
  microStatLbl: { fontSize: 10 },
  sparkLbl: { fontSize: 10 },
  routineRow: { flexDirection: "row", alignItems: "center", gap: 9, padding: 10, borderRadius: 12, borderWidth: 1 },
  routineIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  routineSub: { fontSize: 11, marginTop: 2 },
  empty: { alignItems: "center", gap: 10, paddingVertical: 48 },
  emptyTxt: { fontSize: 13 },
  createRoutineBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  createRoutineBtnTxt: { fontSize: 13 },
});
