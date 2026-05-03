import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useFont } from "@/hooks/useFont";
import type { Badge } from "@/constants/badges";

interface Props {
  badge: (Badge & { earnedAt: number }) | null;
  onClose: () => void;
}

export function BadgeEarnedModal({ badge, onClose }: Props) {
  const colors = useColors();
  const font = useFont();
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const iconBounce = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (badge) {
      scaleAnim.setValue(0.7);
      opacityAnim.setValue(0);
      glowAnim.setValue(0);
      iconBounce.setValue(0.6);

      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 58, friction: 8, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.spring(iconBounce, { toValue: 1, tension: 45, friction: 6, useNativeDriver: true }),
      ]).start();

      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0.35, duration: 1500, useNativeDriver: false }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [badge]);

  if (!badge) return null;

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.42] });

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.container,
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ]}
        >
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <Animated.View
              style={[StyleSheet.absoluteFill, styles.glowOverlay, { opacity: glowOpacity }]}
              pointerEvents="none"
            >
              <LinearGradient
                colors={[badge.color, "transparent"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>

            <View
              style={[
                styles.topLabel,
                { backgroundColor: badge.color + "18", borderColor: badge.color + "40" },
              ]}
            >
              <Feather name="award" size={11} color={badge.color} />
              <Text
                style={[styles.topLabelText, { color: badge.color, fontFamily: font.semibold }]}
              >
                BADGE UNLOCKED
              </Text>
            </View>

            <Animated.View
              style={[
                styles.iconRing,
                {
                  backgroundColor: badge.color + "1E",
                  borderColor: badge.color + "55",
                  transform: [{ scale: iconBounce }],
                },
              ]}
            >
              <View style={[styles.iconInner, { backgroundColor: badge.color + "2A" }]}>
                <Feather name={badge.icon as any} size={44} color={badge.color} />
              </View>
            </Animated.View>

            <Text style={[styles.badgeName, { color: colors.foreground, fontFamily: font.bold }]}>
              {badge.name}
            </Text>
            <Text
              style={[styles.badgeDesc, { color: colors.mutedForeground, fontFamily: font.regular }]}
            >
              {badge.desc}
            </Text>

            <View
              style={[
                styles.xpRow,
                { backgroundColor: colors.warning + "15", borderColor: colors.warning + "30" },
              ]}
            >
              <Feather name="zap" size={14} color={colors.warning} />
              <Text style={[styles.xpText, { color: colors.warning, fontFamily: font.semibold }]}>
                Achievement Unlocked!
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: badge.color }]}
              activeOpacity={0.85}
            >
              <Text style={[styles.closeBtnText, { fontFamily: font.bold }]}>Awesome!</Text>
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
  glowOverlay: { borderRadius: 28 },
  topLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  topLabelText: { fontSize: 10, letterSpacing: 1.2 },
  iconRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
  },
  iconInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeName: { fontSize: 24, textAlign: "center" },
  badgeDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  xpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  xpText: { fontSize: 13 },
  closeBtn: {
    paddingHorizontal: 44,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 4,
  },
  closeBtnText: { fontSize: 16, color: "#fff" },
});
