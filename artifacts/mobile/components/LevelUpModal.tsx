import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useFont } from "@/hooks/useFont";
import { useHabits } from "@/context/HabitsContext";

interface Props {
  level: number | null;
  onClose: () => void;
}

export function LevelUpModal({ level, onClose }: Props) {
  const colors = useColors();
  const font = useFont();
  const { userStats } = useHabits();
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const numScaleAnim = useRef(new Animated.Value(2.2)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (level !== null) {
      scaleAnim.setValue(0.6);
      opacityAnim.setValue(0);
      numScaleAnim.setValue(2.2);
      glowAnim.setValue(0);

      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 55, friction: 8, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(numScaleAnim, { toValue: 1, tension: 38, friction: 6, useNativeDriver: true }),
      ]).start();

      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1800, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0.28, duration: 1800, useNativeDriver: false }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [level]);

  if (level === null) return null;

  const xpForThisLevel = (level - 1) * 500;
  const xpInLevel = Math.max(0, userStats.totalXP - xpForThisLevel);
  const xpProgress = Math.min(1, xpInLevel / 500);
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.38] });

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Animated.View
          style={[styles.container, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}
        >
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <Animated.View
              style={[StyleSheet.absoluteFill, { opacity: glowOpacity }]}
              pointerEvents="none"
            >
              <LinearGradient
                colors={[colors.primary, "transparent"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
              />
            </Animated.View>

            <View
              style={[
                styles.topTag,
                { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" },
              ]}
            >
              <Feather name="zap" size={11} color={colors.primary} />
              <Text
                style={[styles.topTagText, { color: colors.primary, fontFamily: font.semibold }]}
              >
                LEVEL UP!
              </Text>
            </View>

            <Animated.View
              style={[
                styles.levelCircle,
                {
                  backgroundColor: colors.primary + "1E",
                  borderColor: colors.primary + "55",
                  transform: [{ scale: numScaleAnim }],
                },
              ]}
            >
              <Text style={[styles.levelNum, { color: colors.primary, fontFamily: font.bold }]}>
                {level}
              </Text>
            </Animated.View>

            <Text style={[styles.title, { color: colors.foreground, fontFamily: font.bold }]}>
              Level {level} Reached!
            </Text>
            <Text style={[styles.sub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
              Keep completing habits and focus sessions to unlock Level {level + 1}.
            </Text>

            <View style={styles.xpBlock}>
              <View style={styles.xpLabelRow}>
                <Text
                  style={[styles.xpLabelTxt, { color: colors.mutedForeground, fontFamily: font.regular }]}
                >
                  Level {level} progress
                </Text>
                <Text
                  style={[styles.xpValTxt, { color: colors.primary, fontFamily: font.semibold }]}
                >
                  {xpInLevel} / 500 XP
                </Text>
              </View>
              <View style={[styles.xpTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.xpFill,
                    { backgroundColor: colors.primary, width: `${xpProgress * 100}%` as any },
                  ]}
                />
              </View>
            </View>

            <View style={[styles.statsRow, { backgroundColor: colors.secondary, borderRadius: 14 }]}>
              {[
                { val: userStats.totalXP, lbl: "Total XP" },
                { val: userStats.totalCompleted, lbl: "Completed" },
                { val: userStats.badges.length, lbl: "Badges" },
              ].map((s, i, arr) => (
                <React.Fragment key={s.lbl}>
                  <View style={styles.statItem}>
                    <Text
                      style={[styles.statVal, { color: colors.foreground, fontFamily: font.bold }]}
                    >
                      {s.val}
                    </Text>
                    <Text
                      style={[
                        styles.statLbl,
                        { color: colors.mutedForeground, fontFamily: font.regular },
                      ]}
                    >
                      {s.lbl}
                    </Text>
                  </View>
                  {i < arr.length - 1 && (
                    <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                  )}
                </React.Fragment>
              ))}
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
            >
              <Text style={[styles.closeBtnText, { fontFamily: font.bold }]}>Keep Going!</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  container: { width: "100%", maxWidth: 340 },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 14,
    overflow: "hidden",
  },
  topTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  topTagText: { fontSize: 10, letterSpacing: 1.2 },
  levelCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  levelNum: { fontSize: 44 },
  title: { fontSize: 22, textAlign: "center" },
  sub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  xpBlock: { width: "100%", gap: 6 },
  xpLabelRow: { flexDirection: "row", justifyContent: "space-between" },
  xpLabelTxt: { fontSize: 12 },
  xpValTxt: { fontSize: 12 },
  xpTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  xpFill: { height: "100%", borderRadius: 3 },
  statsRow: { flexDirection: "row", width: "100%", padding: 14 },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statVal: { fontSize: 18 },
  statLbl: { fontSize: 10 },
  statDivider: { width: 1, marginHorizontal: 4 },
  closeBtn: {
    paddingHorizontal: 44,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 2,
  },
  closeBtnText: { fontSize: 16, color: "#fff" },
});
