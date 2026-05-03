import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { useColors } from "@/hooks/useColors";
import { PILLAR_COLORS, type HabitCategory } from "@/context/HabitsContext";

const PILLARS: HabitCategory[] = ["physical", "mental", "academics", "creativity", "chores"];

const SHORT_LABELS: Record<HabitCategory, string> = {
  physical: "BODY",
  mental: "MIND",
  academics: "STUDY",
  creativity: "CREATE",
  chores: "TASKS",
};

const ANGLES = PILLARS.map((_, i) => ((-90 + i * 72) * Math.PI) / 180);

const SIZE = 300;
const CX = 150;
const CY = 150;
const OUTER_R = 88;
const LABEL_R = 122;

function pt(angleIdx: number, scale: number) {
  return {
    x: CX + OUTER_R * scale * Math.cos(ANGLES[angleIdx]),
    y: CY + OUTER_R * scale * Math.sin(ANGLES[angleIdx]),
  };
}

function labelPt(angleIdx: number) {
  return {
    x: CX + LABEL_R * Math.cos(ANGLES[angleIdx]),
    y: CY + LABEL_R * Math.sin(ANGLES[angleIdx]),
  };
}

function buildPath(scales: number[]) {
  return (
    scales
      .map((s, i) => {
        const p = pt(i, s);
        return `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
      })
      .join(" ") + " Z"
  );
}

function gridPath(level: number) {
  return buildPath(Array(5).fill(level));
}

function textAnchor(angleIdx: number): "middle" | "start" | "end" {
  const lp = labelPt(angleIdx);
  const dx = lp.x - CX;
  if (Math.abs(dx) < OUTER_R * 0.18) return "middle";
  return dx > 0 ? "start" : "end";
}

interface PentagonChartProps {
  scores: number[]; // [physical, mental, academics, creativity, chores] each 0–1
}

export function PentagonChart({ scores }: PentagonChartProps) {
  const colors = useColors();
  const safe = scores.map((s) => Math.max(0.06, Math.min(1, s)));
  const primary = colors.primary;

  const scorePath = buildPath(safe);

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE}>
        <Defs>
          <LinearGradient id="pgFill" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={primary} stopOpacity={0.38} />
            <Stop offset="100%" stopColor={primary} stopOpacity={0.08} />
          </LinearGradient>
        </Defs>

        {/* ── Concentric grid ── */}
        {[0.25, 0.5, 0.75, 1.0].map((level) => (
          <Path
            key={level}
            d={gridPath(level)}
            stroke={
              level === 1.0
                ? "rgba(255,255,255,0.14)"
                : "rgba(255,255,255,0.06)"
            }
            strokeWidth={level === 1.0 ? 1 : 0.7}
            fill="none"
          />
        ))}

        {/* ── Axis spokes ── */}
        {PILLARS.map((_, i) => {
          const outer = pt(i, 1);
          return (
            <Line
              key={i}
              x1={CX}
              y1={CY}
              x2={outer.x}
              y2={outer.y}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth={1}
            />
          );
        })}

        {/* ── Score glow halos (outer → inner) ── */}
        <Path d={scorePath} stroke={primary} strokeWidth={22} fill="none" opacity={0.04} />
        <Path d={scorePath} stroke={primary} strokeWidth={12} fill="none" opacity={0.08} />
        <Path d={scorePath} stroke={primary} strokeWidth={5} fill="none" opacity={0.14} />

        {/* ── Score fill ── */}
        <Path d={scorePath} fill="url(#pgFill)" />

        {/* ── Score crisp stroke ── */}
        <Path
          d={scorePath}
          stroke={primary}
          strokeWidth={2}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* ── Center pulse dot ── */}
        <Circle cx={CX} cy={CY} r={8} fill={primary} opacity={0.12} />
        <Circle cx={CX} cy={CY} r={4} fill={primary} opacity={0.5} />

        {/* ── Vertex dots + per-pillar glow ── */}
        {PILLARS.map((pillar, i) => {
          const p = pt(i, safe[i]);
          const c = PILLAR_COLORS[pillar];
          return (
            <G key={pillar}>
              <Circle cx={p.x} cy={p.y} r={11} fill={c} opacity={0.13} />
              <Circle cx={p.x} cy={p.y} r={6} fill={c} opacity={0.9} />
              <Circle cx={p.x} cy={p.y} r={3} fill="#ffffff" opacity={0.55} />
            </G>
          );
        })}

        {/* ── Labels: short name + percentage ── */}
        {PILLARS.map((pillar, i) => {
          const lp = labelPt(i);
          const anchor = textAnchor(i);
          const c = PILLAR_COLORS[pillar];
          const pct = `${Math.round(scores[i] * 100)}%`;
          const sinVal = Math.sin(ANGLES[i]);
          const nameY = lp.y + (sinVal < -0.1 ? -6 : 2);
          const pctY = nameY + 13;

          return (
            <G key={pillar}>
              <SvgText
                x={lp.x}
                y={nameY}
                textAnchor={anchor}
                fontSize={8.5}
                fontWeight="700"
                fill={c}
                opacity={0.85}
                letterSpacing={0.6}
              >
                {SHORT_LABELS[pillar]}
              </SvgText>
              <SvgText
                x={lp.x}
                y={pctY}
                textAnchor={anchor}
                fontSize={12}
                fontWeight="700"
                fill={c}
              >
                {pct}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
});
