import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { HabitCompletion } from "@/context/HabitsContext";

interface HeatmapChartProps {
  completions: HabitCompletion[];
  color: string;
  weeks?: number;
}

export function HeatmapChart({ completions, color, weeks = 12 }: HeatmapChartProps) {
  const colors = useColors();

  const grid = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completionMap = new Map<string, boolean>();
    completions.forEach((c) => {
      completionMap.set(c.date, c.completed);
    });

    const cols: { date: string; completed: boolean }[][] = [];
    const startOffset = today.getDay();
    const totalDays = weeks * 7;
    const startDay = new Date(today);
    startDay.setDate(today.getDate() - totalDays + 1 - startOffset);

    for (let w = 0; w < weeks; w++) {
      const col: { date: string; completed: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(startDay);
        day.setDate(startDay.getDate() + w * 7 + d);
        const dateStr = day.toISOString().split("T")[0];
        const isFuture = day > today;
        col.push({
          date: dateStr,
          completed: !isFuture && (completionMap.get(dateStr) ?? false),
        });
      }
      cols.push(col);
    }
    return cols;
  }, [completions, weeks]);

  const days = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <View style={styles.container}>
      <View style={styles.dayLabels}>
        {days.map((d, i) => (
          <Text key={i} style={[styles.dayLabel, { color: colors.mutedForeground }]}>
            {i % 2 === 0 ? d : ""}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {grid.map((col, wi) => (
          <View key={wi} style={styles.col}>
            {col.map((cell, di) => (
              <View
                key={di}
                style={[
                  styles.cell,
                  {
                    backgroundColor: cell.completed
                      ? color
                      : colors.muted,
                    opacity: cell.completed ? 1 : 0.5,
                  },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 4,
  },
  dayLabels: {
    gap: 2,
    paddingTop: 2,
  },
  dayLabel: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    height: 14,
    lineHeight: 14,
    width: 10,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    gap: 2,
    flex: 1,
  },
  col: {
    gap: 2,
  },
  cell: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
});
