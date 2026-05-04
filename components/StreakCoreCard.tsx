import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useFont } from "@/hooks/useFont";
import {
  PILLAR_COLORS,
  PILLAR_LABELS,
  type Habit,
  type HabitCategory,
} from "@/context/HabitsContext";
import { ProgressRing } from "./ProgressRing";

const PILLARS: HabitCategory[] = ["physical", "mental", "academics", "creativity", "chores"];
const PERIOD = 30;

function getCatStats(habits: Habit[], cat: HabitCategory) {
  const hs = habits.filter((h) => !h.archived && h.category === cat);
  if (!hs.length) return { streak: 0, best: 0, rate: 0 };
  const topStreak = Math.max(...hs.map((h) => h.streak));
  const topBest = Math.max(...hs.map((h) => h.longestStreak));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let due = 0, done = 0;
  for (let i = 0; i < PERIOD; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const ds = d.toISOString().split("T")[0]; const dow = d.getDay();
    hs.forEach((h) => {
      let isDue = false;
      if (h.frequency === "daily") isDue = true;
      else if (h.frequency === "weekdays") isDue = dow >= 1 && dow <= 5;
      else if (h.frequency === "weekends") isDue = dow === 0 || dow === 6;
      else if (h.frequency === "custom") isDue = (h.customDays ?? []).includes(dow);
      if (isDue) { due++; if (h.completions.find((c) => c.date === ds && c.completed)) done++; }
    });
  }
  return { streak: topStreak, best: topBest, rate: due > 0 ? done / due : 0 };
}

export interface StreakCoreCardProps {
  visible: boolean;
  onClose: () => void;
  habits: Habit[];
}

export function StreakCoreCard({ visible, onClose, habits }: StreakCoreCardProps) {
  const colors = useColors();
  const font = useFont();
  const scale = useSharedValue(0.84);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 18, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 240 });
    } else {
      scale.value = withTiming(0.88, { duration: 180 });
      opacity.value = withTiming(0, { duration: 180 });
    }
  }, [visible]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const catData = PILLARS.map((cat) => ({ cat, ...getCatStats(habits, cat) }));
  const topStreaker = [...habits].filter((h) => !h.archived).sort((a, b) => b.streak - a.streak)[0];
  const bestEver = Math.max(...habits.map((h) => h.longestStreak), 0);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <Animated.View style={[styles.card, { backgroundColor: colors.card }, cardStyle]}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <LinearGradient
              colors={["rgba(251,191,36,0.13)", "rgba(251,191,36,0.02)"]}
              start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill} pointerEvents="none"
            />
            <View style={[styles.accentLine, { backgroundColor: "#FBBF24" }]} />

            {/* Header */}
            <View style={styles.hdr}>
              <Text style={styles.fire}>🔥</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.foreground, fontFamily: font.bold }]}>
                  Streak Core
                </Text>
                <Text style={[styles.sub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                  30-day pillar breakdown
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Feather name="x" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Hero stat */}
            <View style={[styles.heroStat, { backgroundColor: "#FBBF2412", borderColor: "#FBBF2430" }]}>
              <View style={styles.heroLeft}>
                <Text style={[styles.heroNum, { color: "#FBBF24", fontFamily: font.bold }]}>
                  {topStreaker?.streak ?? 0}
                </Text>
                <Text style={[styles.heroLbl, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                  active streak
                </Text>
                {topStreaker && (
                  <Text style={[styles.heroName, { color: colors.foreground, fontFamily: font.semibold }]} numberOfLines={1}>
                    {topStreaker.name}
                  </Text>
                )}
              </View>
              <View style={styles.heroRight}>
                <Text style={[styles.heroNum, { color: colors.mutedForeground, fontFamily: font.bold }]}>
                  {bestEver}
                </Text>
                <Text style={[styles.heroLbl, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                  all-time best
                </Text>
              </View>
            </View>

            {/* Category rings */}
            <View style={styles.grid}>
              {catData.map(({ cat, streak, best, rate }) => {
                const clr = PILLAR_COLORS[cat];
                return (
                  <View key={cat} style={styles.ringCell}>
                    <ProgressRing size={72} strokeWidth={5.5} progress={rate} color={clr} backgroundColor={clr + "22"}>
                      <Text style={[styles.ringNum, { color: colors.foreground, fontFamily: font.bold }]}>{streak}</Text>
                    </ProgressRing>
                    <Text style={[styles.ringCat, { color: clr, fontFamily: font.semibold }]}>
                      {PILLAR_LABELS[cat].split(" ")[0]}
                    </Text>
                    <View style={[styles.ringRateBadge, { backgroundColor: clr + "18" }]}>
                      <Text style={[styles.ringRateTxt, { color: clr, fontFamily: font.bold }]}>
                        {Math.round(rate * 100)}%
                      </Text>
                    </View>
                    <Text style={[styles.ringBest, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                      best {best}d
                    </Text>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity onPress={onClose} style={[styles.closeBar, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.closeTxt, { color: colors.mutedForeground, fontFamily: font.medium }]}>
                Close
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.84)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(251,191,36,0.30)",
    overflow: "hidden",
    width: "100%",
    maxWidth: 380,
  },
  accentLine: { height: 2.5, opacity: 0.8 },
  hdr: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16, paddingBottom: 10 },
  fire: { fontSize: 26 },
  title: { fontSize: 18 },
  sub: { fontSize: 11, marginTop: 1 },
  heroStat: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  heroLeft: { flex: 1, gap: 2 },
  heroRight: { alignItems: "flex-end", gap: 2 },
  heroNum: { fontSize: 30, lineHeight: 34 },
  heroLbl: { fontSize: 10 },
  heroName: { fontSize: 11, marginTop: 2 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 8,
  },
  ringCell: { alignItems: "center", gap: 5, minWidth: 80 },
  ringNum: { fontSize: 15 },
  ringCat: { fontSize: 11 },
  ringRateBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  ringRateTxt: { fontSize: 10 },
  ringBest: { fontSize: 9 },
  closeBar: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  closeTxt: { fontSize: 13 },
});
