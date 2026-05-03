import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  data: Record<string, number>;
  maxVal: number;
  color: string;
  weeks?: number;
  label?: string;
}

function cellColor(value: number, maxVal: number, color: string, muted: string): string {
  if (value === 0 || maxVal === 0) return muted;
  const r = Math.min(1, value / maxVal);
  if (r < 0.20) return color + "38";
  if (r < 0.42) return color + "66";
  if (r < 0.65) return color + "99";
  if (r < 0.85) return color + "CC";
  return color;
}

const CELL = 13;
const GAP  = 2;
const DOW  = ["S", "M", "T", "W", "T", "F", "S"];

export function NumericHeatmapChart({ data, maxVal, color, weeks = 12, label }: Props) {
  const colors = useColors();

  const { grid, monthLabels } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];
    const startOffset = today.getDay();
    const totalDays = weeks * 7;
    const startDay = new Date(today);
    startDay.setDate(today.getDate() - totalDays + 1 - startOffset);

    const grid: { date: string; value: number; isFuture: boolean; isToday: boolean }[][] = [];
    const monthLabels: { weekIdx: number; label: string }[] = [];
    let lastMonth = -1;

    for (let w = 0; w < weeks; w++) {
      const col: { date: string; value: number; isFuture: boolean; isToday: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(startDay);
        day.setDate(startDay.getDate() + w * 7 + d);
        const dateStr = day.toISOString().split("T")[0];
        const isFuture = day > today;
        if (d === 0 && day.getMonth() !== lastMonth) {
          lastMonth = day.getMonth();
          monthLabels.push({
            weekIdx: w,
            label: day.toLocaleDateString("en-US", { month: "short" }),
          });
        }
        col.push({
          date: dateStr,
          value: isFuture ? 0 : (data[dateStr] ?? 0),
          isFuture,
          isToday: dateStr === todayStr,
        });
      }
      grid.push(col);
    }
    return { grid, monthLabels };
  }, [data, weeks]);

  const totalVal = useMemo(
    () => Object.values(data).reduce((a, v) => a + v, 0),
    [data]
  );
  const activeDays = useMemo(
    () => Object.values(data).filter(v => v > 0).length,
    [data]
  );

  return (
    <View style={{ gap: 6 }}>
      {/* Month row */}
      <View style={{ flexDirection: "row", marginLeft: 18, height: 13, position: "relative" }}>
        {monthLabels.map(({ weekIdx, lbl }: any) => (
          <View key={weekIdx} style={{ position: "absolute", left: weekIdx * (CELL + GAP) }}>
            <Text style={{ fontSize: 9, color: colors.mutedForeground, fontFamily: "Inter_500Medium" }}>
              {lbl}
            </Text>
          </View>
        ))}
        {monthLabels.map(({ weekIdx, label: lbl }: any) => (
          <View key={`l-${weekIdx}`} style={{ position: "absolute", left: weekIdx * (CELL + GAP) }}>
            <Text style={{ fontSize: 9, color: colors.mutedForeground, fontFamily: "Inter_500Medium" }}>
              {lbl}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: GAP }}>
        {/* Day labels */}
        <View style={{ gap: GAP, paddingTop: 1, width: 14 }}>
          {DOW.map((d, i) => (
            <Text
              key={i}
              style={{
                fontSize: 8,
                color: colors.mutedForeground,
                fontFamily: "Inter_500Medium",
                height: CELL,
                lineHeight: CELL,
                textAlign: "center",
              }}
            >
              {i % 2 === 0 ? d : ""}
            </Text>
          ))}
        </View>

        {/* Grid */}
        <View style={{ flexDirection: "row", gap: GAP, flex: 1 }}>
          {grid.map((col, wi) => (
            <View key={wi} style={{ gap: GAP }}>
              {col.map((cell, di) => (
                <View
                  key={di}
                  style={{
                    width: CELL,
                    height: CELL,
                    borderRadius: 3,
                    backgroundColor: cell.isFuture
                      ? "transparent"
                      : cellColor(cell.value, maxVal, color, colors.muted),
                    borderWidth: cell.isToday ? 1.5 : 0,
                    borderColor: color,
                  }}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* Legend + summary */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text style={{ fontSize: 9, color: colors.mutedForeground, fontFamily: "Inter_400Regular", flex: 1 }}>
          {activeDays} active days · {label ? `${totalVal} ${label}` : totalVal}
        </Text>
        <Text style={{ fontSize: 9, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>Less</Text>
        {(["38", "66", "99", "CC", "FF"] as const).map((hex, i) => (
          <View key={i} style={{ width: 11, height: 11, borderRadius: 2, backgroundColor: color + hex }} />
        ))}
        <Text style={{ fontSize: 9, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>More</Text>
      </View>
    </View>
  );
}
