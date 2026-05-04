import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Polygon, Line, Circle, Text as SvgText } from "react-native-svg";
import { useColors } from "@/hooks/useColors";
import { PILLAR_LABELS, PILLAR_COLORS, type HabitCategory, type Habit } from "@/context/HabitsContext";

interface CategoryRadarProps {
  habits: Habit[];
  size?: number;
}

const PILLARS: HabitCategory[] = ["physical", "mental", "academics", "creativity", "chores"];

export function CategoryRadar({ habits, size = 220 }: CategoryRadarProps) {
  const colors = useColors();
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 28;

  const scores = useMemo(() => {
    return PILLARS.map((cat) => {
      const catHabits = habits.filter((h) => h.category === cat && !h.archived);
      if (!catHabits.length) return 0;
      const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split("T")[0];
      });
      let total = 0;
      let done = 0;
      catHabits.forEach((h) => {
        last7.forEach((date) => {
          total++;
          if (h.completions.find((c) => c.date === date && c.completed)) done++;
        });
      });
      return total > 0 ? done / total : 0;
    });
  }, [habits]);

  const getPoint = (i: number, r: number) => {
    const angle = (i / PILLARS.length) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const radarPoints = scores.map((s, i) => getPoint(i, Math.max(s * maxR, 2)));
  const polygonPoints = radarPoints.map((p) => `${p.x},${p.y}`).join(" ");
  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {gridLevels.map((level, li) => {
          const pts = PILLARS.map((_, i) => {
            const p = getPoint(i, level * maxR);
            return `${p.x},${p.y}`;
          }).join(" ");
          return (
            <Polygon
              key={li}
              points={pts}
              fill="none"
              stroke={colors.border}
              strokeWidth={1}
              opacity={0.5}
            />
          );
        })}

        {PILLARS.map((_, i) => {
          const p = getPoint(i, maxR);
          return (
            <Line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={colors.border} strokeWidth={1} opacity={0.4} />
          );
        })}

        <Polygon
          points={polygonPoints}
          fill={colors.primary + "22"}
          stroke={colors.primary}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {radarPoints.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={5} fill={PILLAR_COLORS[PILLARS[i]]} />
        ))}

        {PILLARS.map((cat, i) => {
          const p = getPoint(i, maxR + 16);
          const label = PILLAR_LABELS[cat].split(" ")[0];
          return (
            <SvgText
              key={i}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              alignmentBaseline="middle"
              fontSize={9}
              fill={PILLAR_COLORS[cat]}
              fontFamily="Inter_600SemiBold"
              opacity={0.9}
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>

      <View style={styles.legend}>
        {PILLARS.map((cat) => {
          const score = scores[PILLARS.indexOf(cat)];
          return (
            <View key={cat} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: PILLAR_COLORS[cat] }]} />
              <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>
                {PILLAR_LABELS[cat]}
              </Text>
              <Text style={[styles.legendPct, { color: colors.foreground }]}>
                {Math.round(score * 100)}%
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 12 },
  legend: { width: "100%", gap: 6 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  legendPct: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
