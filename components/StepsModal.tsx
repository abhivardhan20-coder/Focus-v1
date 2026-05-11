import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useFont } from "@/hooks/useFont";
import { useHabits, getTodayStr } from "@/context/HabitsContext";
import { ProgressRing } from "./ProgressRing";
import { NumHeatmap } from "./NumHeatmap";

const { width: W, height: H } = Dimensions.get("window");
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface StepsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function StepsModal({ visible, onClose }: StepsModalProps) {
  const colors = useColors();
  const font = useFont();
  const { stepsByDate, userStats, logSteps, updateStepsGoal } = useHabits();
  const { stepsGoal } = userStats;

  const slideY = useRef(new Animated.Value(H)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const todayStr = getTodayStr();
  const todaySteps = stepsByDate[todayStr] ?? 0;

  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(stepsGoal));
  const [manualInput, setManualInput] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [viewMode, setViewMode] = useState<"7d" | "30d" | "heat">("7d");

  useEffect(() => {
    if (visible) {
      setGoalInput(String(stepsGoal));
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, tension: 65, friction: 11, useNativeDriver: false }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: false }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY, { toValue: H, duration: 220, useNativeDriver: false }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
      ]).start();
    }
  }, [visible]);

  const week7 = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().split("T")[0];
    return {
      label: DAYS[d.getDay()].slice(0, 1),
      steps: stepsByDate[ds] ?? 0,
      isToday: ds === todayStr,
    };
  }), [stepsByDate, todayStr]);
  const maxSteps = useMemo(() => Math.max(stepsGoal, ...week7.map((d) => d.steps), 1), [week7, stepsGoal]);

  const days30 = useMemo(() => Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const ds = d.toISOString().split("T")[0];
    return { date: ds, steps: stepsByDate[ds] ?? 0, isToday: ds === todayStr };
  }), [stepsByDate, todayStr]);
  const max30 = useMemo(() => Math.max(stepsGoal, ...days30.map(d => d.steps), 1), [days30, stepsGoal]);

  const BAR_MAX_H = 80;
  const chartW = W - 64;

  function addSteps(n: number) {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    logSteps(todayStr, (stepsByDate[todayStr] ?? 0) + n);
  }

  function handleManualSet() {
    const val = parseInt(manualInput, 10);
    if (!isNaN(val) && val >= 0) {
      logSteps(todayStr, val);
      setManualInput("");
      setShowManual(false);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  function handleSaveGoal() {
    const val = parseInt(goalInput, 10);
    if (!isNaN(val) && val > 0) {
      updateStepsGoal(val);
    }
    setEditingGoal(false);
  }

  const progress = Math.min(1, todaySteps / stepsGoal);
  const pct = Math.round(progress * 100);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[styles.sheet, { backgroundColor: colors.card, borderColor: "rgba(255,255,255,0.09)", transform: [{ translateY: slideY }] }]}
        >
          <LinearGradient
            colors={[colors.success + "0A", "transparent"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: colors.success + "20" }]}>
              <Feather name="navigation" size={18} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: font.bold }]}>Step Tracker</Text>
              <Text style={[styles.headerSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                Today · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.secondary }]}>
              <Feather name="x" size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {/* Hero progress ring */}
            <View style={styles.heroRow}>
              <ProgressRing
                size={120}
                strokeWidth={10}
                progress={progress}
                color={colors.success}
                backgroundColor={colors.border}
              >
                <View style={styles.ringInner}>
                  <Text style={[styles.ringSteps, { color: colors.foreground, fontFamily: font.bold }]}>
                    {todaySteps >= 1000 ? `${(todaySteps / 1000).toFixed(1)}k` : todaySteps}
                  </Text>
                  <Text style={[styles.ringLabel, { color: colors.mutedForeground, fontFamily: font.regular }]}>steps</Text>
                </View>
              </ProgressRing>
              <View style={styles.heroStats}>
                <View style={[styles.heroStatBox, { backgroundColor: colors.success + "12", borderColor: colors.success + "28" }]}>
                  <Text style={[styles.heroStatVal, { color: colors.success, fontFamily: font.bold }]}>{pct}%</Text>
                  <Text style={[styles.heroStatLbl, { color: colors.mutedForeground, fontFamily: font.regular }]}>of goal</Text>
                </View>
                <View style={[styles.heroStatBox, { backgroundColor: colors.secondary, borderColor: colors.glassBorder }]}>
                  <Text style={[styles.heroStatVal, { color: colors.foreground, fontFamily: font.bold }]}>
                    {Math.max(0, stepsGoal - todaySteps).toLocaleString()}
                  </Text>
                  <Text style={[styles.heroStatLbl, { color: colors.mutedForeground, fontFamily: font.regular }]}>remaining</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setEditingGoal(true)}
                  style={[styles.heroStatBox, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "28" }]}
                >
                  {editingGoal ? (
                    <TextInput
                      value={goalInput}
                      onChangeText={setGoalInput}
                      onBlur={handleSaveGoal}
                      onSubmitEditing={handleSaveGoal}
                      keyboardType="numeric"
                      style={[styles.goalInput, { color: colors.primary, fontFamily: font.bold }]}
                      autoFocus
                    />
                  ) : (
                    <Text style={[styles.heroStatVal, { color: colors.primary, fontFamily: font.bold }]}>
                      {stepsGoal >= 1000 ? `${(stepsGoal / 1000).toFixed(0)}k` : stepsGoal}
                    </Text>
                  )}
                  <Text style={[styles.heroStatLbl, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                    {editingGoal ? "tap ✓" : "goal ✏️"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick-add buttons */}
            <View style={styles.quickRow}>
              {[100, 500, 1000, 2000].map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => addSteps(n)}
                  style={[styles.quickBtn, { backgroundColor: colors.success + "14", borderColor: colors.success + "30" }]}
                >
                  <Text style={[styles.quickBtnText, { color: colors.success, fontFamily: font.bold }]}>+{n >= 1000 ? `${n / 1000}k` : n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Manual entry toggle */}
            <TouchableOpacity
              onPress={() => setShowManual(!showManual)}
              style={[styles.manualToggle, { borderColor: colors.glassBorder, backgroundColor: colors.secondary }]}
            >
              <Feather name="edit-3" size={14} color={colors.mutedForeground} />
              <Text style={[styles.manualToggleTxt, { color: colors.mutedForeground, fontFamily: font.regular }]}>Set exact count</Text>
              <Feather name={showManual ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
            </TouchableOpacity>

            {showManual && (
              <View style={styles.manualRow}>
                <TextInput
                  value={manualInput}
                  onChangeText={setManualInput}
                  placeholder="e.g. 8432"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                  style={[styles.manualInput, { color: colors.foreground, borderColor: colors.glassBorder, backgroundColor: colors.secondary, fontFamily: font.regular }]}
                />
                <TouchableOpacity
                  onPress={handleManualSet}
                  style={[styles.manualConfirm, { backgroundColor: colors.success }]}
                >
                  <Feather name="check" size={16} color={colors.background} />
                </TouchableOpacity>
              </View>
            )}

            {/* Analytics card with tabs */}
            <View style={[styles.chartCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
              {/* Tab row */}
              <View style={styles.chartTabRow}>
                <Text style={[styles.chartTitle, { color: colors.foreground, fontFamily: font.semibold }]}>Steps History</Text>
                <View style={styles.chartTabs}>
                  {(["7d", "30d", "heat"] as const).map((v) => {
                    const active = viewMode === v;
                    return (
                      <TouchableOpacity
                        key={v}
                        onPress={() => {
                          setViewMode(v);
                          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={[
                          styles.chartTab,
                          {
                            backgroundColor: active ? colors.success + "22" : "transparent",
                            borderColor: active ? colors.success : colors.glassBorder,
                          },
                        ]}
                      >
                        <Text style={[styles.chartTabText, { color: active ? colors.success : colors.mutedForeground, fontFamily: active ? font.bold : font.regular }]}>
                          {v === "heat" ? "1Y" : v.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 7-day bars */}
              {viewMode === "7d" && (
                <>
                  <View style={styles.chartArea}>
                    {week7.map((day, i) => {
                      const barH = Math.max(4, (day.steps / maxSteps) * BAR_MAX_H);
                      return (
                        <View key={i} style={styles.barCol}>
                          <View style={[styles.barOuter, { height: BAR_MAX_H }]}>
                            <View
                              style={[styles.barFill, {
                                height: barH,
                                backgroundColor: day.steps >= stepsGoal ? colors.success : colors.success + "50",
                                borderRadius: 4,
                              }]}
                            />
                            {day.steps > 0 && (
                              <Text style={[styles.barValue, { color: day.isToday ? colors.success : colors.mutedForeground, fontFamily: font.regular }]} numberOfLines={1}>
                                {day.steps >= 1000 ? `${(day.steps / 1000).toFixed(1)}k` : day.steps}
                              </Text>
                            )}
                          </View>
                          <Text style={[styles.barLabel, { color: day.isToday ? colors.success : colors.mutedForeground, fontFamily: day.isToday ? font.bold : font.regular }]}>
                            {day.label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                  <Text style={[styles.chartGoalLine, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                    Goal: {stepsGoal >= 1000 ? `${(stepsGoal / 1000).toFixed(0)}k` : stepsGoal} steps/day
                  </Text>
                </>
              )}

              {/* 30-day SVG bars */}
              {viewMode === "30d" && (
                <>
                  <Svg width={chartW} height={80}>
                    {days30.map((day, i) => {
                      const bw   = (chartW - 30) / 30;
                      const barH = Math.max(2, (day.steps / max30) * 66);
                      const bc   = day.isToday
                        ? colors.success
                        : day.steps >= stepsGoal
                        ? colors.success + "BB"
                        : day.steps > 0
                        ? colors.success + "55"
                        : colors.glassBorder;
                      return (
                        <Rect
                          key={i}
                          x={i * (bw + 1)}
                          y={66 - barH}
                          width={bw}
                          height={barH}
                          rx={2}
                          fill={bc}
                        />
                      );
                    })}
                  </Svg>
                  <View style={styles.chartFooterRow}>
                    <Text style={[styles.chartGoalLine, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                      Total: {days30.reduce((a, d) => a + d.steps, 0).toLocaleString()} steps
                    </Text>
                    <Text style={[styles.chartGoalLine, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                      Avg: {Math.round(days30.reduce((a, d) => a + d.steps, 0) / 30).toLocaleString()}/day
                    </Text>
                  </View>
                </>
              )}

              {/* 1-year heatmap */}
              {viewMode === "heat" && (
                <NumHeatmap
                  data={stepsByDate}
                  maxVal={stepsGoal}
                  color={colors.success}
                  weeks={52}
                  label="steps"
                />
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    maxHeight: "88%",
    overflow: "hidden",
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17 },
  headerSub: { fontSize: 12, marginTop: 1 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    paddingHorizontal: 18,
    paddingBottom: 40,
    gap: 14,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  ringInner: { alignItems: "center" },
  ringSteps: { fontSize: 22, lineHeight: 26 },
  ringLabel: { fontSize: 10, marginTop: 1 },
  heroStats: { flex: 1, gap: 7 },
  heroStatBox: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroStatVal: { fontSize: 16, lineHeight: 20 },
  heroStatLbl: { fontSize: 10, marginTop: 1 },
  goalInput: { fontSize: 16, padding: 0 },
  quickRow: {
    flexDirection: "row",
    gap: 8,
  },
  quickBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  quickBtnText: { fontSize: 13 },
  manualToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  manualToggleTxt: { flex: 1, fontSize: 13 },
  manualRow: {
    flexDirection: "row",
    gap: 8,
  },
  manualInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  manualConfirm: {
    width: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  chartCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  chartTabRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chartTitle: { fontSize: 13 },
  chartTabs: { flexDirection: "row", gap: 4 },
  chartTab: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7, borderWidth: 1 },
  chartTabText: { fontSize: 10 },
  chartFooterRow: { flexDirection: "row", justifyContent: "space-between" },
  chartArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  barOuter: {
    justifyContent: "flex-end",
    alignItems: "center",
    width: "100%",
    gap: 3,
  },
  barFill: {
    width: "70%",
  },
  barValue: { fontSize: 8, textAlign: "center" },
  barLabel: { fontSize: 10 },
  chartGoalLine: { fontSize: 10, textAlign: "center", opacity: 0.6 },
});
