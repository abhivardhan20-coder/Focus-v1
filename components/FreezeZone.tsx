import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useHabits, PILLAR_LABELS, PILLAR_COLORS, type Habit } from "@/context/HabitsContext";

interface FreezeZoneProps {
  visible: boolean;
  onClose: () => void;
}

function FrozenHabitRow({ habit, onUnfreeze, onDelete }: { habit: Habit; onUnfreeze: () => void; onDelete: () => void }) {
  const colors = useColors();
  const pillarColor = PILLAR_COLORS[habit.category] ?? colors.primary;

  const lastCompletion = habit.completions
    .filter((c) => c.completed)
    .sort((a, b) => (b.date > a.date ? 1 : -1))[0];

  const handleLongPress = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      habit.name,
      "What would you like to do with this habit?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unarchive",
          onPress: onUnfreeze,
        },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: onDelete,
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      onLongPress={handleLongPress}
      delayLongPress={400}
      activeOpacity={0.75}
      style={[styles.habitRow, { borderBottomColor: colors.border }]}
    >
      <View style={[styles.habitIcon, { backgroundColor: habit.color + "22", borderLeftWidth: 3, borderLeftColor: habit.color }]}>
        <Feather name={habit.icon as any} size={18} color={habit.color} />
      </View>
      <View style={styles.habitInfo}>
        <Text style={[styles.habitName, { color: colors.foreground }]} numberOfLines={1}>{habit.name}</Text>
        <View style={styles.habitMeta}>
          <View style={[styles.pillarChip, { backgroundColor: pillarColor + "22" }]}>
            <Text style={[styles.pillarText, { color: pillarColor }]}>{PILLAR_LABELS[habit.category]}</Text>
          </View>
          {habit.longestStreak > 0 && (
            <View style={styles.streakMeta}>
              <Feather name="zap" size={10} color={colors.warning} />
              <Text style={[styles.streakMeta2, { color: colors.warning }]}>Best: {habit.longestStreak}d</Text>
            </View>
          )}
          {lastCompletion && (
            <Text style={[styles.lastDate, { color: colors.mutedForeground }]}>
              Last: {lastCompletion.date}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.habitActions}>
        <TouchableOpacity
          onPress={onUnfreeze}
          style={[styles.unfreezeBtn, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "44" }]}
        >
          <Text style={[styles.unfreezeTxt, { color: colors.primary }]}>Unfreeze</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          style={[styles.deleteBtn, { backgroundColor: colors.destructive + "18" }]}
        >
          <Feather name="trash-2" size={14} color={colors.destructive} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export function FreezeZone({ visible, onClose }: FreezeZoneProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { habits, unarchiveHabit, deleteHabit } = useHabits();
  const translateY = useRef(new Animated.Value(900)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const archived = habits.filter((h) => h.archived);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 900, duration: 260, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleUnfreeze = (habit: Habit) => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    unarchiveHabit(habit.id);
  };

  const handleDelete = (habit: Habit) => {
    Alert.alert(
      "Delete Forever",
      `This will permanently delete "${habit.name}" and all its history. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            deleteHabit(habit.id);
          },
        },
      ]
    );
  };

  const bottomPad = Math.max(insets.bottom, 16);

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.glassBorder,
            paddingBottom: bottomPad + 16,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        <View style={styles.sheetHeader}>
          <View style={styles.titleRow}>
            <View style={[styles.titleIcon, { backgroundColor: colors.info + "22" }]}>
              <Feather name="archive" size={18} color={colors.info} />
            </View>
            <View>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Freeze Zone</Text>
              <Text style={[styles.sheetSub, { color: colors.mutedForeground }]}>
                {archived.length > 0
                  ? `${archived.length} habit${archived.length > 1 ? "s" : ""} resting here — history preserved`
                  : "Your archived habits live here"}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.secondary }]}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {archived.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="archive" size={32} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nothing frozen</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              Swipe left on any habit to archive it here without losing your data.
            </Text>
          </View>
        ) : (
          <FlatList
            data={archived}
            keyExtractor={(item) => item.id}
            scrollEnabled={archived.length > 4}
            style={styles.list}
            renderItem={({ item }) => (
              <FrozenHabitRow
                habit={item}
                onUnfreeze={() => handleUnfreeze(item)}
                onDelete={() => handleDelete(item)}
              />
            )}
          />
        )}

        <View style={[styles.footerHint, { borderTopColor: colors.border }]}>
          <Feather name="info" size={12} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Unfreeze to restore a habit to your active feed. All streaks and history are preserved.
          </Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    maxHeight: "80%",
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  titleIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sheetSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", gap: 10, paddingVertical: 40, paddingHorizontal: 32 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
  list: { paddingHorizontal: 16, maxHeight: 420 },
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  habitIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  habitInfo: { flex: 1, gap: 4 },
  habitName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  habitMeta: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  pillarChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  pillarText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  streakMeta: { flexDirection: "row", alignItems: "center", gap: 2 },
  streakMeta2: { fontSize: 10, fontFamily: "Inter_500Medium" },
  lastDate: { fontSize: 10, fontFamily: "Inter_400Regular" },
  habitActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  unfreezeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  unfreezeTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  footerHint: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    alignItems: "flex-start",
  },
  footerText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
});
