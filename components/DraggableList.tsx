import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import ReAnimated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import type { Habit } from "@/context/HabitsContext";

const CARD_H = 82;
const MAX_SLOTS = 30;

interface DraggableListProps {
  habits: Habit[];
  reorderMode: boolean;
  renderCard: (habit: Habit, reorderMode: boolean) => React.ReactNode;
  onReorder: (orderedIds: string[]) => void;
}

export function DraggableList({
  habits,
  reorderMode,
  renderCard,
  onReorder,
}: DraggableListProps) {
  const colors = useColors();
  const [orderedIds, setOrderedIds] = useState(() => habits.map((h) => h.id));
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const fromRef = useRef(-1);
  const toRef = useRef(-1);
  const countRef = useRef(habits.length);

  const floatDy = useSharedValue(0);
  const floatScale = useSharedValue(1);
  const shifts = [
    useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0),
    useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0),
    useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0),
    useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0),
    useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0),
    useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0),
  ];

  const habitsKey = habits.map((h) => h.id).join(",");
  useEffect(() => {
    countRef.current = habits.length;
    setOrderedIds((prev) => {
      const existing = new Set(habits.map((h) => h.id));
      const kept = prev.filter((id) => existing.has(id));
      habits.forEach((h) => {
        if (!kept.includes(h.id)) kept.push(h.id);
      });
      return kept;
    });
  }, [habitsKey]);

  const resetShifts = () => shifts.forEach((v) => (v.value = 0));

  const animateShifts = (from: number, to: number, n: number) => {
    for (let i = 0; i < n; i++) {
      if (i === from) continue;
      let target = 0;
      if (from < to && i > from && i <= to) target = -CARD_H;
      if (from > to && i >= to && i < from) target = CARD_H;
      shifts[i].value = withTiming(target, { duration: 165 });
    }
  };

  const orderedHabits = orderedIds
    .map((id) => habits.find((h) => h.id === id))
    .filter((h): h is Habit => h !== undefined);

  const makePanGesture = (visualIdx: number) =>
    Gesture.Pan()
      .onStart(() => {
        if (!reorderMode) return;
        fromRef.current = visualIdx;
        toRef.current = visualIdx;
        floatDy.value = 0;
        floatScale.value = withTiming(1.05, { duration: 110 });
        runOnJS(setDraggingIdx)(visualIdx);
        if (Platform.OS !== "web") runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      })
      .onUpdate((event) => {
        if (!reorderMode) return;
        const n = countRef.current;
        const clamped = Math.max(
          -(visualIdx * CARD_H),
          Math.min((n - 1 - visualIdx) * CARD_H, event.translationY)
        );
        floatDy.value = clamped;

        const newTo = Math.max(
          0,
          Math.min(n - 1, Math.round(visualIdx + event.translationY / CARD_H))
        );
        if (newTo !== toRef.current) {
          toRef.current = newTo;
          if (Platform.OS !== "web") runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
          runOnJS(animateShifts)(visualIdx, newTo, n);
        }
      })
      .onEnd((event) => {
        if (!reorderMode) return;
        const n = countRef.current;
        const finalTo = Math.max(
          0,
          Math.min(n - 1, Math.round(visualIdx + event.translationY / CARD_H))
        );
        const snapDy = (finalTo - visualIdx) * CARD_H;

        floatDy.value = withTiming(snapDy, { duration: 200 });
        floatScale.value = withTiming(1, { duration: 200 }, () => {
          floatDy.value = 0;
          runOnJS(resetShifts)();
          runOnJS(setDraggingIdx)(null);
          runOnJS(setOrderedIds)((prev: string[]) => {
            const next = [...prev];
            const [moved] = next.splice(visualIdx, 1);
            next.splice(finalTo, 0, moved);
            runOnJS(onReorder)(next);
            return next;
          });
        });

        fromRef.current = -1;
        toRef.current = -1;
      });

  return (
    <View>
      {orderedHabits.map((habit, i) => {
        const isDragging = draggingIdx === i;

        return (
          <View key={habit.id}>
            <GestureDetector gesture={makePanGesture(i)}>
              <ReAnimated.View
                style={[
                  styles.item,
                  // eslint-disable-next-line react-hooks/rules-of-hooks
                  useAnimatedStyle(() => ({
                    transform: draggingIdx === i
                      ? [{ translateY: floatDy.value }, { scale: floatScale.value }]
                      : [{ translateY: shifts[i].value }],
                    zIndex: draggingIdx === i ? 999 : 1,
                  })),
                ]}
              >
                <View style={styles.row}>
                  {reorderMode && (
                    <View
                      style={[
                        styles.handle,
                        isDragging && {
                          backgroundColor: colors.primary + "20",
                        },
                      ]}
                    >
                      <Feather
                        name="menu"
                        size={17}
                        color={isDragging ? colors.primary : colors.mutedForeground}
                      />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    {renderCard(habit, reorderMode)}
                  </View>
                </View>
              </ReAnimated.View>
            </GestureDetector>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { position: "relative" },
  row: { flexDirection: "row", alignItems: "center" },
  handle: {
    width: 34,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    borderRadius: 10,
    marginRight: 2,
  },
});
