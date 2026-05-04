import React, { useRef, useEffect } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export interface DaySelectorDay {
  dateStr: string;
  label: string;
  dayNum: number;
  month: string;
  isToday: boolean;
  completionRate: number;
}

interface DaySelectorProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  completionRates?: Record<string, number>;
  numDays?: number;
}

function buildDays(numDays: number, completionRates: Record<string, number>): DaySelectorDay[] {
  const days: DaySelectorDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    days.push({
      dateStr,
      label: DAY_LABELS[d.getDay()],
      dayNum: d.getDate(),
      month: MONTH_LABELS[d.getMonth()],
      isToday: dateStr === todayStr,
      completionRate: completionRates[dateStr] ?? -1,
    });
  }
  return days;
}

export function DaySelector({
  selectedDate,
  onSelectDate,
  completionRates = {},
  numDays = 14,
}: DaySelectorProps) {
  const colors = useColors();
  const listRef = useRef<FlatList>(null);
  const days = buildDays(numDays, completionRates);

  useEffect(() => {
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: false });
    }, 60);
  }, []);

  return (
    <FlatList
      ref={listRef}
      data={days}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.dateStr}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const isSelected = item.dateStr === selectedDate;
        const isToday = item.isToday;
        const hasData = item.completionRate >= 0;

        const dotColor = !hasData
          ? "transparent"
          : item.completionRate >= 0.8
          ? colors.success
          : item.completionRate >= 0.5
          ? colors.warning
          : colors.destructive;

        let bgColor = "transparent";
        let borderColor = "transparent";
        let borderWidth = 0;

        if (isSelected) {
          bgColor = colors.primary;
          borderColor = "transparent";
        } else if (isToday) {
          bgColor = colors.primary + "18";
          borderColor = colors.primary + "60";
          borderWidth = 1.5;
        } else {
          bgColor = colors.card;
          borderColor = colors.border;
          borderWidth = 1;
        }

        return (
          <TouchableOpacity
            onPress={() => onSelectDate(item.dateStr)}
            activeOpacity={0.7}
            style={[
              styles.day,
              {
                backgroundColor: bgColor,
                borderColor,
                borderWidth,
              },
            ]}
          >
            <Text
              style={[
                styles.dayLabel,
                {
                  color: isSelected
                    ? colors.primaryForeground + "CC"
                    : isToday
                    ? colors.primary
                    : colors.mutedForeground,
                },
              ]}
            >
              {item.label.toUpperCase().slice(0, 3)}
            </Text>
            <Text
              style={[
                styles.dayNum,
                {
                  color: isSelected
                    ? colors.primaryForeground
                    : isToday
                    ? colors.primary
                    : colors.foreground,
                },
              ]}
            >
              {item.dayNum}
            </Text>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: isSelected
                    ? "rgba(255,255,255,0.55)"
                    : dotColor,
                },
              ]}
            />
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, gap: 7 },
  day: {
    width: 50,
    paddingVertical: 11,
    borderRadius: 25,
    alignItems: "center",
    gap: 2,
  },
  dayLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.4,
  },
  dayNum: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    lineHeight: 22,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
});
