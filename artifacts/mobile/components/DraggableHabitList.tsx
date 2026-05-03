import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import type { Habit } from "@/context/HabitsContext";

const CARD_H = 82;
const MAX_SLOTS = 30;

interface DraggableHabitListProps {
  habits: Habit[];
  reorderMode: boolean;
  renderCard: (habit: Habit, reorderMode: boolean) => React.ReactNode;
  onReorder: (orderedIds: string[]) => void;
}

export function DraggableHabitList({
  habits,
  reorderMode,
  renderCard,
  onReorder,
}: DraggableHabitListProps) {
  const colors = useColors();
  const [orderedIds, setOrderedIds] = useState(() => habits.map((h) => h.id));
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const fromRef = useRef(-1);
  const toRef = useRef(-1);
  const countRef = useRef(habits.length);

  const floatDy = useRef(new Animated.Value(0)).current;
  const floatScale = useRef(new Animated.Value(1)).current;
  const shifts = useRef(
    Array.from({ length: MAX_SLOTS }, () => new Animated.Value(0))
  ).current;

  // Sync orderedIds when the habit list changes externally
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

  const resetShifts = () => shifts.forEach((v) => v.setValue(0));

  const animateShifts = (from: number, to: number, n: number) => {
    for (let i = 0; i < n; i++) {
      if (i === from) continue;
      let target = 0;
      if (from < to && i > from && i <= to) target = -CARD_H;
      if (from > to && i >= to && i < from) target = CARD_H;
      Animated.timing(shifts[i], {
        toValue: target,
        duration: 165,
        useNativeDriver: true,
      }).start();
    }
  };

  // Build the display list from orderedIds
  const orderedHabits = orderedIds
    .map((id) => habits.find((h) => h.id === id))
    .filter((h): h is Habit => h !== undefined);

  const makePanHandlers = (visualIdx: number) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => reorderMode,
      onMoveShouldSetPanResponder: (_, g) =>
        reorderMode && Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),

      onPanResponderGrant: () => {
        fromRef.current = visualIdx;
        toRef.current = visualIdx;
        floatDy.setValue(0);
        Animated.timing(floatScale, {
          toValue: 1.05,
          duration: 110,
          useNativeDriver: true,
        }).start();
        setDraggingIdx(visualIdx);
        if (Platform.OS !== "web")
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },

      onPanResponderMove: (_, g) => {
        const n = countRef.current;
        const clamped = Math.max(
          -(visualIdx * CARD_H),
          Math.min((n - 1 - visualIdx) * CARD_H, g.dy)
        );
        floatDy.setValue(clamped);

        const newTo = Math.max(
          0,
          Math.min(n - 1, Math.round(visualIdx + g.dy / CARD_H))
        );
        if (newTo !== toRef.current) {
          toRef.current = newTo;
          if (Platform.OS !== "web")
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          animateShifts(visualIdx, newTo, n);
        }
      },

      onPanResponderRelease: (_, g) => {
        const n = countRef.current;
        const finalTo = Math.max(
          0,
          Math.min(n - 1, Math.round(visualIdx + g.dy / CARD_H))
        );
        const snapDy = (finalTo - visualIdx) * CARD_H;

        Animated.parallel([
          Animated.timing(floatDy, {
            toValue: snapDy,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(floatScale, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          floatDy.setValue(0);
          floatScale.setValue(1);
          resetShifts();

          setOrderedIds((prev) => {
            const next = [...prev];
            const [moved] = next.splice(visualIdx, 1);
            next.splice(finalTo, 0, moved);
            onReorder(next);
            return next;
          });
          setDraggingIdx(null);
        });

        fromRef.current = -1;
        toRef.current = -1;
      },

      onPanResponderTerminate: () => {
        floatDy.setValue(0);
        floatScale.setValue(1);
        resetShifts();
        setDraggingIdx(null);
        fromRef.current = -1;
        toRef.current = -1;
      },
    }).panHandlers;

  return (
    <View>
      {orderedHabits.map((habit, i) => {
        const isDragging = draggingIdx === i;
        const panHandlers = makePanHandlers(i);

        return (
          <Animated.View
            key={habit.id}
            style={[
              styles.item,
              {
                transform: isDragging
                  ? [{ translateY: floatDy }, { scale: floatScale }]
                  : [{ translateY: shifts[i] }],
                zIndex: isDragging ? 999 : 1,
              },
            ]}
          >
            <View style={styles.row}>
              {/* Drag handle — only visible in reorder mode */}
              {reorderMode && (
                <View
                  {...panHandlers}
                  style={[
                    styles.handle,
                    isDragging && {
                      backgroundColor: colors.primary + "20",
                    },
                  ]}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
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
          </Animated.View>
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
