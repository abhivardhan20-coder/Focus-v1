import React, { useRef } from "react";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";

interface SparklineChartProps {
  data: number[];
  width: number;
  height: number;
  color: string;
  strokeWidth?: number;
  showFill?: boolean;
}

function buildSmoothPath(points: [number, number][]) {
  if (points.length < 2) return "";
  let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpX = ((prev[0] + curr[0]) / 2).toFixed(1);
    d += ` C ${cpX} ${prev[1].toFixed(1)}, ${cpX} ${curr[1].toFixed(1)}, ${curr[0].toFixed(1)} ${curr[1].toFixed(1)}`;
  }
  return d;
}

export function SparklineChart({
  data,
  width,
  height,
  color,
  strokeWidth = 2,
  showFill = true,
}: SparklineChartProps) {
  const gradId = useRef(`spark-${Math.random().toString(36).slice(2, 8)}`).current;
  if (!data || data.length < 2) return null;

  const pad = 3;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const points: [number, number][] = data.map((val, i) => [
    pad + (i / (data.length - 1)) * w,
    pad + (1 - Math.max(0, Math.min(1, val))) * h,
  ]);

  const linePath = buildSmoothPath(points);
  const last = points[points.length - 1];
  const first = points[0];
  const fillPath =
    linePath +
    ` L ${last[0].toFixed(1)} ${height} L ${first[0].toFixed(1)} ${height} Z`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity={0.45} />
          <Stop offset="100%" stopColor={color} stopOpacity={0.0} />
        </LinearGradient>
      </Defs>
      {showFill && <Path d={fillPath} fill={`url(#${gradId})`} />}
      <Path
        d={linePath}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
