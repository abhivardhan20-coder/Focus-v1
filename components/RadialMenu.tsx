import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useFont } from "@/hooks/useFont";
import { PILLAR_COLORS, PILLAR_LABELS, type Habit } from "@/context/HabitsContext";

const { width: W, height: H } = Dimensions.get("window");

// ── Layout constants ────────────────────────────────────────────────────────
const CX = W / 2;          // horizontal center
const CY = H / 2;          // vertical center  — card placed here
const CARD_W = Math.min(W - 48, 300);
const BTN = 64;             // button circle diameter
const LABEL_H = 14;
const LABEL_GAP = 6;

// Rainbow arc: 4 buttons in a semicircle ABOVE the card.
// Angles 210° → 250° → 290° → 330° all have sin < 0 (screen-upward).
// R = 185 guarantees the circle bottom (by + BTN/2) stays ≥ 25px above card top.
const R = 185;
const ANGLES = [210, 250, 290, 330]; // left → right rainbow

function btnCenter(i: number) {
  const rad = (ANGLES[i] * Math.PI) / 180;
  return { bx: CX + R * Math.cos(rad), by: CY + R * Math.sin(rad) };
}

// ── Types ────────────────────────────────────────────────────────────────────
export interface RadialMenuProps {
  visible: boolean;
  habit: Habit | null;
  onClose: () => void;
  onEdit: () => void;
  onSkip: () => void;
  onArchive: () => void;
  onToggleImportant: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────
export function RadialMenu({
  visible,
  habit,
  onClose,
  onEdit,
  onSkip,
  onArchive,
  onToggleImportant,
}: RadialMenuProps) {
  const colors = useColors();
  const font = useFont();
  const [show, setShow] = useState(false);

  const bgOpacity  = useSharedValue(0);
  const cardScale  = useSharedValue(0.76);
  const cardOpacity = useSharedValue(0);
  const cancelSv   = useSharedValue(0);
  const s0 = useSharedValue(0);
  const s1 = useSharedValue(0);
  const s2 = useSharedValue(0);
  const s3 = useSharedValue(0);

  const bgStyle     = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));
  const cardStyle   = useAnimatedStyle(() => ({ opacity: cardOpacity.value, transform: [{ scale: cardScale.value }] }));
  const cancelStyle = useAnimatedStyle(() => ({ opacity: cancelSv.value, transform: [{ scale: cancelSv.value }] }));
  const btnStyles   = [
    useAnimatedStyle(() => ({ opacity: s0.value, transform: [{ scale: s0.value }] })),
    useAnimatedStyle(() => ({ opacity: s1.value, transform: [{ scale: s1.value }] })),
    useAnimatedStyle(() => ({ opacity: s2.value, transform: [{ scale: s2.value }] })),
    useAnimatedStyle(() => ({ opacity: s3.value, transform: [{ scale: s3.value }] })),
  ];

  useEffect(() => {
    if (visible) {
      setShow(true);
      bgOpacity.value   = withTiming(1, { duration: 220 });
      cardScale.value   = withSpring(1, { damping: 18, stiffness: 280 });
      cardOpacity.value = withTiming(1, { duration: 200 });
      cancelSv.value    = withDelay(220, withSpring(1, { damping: 16, stiffness: 300 }));
      s0.value = withDelay(40,  withSpring(1, { damping: 13, stiffness: 330 }));
      s1.value = withDelay(90,  withSpring(1, { damping: 13, stiffness: 330 }));
      s2.value = withDelay(140, withSpring(1, { damping: 13, stiffness: 330 }));
      s3.value = withDelay(190, withSpring(1, { damping: 13, stiffness: 330 }));
    } else {
      bgOpacity.value   = withTiming(0, { duration: 180 });
      cardOpacity.value = withTiming(0, { duration: 150 });
      cardScale.value   = withTiming(0.82, { duration: 150 });
      cancelSv.value    = withTiming(0, { duration: 120 });
      s0.value = s1.value = s2.value = s3.value = withTiming(0, { duration: 120 });
      const t = setTimeout(() => setShow(false), 200);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!show || !habit) return null;

  const pillarColor = PILLAR_COLORS[habit.category];
  const isImportant = habit.important ?? false;

  const tap = (cb: () => void) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    cb();
    onClose();
  };

  const ACTIONS = [
    { icon: "bookmark",     label: isImportant ? "Unpin" : "Pin",  color: colors.warning,     onPress: () => tap(onToggleImportant) },
    { icon: "edit-2",       label: "Edit",                          color: colors.accent,      onPress: () => tap(onEdit) },
    { icon: "minus-circle", label: "Skip",                          color: colors.info,        onPress: () => tap(onSkip) },
    { icon: "archive",      label: "Freeze",                        color: "#8A8A9A",          onPress: () => tap(onArchive) },
  ];

  return (
    <Modal transparent visible={show} animationType="none" onRequestClose={onClose} statusBarTranslucent>

      {/* ── Dark overlay ── */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.78)" }, bgStyle]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* ── Rainbow arc buttons — rendered label-above-circle ── */}
      {ACTIONS.map((action, i) => {
        const { bx, by } = btnCenter(i);
        // Label sits ABOVE the circle → entire block top = label top = circle_center - BTN/2 - gap - labelH
        const wrapTop  = by - BTN / 2 - LABEL_GAP - LABEL_H;
        const wrapLeft = bx - BTN / 2;
        return (
          <Animated.View key={action.label} style={[styles.btnWrap, { left: wrapLeft, top: wrapTop }, btnStyles[i]]}>
            {/* Label above */}
            <Text style={[styles.btnLabel, { color: action.color, fontFamily: font.semibold }]}>
              {action.label}
            </Text>
            <View style={{ height: LABEL_GAP }} />
            {/* Circle below label */}
            <TouchableOpacity
              onPress={action.onPress}
              activeOpacity={0.72}
              style={[styles.btnCircle, { width: BTN, height: BTN, borderRadius: BTN / 2, backgroundColor: colors.card, borderColor: action.color + "70" }]}
            >
              <LinearGradient
                colors={[action.color + "24", action.color + "08"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <Feather name={action.icon as any} size={22} color={action.color} />
            </TouchableOpacity>
          </Animated.View>
        );
      })}

      {/* ── Subtle arc guide line (decorative) ── */}
      {ANGLES.map((angleDeg, i) => {
        const rad = (angleDeg * Math.PI) / 180;
        // Draw from card edge to just before the button
        const lineLen = R - BTN / 2 - 14;
        const midX = CX + (R / 2) * Math.cos(rad);
        const midY = CY + (R / 2) * Math.sin(rad);
        return (
          <Animated.View
            key={`arc-${i}`}
            style={[
              styles.arcLine,
              {
                width: lineLen,
                left: midX - lineLen / 2,
                top: midY,
                transform: [{ rotate: `${angleDeg}deg` }],
              },
              btnStyles[i],
            ]}
          />
        );
      })}

      {/* ── Center habit card ── */}
      <Animated.View
        style={[
          styles.card,
          {
            left: CX - CARD_W / 2,
            top: CY - 40,
            width: CARD_W,
            backgroundColor: colors.card,
            borderColor: habit.color + "60",
          },
          cardStyle,
        ]}
      >
        <LinearGradient
          colors={[habit.color + "18", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={[styles.accentBar, { backgroundColor: habit.color }]} />
        <View style={[styles.cardIcon, { backgroundColor: habit.color + "22" }]}>
          <Feather name={habit.icon as any} size={24} color={habit.color} />
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.cardName, { color: colors.foreground, fontFamily: font.bold }]} numberOfLines={1}>
            {habit.name}
          </Text>
          <View style={styles.cardMeta}>
            <View style={[styles.catDot, { backgroundColor: pillarColor }]} />
            <Text style={[styles.cardCat, { color: colors.mutedForeground, fontFamily: font.regular }]}>
              {PILLAR_LABELS[habit.category]}
            </Text>
            {habit.streak > 0 && (
              <>
                <View style={[styles.metaDivider, { backgroundColor: "rgba(255,255,255,0.15)" }]} />
                <Feather name="zap" size={10} color={colors.warning} />
                <Text style={[styles.cardStreak, { color: colors.warning, fontFamily: font.bold }]}>
                  {habit.streak}d
                </Text>
              </>
            )}
          </View>
        </View>
        {isImportant && (
          <View style={[styles.pinBadge, { backgroundColor: colors.warning + "22" }]}>
            <Feather name="bookmark" size={13} color={colors.warning} />
          </View>
        )}
      </Animated.View>

      {/* ── Cancel — below the card ── */}
      <Animated.View style={[styles.cancelWrap, { left: CX - 30, top: CY + 58 }, cancelStyle]}>
        <TouchableOpacity
          onPress={onClose}
          style={[styles.cancelBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
        >
          <Feather name="x" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
        <Text style={[styles.cancelLabel, { color: colors.mutedForeground, fontFamily: font.regular }]}>
          Cancel
        </Text>
      </Animated.View>

    </Modal>
  );
}

const styles = StyleSheet.create({
  btnWrap: {
    position: "absolute",
    alignItems: "center",
    width: BTN,
  },
  btnLabel: {
    fontSize: 11,
    letterSpacing: 0.3,
    textAlign: "center",
    width: 68,
    marginLeft: -2, // visually center wider labels over the 64px circle
  },
  btnCircle: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    overflow: "hidden",
  },

  arcLine: {
    position: "absolute",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
  },

  card: {
    position: "absolute",
    borderRadius: 20,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingRight: 14,
    gap: 10,
    overflow: "hidden",
  },
  accentBar: {
    width: 4,
    alignSelf: "stretch",
    borderRadius: 2,
    marginLeft: 10,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, gap: 4 },
  cardName: { fontSize: 15 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  cardCat: { fontSize: 11 },
  metaDivider: { width: 1, height: 10, marginHorizontal: 2 },
  cardStreak: { fontSize: 11 },
  pinBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 2,
  },

  cancelWrap: { position: "absolute", alignItems: "center", gap: 5 },
  cancelBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelLabel: { fontSize: 10, letterSpacing: 0.2 },
});
