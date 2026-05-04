import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { Habit } from "@/context/HabitsContext";

interface WeeklyBarChartProps {
  habits: Habit[];
}

export function WeeklyBarChart({ habits }: WeeklyBarChartProps) {
  const colors = useColors();

  const data = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - 6 + i);
      const dateStr = d.toISOString().split("T")[0];
      const dow = d.getDay();

      let due = 0;
      let done = 0;
      habits.forEach((h) => {
        if (h.archived) return;
        let isDue = false;
        if (h.frequency === "daily") isDue = true;
        else if (h.frequency === "weekdays") isDue = dow >= 1 && dow <= 5;
        else if (h.frequency === "weekends") isDue = dow === 0 || dow === 6;
        else if (h.frequency === "custom") isDue = (h.customDays ?? []).includes(dow);
        if (isDue) {
          due++;
          const completion = h.completions.find((c) => c.date === dateStr);
          if (completion?.completed) done++;
        }
      });

      return {
        label: days[dow].slice(0, 3),
        rate: due > 0 ? done / due : 0,
        done,
        due,
        isToday: i === 6,
      };
    });
  }, [habits]);

  const maxRate = Math.max(...data.map((d) => d.rate), 0.1);

  return (
    <View style={styles.container}>
      {data.map((item, i) => (
        <View key={i} style={styles.barCol}>
          <Text style={[styles.rateLabel, { color: colors.mutedForeground }]}>
            {item.due > 0 ? `${Math.round(item.rate * 100)}%` : ""}
          </Text>
          <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
            <View
              style={[
                styles.barFill,
                {
                  backgroundColor: item.isToday ? colors.primary : colors.accent,
                  height: `${(item.rate / maxRate) * 100}%`,
                  opacity: item.rate === 0 ? 0.3 : 1,
                },
              ]}
            />
          </View>
          <Text
            style={[
              styles.dayLabel,
              { color: item.isToday ? colors.primary : colors.mutedForeground },
            ]}
          >
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    height: 120,
    paddingTop: 20,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    height: "100%",
    justifyContent: "flex-end",
  },
  rateLabel: {
    fontSize: 8,
    fontFamily: "Inter_500Medium",
    position: "absolute",
    top: 0,
  },
  barTrack: {
    width: "100%",
    flex: 1,
    borderRadius: 6,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    borderRadius: 6,
  },
  dayLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
});
