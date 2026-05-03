import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useFont } from "@/hooks/useFont";
import { ProgressRing } from "@/components/ProgressRing";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function getMessage(rate: number, done: number): string {
  if (done === 0) return "A new week starts now. Make it count.";
  if (rate >= 0.95) return "Flawless execution. You're operating at your peak.";
  if (rate >= 0.8)  return "Outstanding consistency. Keep this momentum.";
  if (rate >= 0.6)  return "Solid week. Push for 80%+ this coming week.";
  if (rate >= 0.4)  return "Progress over perfection. This week is your reset.";
  return "Every streak starts with a single day. Begin again.";
}

function getRateColor(rate: number, primary: string, accent: string, destructive: string): string {
  if (rate >= 0.8) return primary;
  if (rate >= 0.5) return accent;
  return destructive;
}

interface BestHabit {
  name: string;
  color: string;
  icon: string;
  count: number;
}

interface Props {
  weeklyRate: number;
  weeklyDone: number;
  weeklyDue: number;
  weeklyXP: number;
  last7Rates: number[];
  bestHabit: BestHabit | null;
  topStreakName?: string;
  topStreakDays?: number;
  onDismiss: () => void;
}

export function WeeklyRecapCard({
  weeklyRate,
  weeklyDone,
  weeklyDue,
  weeklyXP,
  last7Rates,
  bestHabit,
  topStreakName,
  topStreakDays = 0,
  onDismiss,
}: Props) {
  const colors = useColors();
  const font = useFont();
  const rateColor = getRateColor(weeklyRate, colors.primary, colors.accent, colors.destructive);
  const pct = Math.round(weeklyRate * 100);
  const message = getMessage(weeklyRate, weeklyDone);

  const today = new Date();
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1];
  });

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>

      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: rateColor + "20" }]}>
          <Feather name="award" size={14} color={rateColor} />
        </View>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: font.bold }]}>
          Weekly Recap
        </Text>
        <View style={[styles.weekBadge, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.weekBadgeText, { color: colors.mutedForeground, fontFamily: font.medium }]}>
            7 days
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="x" size={15} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Main row: ring + sparkline */}
      <View style={styles.mainRow}>

        {/* Completion ring */}
        <View style={styles.ringBlock}>
          <ProgressRing
            size={88}
            strokeWidth={7}
            progress={weeklyRate}
            color={rateColor}
            backgroundColor={rateColor + "22"}
          >
            <Text style={[styles.ringPct, { color: rateColor, fontFamily: font.bold }]}>{pct}%</Text>
          </ProgressRing>
          <Text style={[styles.ringLabel, { color: colors.mutedForeground, fontFamily: font.regular }]}>
            completion
          </Text>
        </View>

        {/* Sparkline bars */}
        <View style={styles.sparkBlock}>
          <Text style={[styles.sparkTitle, { color: colors.mutedForeground, fontFamily: font.semibold }]}>
            DAY BY DAY
          </Text>
          <View style={styles.sparkBars}>
            {last7Rates.map((r, i) => (
              <View key={i} style={styles.sparkBarCol}>
                <View style={[styles.sparkTrack, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.sparkFill,
                      {
                        height: `${Math.max(4, Math.round(r * 100))}%`,
                        backgroundColor: r >= 0.8 ? colors.primary : r >= 0.5 ? colors.accent : r > 0 ? colors.destructive + "BB" : colors.border,
                        borderRadius: 3,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.sparkDay, { color: colors.mutedForeground, fontFamily: font.medium }]}>
                  {dayLabels[i]}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Stat chips */}
      <View style={styles.chipsRow}>
        <View style={[styles.chip, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "28" }]}>
          <Feather name="check-circle" size={11} color={colors.primary} />
          <Text style={[styles.chipVal, { color: colors.foreground, fontFamily: font.bold }]}>
            {weeklyDone}<Text style={[styles.chipSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>/{weeklyDue}</Text>
          </Text>
          <Text style={[styles.chipLabel, { color: colors.mutedForeground, fontFamily: font.regular }]}>done</Text>
        </View>

        <View style={[styles.chip, { backgroundColor: colors.accent + "12", borderColor: colors.accent + "28" }]}>
          <Feather name="zap" size={11} color={colors.accent} />
          <Text style={[styles.chipVal, { color: colors.foreground, fontFamily: font.bold }]}>
            +{weeklyXP}
          </Text>
          <Text style={[styles.chipLabel, { color: colors.mutedForeground, fontFamily: font.regular }]}>XP</Text>
        </View>

        {topStreakDays > 0 && topStreakName ? (
          <View style={[styles.chip, { backgroundColor: "#FBBF2412", borderColor: "#FBBF2428" }]}>
            <Text style={{ fontSize: 10 }}>🔥</Text>
            <Text style={[styles.chipVal, { color: colors.foreground, fontFamily: font.bold }]}>
              {topStreakDays}d
            </Text>
            <Text style={[styles.chipLabel, { color: colors.mutedForeground, fontFamily: font.regular }]} numberOfLines={1}>
              streak
            </Text>
          </View>
        ) : (
          <View style={[styles.chip, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="target" size={11} color={colors.mutedForeground} />
            <Text style={[styles.chipVal, { color: colors.mutedForeground, fontFamily: font.bold }]}>—</Text>
            <Text style={[styles.chipLabel, { color: colors.mutedForeground, fontFamily: font.regular }]}>streak</Text>
          </View>
        )}
      </View>

      {/* Best habit */}
      {bestHabit && (
        <View style={[styles.bestRow, { backgroundColor: bestHabit.color + "12", borderColor: bestHabit.color + "30" }]}>
          <View style={[styles.bestIcon, { backgroundColor: bestHabit.color + "28" }]}>
            <Feather name={bestHabit.icon as any} size={13} color={bestHabit.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bestLabel, { color: colors.mutedForeground, fontFamily: font.medium }]}>BEST HABIT</Text>
            <Text style={[styles.bestName, { color: colors.foreground, fontFamily: font.bold }]} numberOfLines={1}>
              {bestHabit.name}
            </Text>
          </View>
          <View style={[styles.bestBadge, { backgroundColor: bestHabit.color + "22" }]}>
            <Text style={[styles.bestBadgeText, { color: bestHabit.color, fontFamily: font.bold }]}>
              {bestHabit.count}/7
            </Text>
          </View>
        </View>
      )}

      {/* Motivational message */}
      <View style={[styles.msgRow, { borderTopColor: colors.border }]}>
        <Feather name="star" size={11} color={rateColor} />
        <Text style={[styles.msgText, { color: colors.mutedForeground, fontFamily: font.regular }]}>
          {message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    gap: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  headerIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 15, flex: 1 },
  weekBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  weekBadgeText: { fontSize: 10 },
  dismissBtn: { padding: 2 },

  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 20,
  },
  ringBlock: { alignItems: "center", gap: 6 },
  ringPct: { fontSize: 18 },
  ringLabel: { fontSize: 10, letterSpacing: 0.3 },

  sparkBlock: { flex: 1, gap: 8 },
  sparkTitle: { fontSize: 9, letterSpacing: 1 },
  sparkBars: { flexDirection: "row", alignItems: "flex-end", gap: 5, height: 52 },
  sparkBarCol: { flex: 1, alignItems: "center", gap: 4, height: "100%" },
  sparkTrack: { flex: 1, width: "100%", borderRadius: 3, justifyContent: "flex-end", overflow: "hidden" },
  sparkFill: { width: "100%" },
  sparkDay: { fontSize: 9 },

  chipsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  chip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 2,
  },
  chipVal: { fontSize: 14 },
  chipSub: { fontSize: 11 },
  chipLabel: { fontSize: 9, letterSpacing: 0.3 },

  bestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  bestIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  bestLabel: { fontSize: 8, letterSpacing: 0.8 },
  bestName: { fontSize: 13, marginTop: 1 },
  bestBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  bestBadgeText: { fontSize: 12 },

  msgRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  msgText: { flex: 1, fontSize: 12, lineHeight: 17 },
});
