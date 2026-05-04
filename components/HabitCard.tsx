import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ReAnimated, {
  Easing as REasing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useFont } from "@/hooks/useFont";
import type { Habit } from "@/context/HabitsContext";
import { getTodayStr } from "@/context/HabitsContext";

interface HabitCardProps {
  habit: Habit;
  isCompleted: boolean;
  isSkipped?: boolean;
  onComplete: () => void;
  onIncrement?: () => void;
  onSkip: () => void;
  onArchive: () => void;
  onPress: () => void;
  onLongPress?: () => void;
  currentValue?: number;
  readonly?: boolean;
  reorderMode?: boolean;
}

const SWIPE_THRESHOLD = 80;
const STREAK_MILESTONES = [1, 3, 7, 14, 30];

function PulseDot({
  active,
  color,
  isHighest,
}: {
  active: boolean;
  color: string;
  isHighest: boolean;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (active && isHighest) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.55, { duration: 700, easing: REasing.out(REasing.ease) }),
          withTiming(1.0, { duration: 900, easing: REasing.in(REasing.ease) }),
          withTiming(1.0, { duration: 600 })
        ),
        -1,
        false
      );
    } else {
      scale.value = withTiming(1.0, { duration: 200 });
    }
  }, [active, isHighest]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const size = active ? 7 : 5;

  return (
    <ReAnimated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: active ? color : "rgba(255,255,255,0.12)",
        },
        active && isHighest ? animStyle : undefined,
      ]}
    />
  );
}

function StreakDots({ streak, color }: { streak: number; color: string }) {
  const highestActive = STREAK_MILESTONES.reduce(
    (acc, m) => (streak >= m ? m : acc),
    -1
  );
  return (
    <View style={styles.dotsRow}>
      {STREAK_MILESTONES.map((milestone) => (
        <PulseDot
          key={milestone}
          active={streak >= milestone}
          color={color}
          isHighest={milestone === highestActive}
        />
      ))}
    </View>
  );
}

function LiquidProgressBar({
  progress,
  color,
  borderColor,
}: {
  progress: number;
  color: string;
  borderColor: string;
}) {
  const fillColor = progress >= 1 ? "#4ade80" : color;
  return (
    <View style={[styles.progressBar, { backgroundColor: borderColor }]}>
      <LinearGradient
        colors={[fillColor + "EE", fillColor + "88"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.progressFill, { width: `${Math.min(100, progress * 100)}%` as any }]}
      />
    </View>
  );
}

