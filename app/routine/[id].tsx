import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useFont } from "@/hooks/useFont";
import { useHabits, getTodayStr, type Habit } from "@/context/HabitsContext";

const { width: SCREEN_W } = Dimensions.get("window");

export default function FlowRoutinePlayer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const font = useFont();
  const insets = useSafeAreaInsets();
  const { habits, routines, completeHabit, skipHabit, getTodayCompletion } = useHabits();

  const routine = useMemo(() => routines.find((r) => r.id === id), [routines, id]);
  const routineHabits = useMemo(
    () =>
      (routine?.habitIds ?? [])
        .map((hid) => habits.find((h) => h.id === hid))
        .filter(Boolean) as Habit[],
    [routine, habits]
  );

  const [currentIdx, setCurrentIdx] = useState(0);
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({});
  const [isDone, setIsDone] = useState(false);
  const [totalXP, setTotalXP] = useState(0);

  const [timerSec, setTimerSec] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slideX = useRef(new Animated.Value(0)).current;
  const breatheAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1, duration: 3500, useNativeDriver: false }),
        Animated.timing(breatheAnim, { toValue: 0, duration: 3500, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const currentHabit: Habit | undefined = routineHabits[currentIdx];

  useEffect(() => {
    if (!currentHabit) return;
    const secs = (currentHabit.targetDuration ?? 10) * 60;
    setTimerSec(secs);
    setTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);

    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: false }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: false }),
    ]).start();
  }, [currentIdx]);

  useEffect(() => {
    if (!timerRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimerSec((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          setTimerRunning(false);
          if (Platform.OS !== "web")
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  if (!routine || routineHabits.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={[styles.notFoundText, { color: colors.foreground, fontFamily: font.bold }]}>
          Routine not found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.exitBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.exitBtnText, { color: colors.background, fontFamily: font.bold }]}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const habit = currentHabit!;
  const totalHabits = routineHabits.length;
  const habitColor = habit.color;
  const alreadyDone = getTodayCompletion(habit)?.completed ?? false;
  const targetSecs = (habit.targetDuration ?? 10) * 60;
  const timerProgress = 1 - timerSec / targetSecs;

  const bgOpacity = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.08, 0.22],
  });

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const advanceOrFinish = (xpEarned: number) => {
    const next = currentIdx + 1;
    const newTotal = totalXP + xpEarned;
    if (next < totalHabits) {
      Animated.timing(slideX, { toValue: -SCREEN_W, duration: 220, useNativeDriver: false }).start(() => {
        slideX.setValue(SCREEN_W);
        setCurrentIdx(next);
        setTotalXP(newTotal);
        Animated.spring(slideX, { toValue: 0, tension: 75, friction: 11, useNativeDriver: false }).start();
      });
    } else {
      setTotalXP(newTotal);
      setIsDone(true);
    }
  };

  const handleComplete = () => {
    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeHabit(habit.id);
    setCompletedMap((prev) => ({ ...prev, [habit.id]: true }));
    const xp = habit.difficulty === "easy" ? 10 : habit.difficulty === "medium" ? 20 : 30;
    advanceOrFinish(xp);
  };

  const handleSkip = () => {
    skipHabit(habit.id);
    advanceOrFinish(0);
  };

  if (isDone) {
    const doneCount = Object.keys(completedMap).length;
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={[colors.primary + "20", "transparent", colors.primary + "0A"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <ScrollView
          contentContainerStyle={[
            styles.doneScreen,
            { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 48 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.doneIcon, { backgroundColor: colors.primary + "22" }]}>
            <Feather name="check-circle" size={54} color={colors.primary} />
          </View>
          <Text style={[styles.doneTitle, { color: colors.foreground, fontFamily: font.bold }]}>
            {routine.name}
          </Text>
          <Text style={[styles.doneSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
            {doneCount} of {totalHabits} habits completed
          </Text>
          <View style={[styles.xpBadge, { backgroundColor: "#FBBF2422", borderColor: "#FBBF2444" }]}>
            <Feather name="star" size={18} color="#FBBF24" />
            <Text style={[styles.xpBadgeText, { color: "#FBBF24", fontFamily: font.bold }]}>
              +{totalXP} XP earned
            </Text>
          </View>
          <View style={[styles.doneList, { borderColor: colors.glassBorder }]}>
            {routineHabits.map((h) => (
              <View key={h.id} style={[styles.doneRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.doneHabitIcon, { backgroundColor: h.color + "20" }]}>
                  <Feather name={h.icon as any} size={16} color={h.color} />
                </View>
                <Text style={[styles.doneHabitName, { color: colors.foreground, fontFamily: font.medium }]}>
                  {h.name}
                </Text>
                <Feather
                  name={completedMap[h.id] ? "check-circle" : "x-circle"}
                  size={18}
                  color={completedMap[h.id] ? colors.success : colors.destructive + "88"}
                />
              </View>
            ))}
          </View>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.exitBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Text style={[styles.exitBtnText, { color: colors.background, fontFamily: font.bold }]}>
              Back to Home
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Breathing ambient glow */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: bgOpacity }]} pointerEvents="none">
        <LinearGradient
          colors={[habitColor, "transparent"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </Animated.View>

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.closeBtn, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
        >
          <Feather name="x" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.dotTrack}>
          {routineHabits.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i < currentIdx
                      ? colors.success
                      : i === currentIdx
                      ? habitColor
                      : colors.border,
                  width: i === currentIdx ? 22 : 7,
                },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.dotLabel, { color: colors.mutedForeground, fontFamily: font.semibold }]}>
          {currentIdx + 1}/{totalHabits}
        </Text>
        <TouchableOpacity
          onPress={() => router.push(`/create-routine?routineId=${routine.id}`)}
          style={[styles.closeBtn, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
        >
          <Feather name="edit-2" size={16} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Habit content */}
      <Animated.View
        style={[styles.habitArea, { transform: [{ translateX: slideX }], opacity: fadeAnim }]}
      >
        <View style={[styles.bigIcon, { backgroundColor: habitColor + "1E", borderColor: habitColor + "44" }]}>
          <Feather name={habit.icon as any} size={58} color={habitColor} />
        </View>

        <Text style={[styles.habitName, { color: colors.foreground, fontFamily: font.bold }]}>
          {habit.name}
        </Text>
        {habit.description ? (
          <Text style={[styles.habitDesc, { color: colors.mutedForeground, fontFamily: font.regular }]}>
            {habit.description}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <View style={[styles.metaChip, { backgroundColor: habitColor + "1E" }]}>
            <Text style={[styles.metaChipText, { color: habitColor, fontFamily: font.semibold }]}>
              {habit.category}
            </Text>
          </View>
          <View style={[styles.metaChip, { backgroundColor: colors.warning + "1E" }]}>
            <Feather name="zap" size={11} color={colors.warning} />
            <Text style={[styles.metaChipText, { color: colors.warning, fontFamily: font.semibold }]}>
              {habit.difficulty}
            </Text>
          </View>
          {habit.streak > 0 && (
            <View style={[styles.metaChip, { backgroundColor: colors.success + "1E" }]}>
              <Feather name="trending-up" size={11} color={colors.success} />
              <Text style={[styles.metaChipText, { color: colors.success, fontFamily: font.semibold }]}>
                {habit.streak} day streak
              </Text>
            </View>
          )}
        </View>

        {/* Timer for timed habits */}
        {habit.type === "timed" && (
          <View style={[styles.timerBlock, { backgroundColor: habitColor + "12", borderColor: habitColor + "30" }]}>
            <Text style={[styles.timerDigits, { color: colors.foreground, fontFamily: font.bold }]}>
              {formatTime(timerSec)}
            </Text>
            <TouchableOpacity
              onPress={() => setTimerRunning((r) => !r)}
              style={[styles.timerBtn, { backgroundColor: timerRunning ? colors.warning : habitColor }]}
            >
              <Feather name={timerRunning ? "pause" : "play"} size={20} color="#fff" />
            </TouchableOpacity>
            <View style={[styles.timerTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.timerFill,
                  { backgroundColor: habitColor, width: `${Math.min(100, timerProgress * 100)}%` as any },
                ]}
              />
            </View>
          </View>
        )}

        {/* Quantitative target */}
        {habit.type === "quantitative" && habit.targetValue ? (
          <View style={[styles.targetBox, { backgroundColor: habitColor + "12", borderColor: habitColor + "30" }]}>
            <Feather name="target" size={15} color={habitColor} />
            <Text style={[styles.targetText, { color: colors.foreground, fontFamily: font.semibold }]}>
              Target: {habit.targetValue} {habit.targetUnit}
            </Text>
          </View>
        ) : null}
      </Animated.View>

      {/* Bottom actions */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 34 }]}>
        {alreadyDone ? (
          <>
            <View style={[styles.alreadyBox, { backgroundColor: colors.success + "18", borderColor: colors.success + "40" }]}>
              <Feather name="check-circle" size={18} color={colors.success} />
              <Text style={[styles.alreadyText, { color: colors.success, fontFamily: font.semibold }]}>
                Already completed today
              </Text>
            </View>
            <TouchableOpacity onPress={() => advanceOrFinish(0)} style={styles.nextLink}>
              <Text style={[styles.skipText, { color: colors.primary, fontFamily: font.semibold }]}>
                Next →
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={handleComplete}
              style={[styles.completeBtn, { backgroundColor: habitColor }]}
              activeOpacity={0.85}
            >
              <Feather name="check" size={22} color="#fff" />
              <Text style={[styles.completeBtnText, { color: "#fff", fontFamily: font.bold }]}>
                {currentIdx < totalHabits - 1 ? "Complete & Continue" : "Complete Routine"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSkip} style={styles.skipLink}>
              <Text style={[styles.skipText, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                Skip this habit
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFoundText: { fontSize: 20, marginTop: 12 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 12,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  dotTrack: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  dot: { height: 7, borderRadius: 3.5 },
  dotLabel: { fontSize: 13 },

  habitArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  bigIcon: {
    width: 116,
    height: 116,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  habitName: { fontSize: 30, textAlign: "center" },
  habitDesc: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  metaChipText: { fontSize: 12 },

  timerBlock: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 20,
    paddingHorizontal: 28,
    borderRadius: 20,
    borderWidth: 1,
    width: "100%",
    marginTop: 4,
  },
  timerDigits: { fontSize: 52, letterSpacing: -1 },
  timerBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  timerTrack: { height: 4, width: "100%", borderRadius: 2, overflow: "hidden" },
  timerFill: { height: "100%", borderRadius: 2 },

  targetBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  targetText: { fontSize: 15 },

  bottomActions: { paddingHorizontal: 24, gap: 10, alignItems: "center" },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 18,
    borderRadius: 20,
    width: "100%",
  },
  completeBtnText: { fontSize: 18 },
  alreadyBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 20,
    width: "100%",
    borderWidth: 1,
  },
  alreadyText: { fontSize: 16 },
  skipLink: { paddingVertical: 8 },
  nextLink: { paddingVertical: 8 },
  skipText: { fontSize: 14 },

  // Done screen
  doneScreen: { alignItems: "center", gap: 18, paddingHorizontal: 28 },
  doneIcon: { width: 100, height: 100, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  doneTitle: { fontSize: 30, textAlign: "center" },
  doneSub: { fontSize: 16, textAlign: "center" },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  xpBadgeText: { fontSize: 18 },
  doneList: { width: "100%", gap: 0 },
  doneRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderBottomWidth: 1 },
  doneHabitIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  doneHabitName: { flex: 1, fontSize: 14 },
  exitBtn: { paddingHorizontal: 36, paddingVertical: 16, borderRadius: 20, marginTop: 4 },
  exitBtnText: { fontSize: 16 },
});
