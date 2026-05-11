import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useFont } from "@/hooks/useFont";
import type { Badge } from "@/constants/badges";

export type NotificationItem =
  | { id: string; kind: "badge"; badge: Badge & { earnedAt: number }; timestamp: number }
  | { id: string; kind: "levelup"; level: number; timestamp: number }
  | { id: string; kind: "streak"; milestone: { habitName: string; habitColor: string; days: number }; timestamp: number }
  | { id: string; kind: "streakAtRisk"; habits: Array<{ id: string; name: string; streak: number; icon: string; color: string }>; freezeTokens: number; timestamp: number }
  | { id: string; kind: "difficultyNudge"; habitId: string; habitName: string; type: "upgrade" | "downgrade"; rate: number; currentDifficulty: string; newDifficulty: string; timestamp: number };

interface Props {
  visible: boolean;
  notifications: NotificationItem[];
  onClose: () => void;
  onClearAll: () => void;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function NotifRow({ item }: { item: NotificationItem }) {
  const colors = useColors();
  const font = useFont();

  let icon: string = "bell";
  let color: string = "#3B82F6";
  let title: string = "Notification";
  let subtitle: string = "";

  if (item.kind === "badge") {
    icon = item.badge.icon ?? "award";
    color = item.badge.color;
    title = `Badge Unlocked: ${item.badge.name}`;
    subtitle = item.badge.desc;
  } else if (item.kind === "levelup") {
    icon = "zap";
    color = "#6366F1";
    title = `Level ${item.level} Reached!`;
    subtitle = `Keep completing habits to unlock Level ${item.level + 1}.`;
  } else if (item.kind === "streak") {
    icon = "zap";
    color = item.milestone.habitColor || "#FBBF24";
    title = `${item.milestone.days}-Day Streak!`;
    subtitle = `${item.milestone.habitName} — ${item.milestone.days} days straight.`;
  } else if (item.kind === "streakAtRisk") {
    icon = "alert-circle";
    color = "#FBBF24";
    title = `Streaks at Risk`;
    const count = item.habits.length;
    subtitle = `${count} habit${count !== 1 ? "s" : ""} unprotected · ${item.freezeTokens} freeze token${item.freezeTokens !== 1 ? "s" : ""} left`;
  } else if (item.kind === "difficultyNudge") {
    icon = item.type === "upgrade" ? "trending-up" : "trending-down";
    color = item.type === "upgrade" ? "#10B981" : "#F59E0B";
    title = item.type === "upgrade" ? "Ready to Level Up" : "Momentum Reset";
    subtitle = `${item.habitName} — ${Math.round(item.rate * 100)}% completion. Adjust difficulty to ${item.newDifficulty}.`;
  } else {
    // Fallback for future-proofing
    title = "System Update";
    subtitle = "Something new happened in Focus!";
  }

  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
      <LinearGradient
        colors={[color + "18", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
        pointerEvents="none"
      />
      <View style={[styles.rowIcon, { backgroundColor: color + "22", borderColor: color + "44" }]}>
        <Feather name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: colors.foreground, fontFamily: font.semibold }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.rowSub, { color: colors.mutedForeground, fontFamily: font.regular }]} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <Text style={[styles.rowTime, { color: colors.mutedForeground, fontFamily: font.regular }]}>
        {timeAgo(item.timestamp)}
      </Text>
    </View>
  );
}

export function NotificationsPanel({ visible, notifications, onClose, onClearAll }: Props) {
  const colors = useColors();
  const font = useFont();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(600)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [show, setShow] = React.useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 62,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 600,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => setShow(false));
    }
  }, [visible]);

  if (!show) return null;

  const sorted = [...notifications].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropAnim }]}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: insets.bottom + 16,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleRow}>
              <Feather name="bell" size={18} color={colors.primary} />
              <Text style={[styles.sheetTitle, { color: colors.foreground, fontFamily: font.bold }]}>
                Notifications
              </Text>
            </View>
            <View style={styles.sheetHeaderRight}>
              {notifications.length > 0 && (
                <TouchableOpacity
                  onPress={onClearAll}
                  style={[styles.clearBtn, { backgroundColor: colors.secondary }]}
                >
                  <Text style={[styles.clearBtnText, { color: colors.mutedForeground, fontFamily: font.medium }]}>
                    Clear all
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: colors.secondary }]}
              >
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          {sorted.length === 0 ? (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
                <Feather name="bell-off" size={32} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: font.semibold }]}>
                All caught up
              </Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                Badges, level-ups, and streak milestones will appear here.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {sorted.map((item) => (
                <NotifRow key={item.id} item={item} />
              ))}
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "82%",
    minHeight: 220,
    overflow: "hidden",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sheetTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sheetTitle: { fontSize: 18 },
  sheetHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  clearBtnText: { fontSize: 12 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 8, gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowBody: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 14 },
  rowSub: { fontSize: 12, lineHeight: 17 },
  rowTime: { fontSize: 11, flexShrink: 0 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    paddingVertical: 48,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, textAlign: "center" },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 19 },
});