export function HabitCard({
  habit,
  isCompleted,
  isSkipped,
  onComplete,
  onSkip,
  onArchive,
  onPress,
  onLongPress,
  currentValue,
  onIncrement,
  readonly,
  reorderMode,
}: HabitCardProps) {
  const colors = useColors();
  const font = useFont();
  const translateX = useRef(new Animated.Value(0)).current;

  const handleLongPress = () => {
    if (readonly || reorderMode) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onLongPress?.();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        !readonly && !reorderMode && Math.abs(g.dx) > 10 && Math.abs(g.dy) < 30,
      onPanResponderMove: (_, g) => {
        translateX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_THRESHOLD) {
          Animated.timing(translateX, {
            toValue: 400,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            if (Platform.OS !== "web")
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            onArchive();
            translateX.setValue(0);
          });
        } else if (g.dx < -SWIPE_THRESHOLD) {
          Animated.timing(translateX, {
            toValue: -400,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            if (Platform.OS !== "web")
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onSkip();
            translateX.setValue(0);
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 160,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  const todayStr = getTodayStr();
  const isInComeback = !!(habit.comebackUntil && habit.comebackUntil >= todayStr);
  const todayComp = habit.completions.find((c) => c.date === todayStr);
  const isMicroToday = todayComp?.isMicro ?? false;

  const difficultyColor =
    habit.difficulty === "easy"
      ? colors.success
      : habit.difficulty === "medium"
      ? colors.warning
      : colors.destructive;

  const progress =
    habit.type === "quantitative" && habit.targetValue
      ? Math.min(1, (currentValue ?? 0) / habit.targetValue)
      : isCompleted
      ? 1
      : 0;

  const habitColor = habit.color;
  const statusOpacity = 1;

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.swipeReveal,
          styles.swipeRevealLeft,
          { backgroundColor: colors.info + "18" },
        ]}
      >
        <Feather name="archive" size={18} color={colors.info} />
        <Text style={[styles.swipeLabel, { color: colors.info, fontFamily: font.medium }]}>
          Freeze
        </Text>
      </View>
      <View
        style={[
          styles.swipeReveal,
          styles.swipeRevealRight,
          { backgroundColor: colors.warning + "18" },
        ]}
      >
        <Feather name="minus-circle" size={16} color={colors.warning} />
        <Text style={[styles.swipeLabel, { color: colors.warning, fontFamily: font.medium }]}>
          Skip
        </Text>
      </View>

      <Animated.View
        style={{ transform: [{ translateX }], opacity: statusOpacity }}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={onPress}
          onLongPress={handleLongPress}
          delayLongPress={400}
          style={[
            styles.card,
            {
              backgroundColor: isInComeback
                ? "#F9731608"
                : habit.important
                ? habitColor + "0A"
                : colors.card,
              borderColor: isInComeback
                ? "#F9731655"
                : habit.important
                ? habitColor + "80"
                : isCompleted
                ? habitColor + "55"
                : colors.glassBorder,
              borderLeftColor: isInComeback ? "#F97316" : habitColor,
            },
          ]}
        >
          {/* Inner glass highlight */}
          <LinearGradient
            colors={["rgba(255,255,255,0.05)", "rgba(255,255,255,0.0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          {habit.important && (
            <View style={[styles.pinBadge, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
              <Feather name="bookmark" size={9} color="#FBBF24" />
            </View>
          )}
          <View style={[styles.iconWrap, { backgroundColor: habitColor + "1E" }]}>
            <Feather name={habit.icon as any} size={18} color={habitColor} />
          </View>

          <View style={styles.body}>
            <View style={styles.topRow}>
              <Text
                style={[
                  styles.name,
                  {
                    color: colors.foreground,
                    fontFamily: font.semibold,
                    textDecorationLine: isCompleted ? "line-through" : "none",
                    opacity: isCompleted ? 0.7 : 1,
                  },
                ]}
                numberOfLines={1}
              >
                {habit.name}
              </Text>
              {isSkipped && !isCompleted && (
                <View style={[styles.graceBadge, { backgroundColor: colors.warning + "22" }]}>
                  <Feather name="minus-circle" size={9} color={colors.warning} />
                  <Text
                    style={[styles.graceText, { color: colors.warning, fontFamily: font.semibold }]}
                  >
                    Skipped
                  </Text>
                </View>
              )}
              {isInComeback && !isCompleted && (
                <View style={[styles.graceBadge, { backgroundColor: "#F9731622" }]}>
                  <Feather name="zap" size={9} color="#F97316" />
                  <Text style={[styles.graceText, { color: "#F97316", fontFamily: font.semibold }]}>
                    2× XP
                  </Text>
                </View>
              )}
              {isMicroToday && isCompleted && (
                <View style={[styles.graceBadge, { backgroundColor: "#F9731622" }]}>
                  <View style={[styles.microDot, { backgroundColor: "#F97316" }]} />
                  <Text style={[styles.graceText, { color: "#F97316", fontFamily: font.semibold }]}>
                    micro
                  </Text>
                </View>
              )}
              <View style={[styles.diffPill, { backgroundColor: difficultyColor + "22" }]}>
                <View style={[styles.diffDot, { backgroundColor: difficultyColor }]} />
              </View>
            </View>

            <View style={styles.metaRow}>
              <StreakDots streak={habit.streak} color={habitColor} />
              {habit.streak > 0 && (
                <View style={styles.streakCount}>
                  <Feather name="zap" size={10} color={colors.warning} />
                  <Text
                    style={[
                      styles.streakNum,
                      { color: colors.warning, fontFamily: font.bold },
                    ]}
                  >
                    {habit.streak}
                  </Text>
                </View>
              )}
              {habit.type === "quantitative" && habit.targetValue && (
                <Text
                  style={[
                    styles.progressTxt,
                    { color: colors.mutedForeground, fontFamily: font.regular },
                  ]}
                >
                  {currentValue ?? 0}/{habit.targetValue} {habit.targetUnit}
                </Text>
              )}
              {habit.type === "timed" && habit.targetDuration && (
                <Text
                  style={[
                    styles.progressTxt,
                    { color: colors.mutedForeground, fontFamily: font.regular },
                  ]}
                >
                  {habit.targetDuration} min
                </Text>
              )}
            </View>

            {habit.type === "quantitative" && habit.targetValue && (
              <LiquidProgressBar
                progress={progress}
                color={habitColor}
                borderColor={colors.border}
              />
            )}
          </View>

          {!readonly && habit.type === "quantitative" && !isCompleted && onIncrement ? (
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS !== "web")
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onIncrement();
              }}
              style={[
                styles.checkBtn,
                {
                  backgroundColor: habitColor + "22",
                  borderColor: habitColor,
                  borderWidth: 2,
                },
              ]}
            >
              <Feather name="plus" size={18} color={habitColor} />
            </TouchableOpacity>
          ) : !readonly ? (
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS !== "web")
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onComplete();
              }}
              style={[
                styles.checkBtn,
                {
                  backgroundColor: isCompleted ? habitColor : "transparent",
                  borderColor: isCompleted ? habitColor : colors.border,
                  borderWidth: 2,
                },
              ]}
            >
              <Feather
                name={habit.type === "binary" ? (isCompleted ? "check" : "circle") : isCompleted ? "check" : "circle"}
                size={14}
                color={isCompleted ? colors.background : colors.mutedForeground}
              />
            </TouchableOpacity>
          ) : null}

          {readonly && (
            <Feather
              name={isCompleted ? "check-circle" : "circle"}
              size={20}
              color={isCompleted ? colors.success : colors.border}
            />
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: "relative", marginBottom: 8 },
  swipeReveal: {
    position: "absolute",
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 2,
  },
  swipeRevealLeft: { left: 0 },
  swipeRevealRight: { right: 0 },
  swipeLabel: { fontSize: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
    overflow: "hidden",
    position: "relative",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 5 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { flex: 1, fontSize: 14 },
  graceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  graceText: { fontSize: 9 },
  diffPill: { padding: 4, borderRadius: 6 },
  diffDot: { width: 5, height: 5, borderRadius: 2.5 },
  microDot: { width: 7, height: 7, borderRadius: 3.5 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dotsRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  streakCount: { flexDirection: "row", alignItems: "center", gap: 2 },
  streakNum: { fontSize: 11 },
  progressTxt: { fontSize: 10 },
  progressBar: { height: 3, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  checkBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  pinBadge: {
    position: "absolute",
    top: 8,
    right: 10,
    zIndex: 2,
    width: 18,
    height: 18,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
});
