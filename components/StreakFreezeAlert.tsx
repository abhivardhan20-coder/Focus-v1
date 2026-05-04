import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useFont } from "@/hooks/useFont";
import { PILLAR_COLORS, type Habit } from "@/context/HabitsContext";

const AMBER = "#FBBF24";

export interface StreakFreezeAlertProps {
  habits: Habit[];
  freezeTokens: number;
  onFreeze: (id: string) => void;
  onFreezeAll: () => void;
  onDismiss: () => void;
}

export function StreakFreezeAlert({
  habits,
  freezeTokens,
  onFreeze,
  onFreezeAll,
  onDismiss,
}: StreakFreezeAlertProps) {
  const colors = useColors();
  const font = useFont();
  const [frozenIds, setFrozenIds] = useState<Set<string>>(new Set());

  // ── Entrance ──
  const slideY = useSharedValue(-20);
  const opacity = useSharedValue(0);
  // ── Pulsing border glow ──
  const glow = useSharedValue(0);

  useEffect(() => {
    slideY.value = withSpring(0, { damping: 18, stiffness: 220 });
    opacity.value = withTiming(1, { duration: 280 });
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
    opacity: opacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(251,191,36,${0.25 + glow.value * 0.48})`,
  }));

  const dismiss = () => {
    opacity.value = withTiming(0, { duration: 210 });
    slideY.value = withTiming(-14, { duration: 210 });
    setTimeout(onDismiss, 220);
  };

  const handleFreeze = (id: string) => {
    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setFrozenIds((prev) => new Set([...prev, id]));
    onFreeze(id);
  };

  const handleFreezeAll = () => {
    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const canFreeze = habits.filter((h) => !frozenIds.has(h.id)).slice(0, freezeTokens);
    canFreeze.forEach((h) => handleFreeze(h.id));
    onFreezeAll();
  };

  const unfrozen = habits.filter((h) => !frozenIds.has(h.id));
  const canFreezeAll = freezeTokens >= unfrozen.length && unfrozen.length > 0;
  const allFrozen = unfrozen.length === 0;

  return (
    <Animated.View style={[styles.wrapper, wrapStyle]}>
      <Animated.View
        style={[styles.card, { backgroundColor: colors.card }, glowStyle]}
      >
        {/* Amber glass tint */}
        <LinearGradient
          colors={["rgba(251,191,36,0.10)", "rgba(251,191,36,0.02)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Top accent bar */}
        <View style={[styles.accentBar, { backgroundColor: AMBER }]} />

        {/* Header row */}
        <View style={styles.hdr}>
          <View style={styles.hdrLeft}>
            <Text style={styles.fire}>🔥</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.foreground, fontFamily: font.bold }]}>
                {allFrozen ? "Streaks Protected!" : "Streaks at Risk"}
              </Text>
              <Text style={[styles.sub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                {allFrozen
                  ? `${habits.length} habit${habits.length !== 1 ? "s" : ""} shielded for tonight`
                  : `${unfrozen.length} habit${unfrozen.length !== 1 ? "s" : ""} unprotected · ${freezeTokens} token${freezeTokens !== 1 ? "s" : ""} left`}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={dismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="x" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Habit pills */}
        <View style={styles.pillsRow}>
          {habits.map((h) => {
            const frozen = frozenIds.has(h.id);
            const pillarColor = PILLAR_COLORS[h.category];
            const activeBg = frozen ? colors.success : pillarColor;
            return (
              <TouchableOpacity
                key={h.id}
                onPress={() => !frozen && freezeTokens > 0 && handleFreeze(h.id)}
                activeOpacity={frozen ? 1 : 0.72}
                style={[
                  styles.pill,
                  {
                    backgroundColor: activeBg + "18",
                    borderColor: activeBg + "45",
                  },
                ]}
              >
                <Feather
                  name={frozen ? "shield" : (h.icon as any)}
                  size={11}
                  color={activeBg}
                />
                <Text
                  style={[
                    styles.pillName,
                    {
                      color: frozen ? colors.success : colors.foreground,
                      fontFamily: font.medium,
                      textDecorationLine: frozen ? "line-through" : "none",
                      opacity: frozen ? 0.65 : 1,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {h.name}
                </Text>
                <View
                  style={[
                    styles.pillBadge,
                    { backgroundColor: frozen ? colors.success + "22" : AMBER + "22" },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillBadgeText,
                      {
                        color: frozen ? colors.success : AMBER,
                        fontFamily: font.bold,
                      },
                    ]}
                  >
                    {frozen ? "✓" : `${h.streak}d`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {!allFrozen ? (
            <TouchableOpacity
              onPress={handleFreezeAll}
              disabled={!canFreezeAll}
              activeOpacity={0.75}
              style={[
                styles.freezeBtn,
                {
                  backgroundColor: canFreezeAll ? AMBER + "18" : colors.secondary,
                  borderColor: canFreezeAll ? AMBER + "44" : colors.border,
                },
              ]}
            >
              <Feather name="zap" size={13} color={canFreezeAll ? AMBER : colors.mutedForeground} />
              <Text
                style={[
                  styles.freezeBtnText,
                  {
                    color: canFreezeAll ? AMBER : colors.mutedForeground,
                    fontFamily: font.semibold,
                  },
                ]}
              >
                {canFreezeAll
                  ? `Freeze All — ${unfrozen.length} token${unfrozen.length !== 1 ? "s" : ""}`
                  : "Not enough tokens"}
              </Text>
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.freezeBtn,
                { backgroundColor: colors.success + "15", borderColor: colors.success + "33" },
              ]}
            >
              <Feather name="shield" size={13} color={colors.success} />
              <Text style={[styles.freezeBtnText, { color: colors.success, fontFamily: font.semibold }]}>
                All streaks protected
              </Text>
            </View>
          )}
          <TouchableOpacity onPress={dismiss} style={styles.dismissBtn}>
            <Text style={[styles.dismissText, { color: colors.mutedForeground, fontFamily: font.regular }]}>
              Dismiss
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: 16 },
  card: {
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  accentBar: { height: 2.5, opacity: 0.75 },

  hdr: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 10,
  },
  hdrLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  fire: { fontSize: 22 },
  title: { fontSize: 14 },
  sub: { fontSize: 11, marginTop: 1 },

  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 200,
  },
  pillName: { fontSize: 11, flexShrink: 1 },
  pillBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
  pillBadgeText: { fontSize: 10 },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  freezeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 11,
    borderWidth: 1,
  },
  freezeBtnText: { fontSize: 12 },
  dismissBtn: { paddingHorizontal: 8, paddingVertical: 9 },
  dismissText: { fontSize: 12 },
});
