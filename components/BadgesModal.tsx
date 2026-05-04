import React from "react";
import {
  Modal,
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
import { BADGES } from "@/constants/badges";
import { useHabits } from "@/context/HabitsContext";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function BadgesModal({ visible, onClose }: Props) {
  const colors = useColors();
  const font = useFont();
  const insets = useSafeAreaInsets();
  const { userStats } = useHabits();
  const earnedSet = new Set(userStats.badges);
  const earnedCount = userStats.badges.length;
  const pct = Math.round((earnedCount / BADGES.length) * 100);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              paddingBottom: insets.bottom + 24,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.foreground, fontFamily: font.bold }]}>
                Achievements
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: font.regular }]}
              >
                {earnedCount} of {BADGES.length} unlocked
              </Text>
            </View>
            <View
              style={[
                styles.pctBadge,
                { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" },
              ]}
            >
              <Text style={[styles.pctText, { color: colors.primary, fontFamily: font.bold }]}>
                {pct}%
              </Text>
            </View>
          </View>

          <View style={[styles.progressWrap, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.primary, width: `${pct}%` as any },
              ]}
            />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.grid}
          >
            {BADGES.map((badge) => {
              const earned = earnedSet.has(badge.id);
              return (
                <View
                  key={badge.id}
                  style={[
                    styles.badgeCard,
                    {
                      backgroundColor: earned ? badge.color + "10" : colors.secondary,
                      borderColor: earned ? badge.color + "44" : colors.border,
                      opacity: earned ? 1 : 0.55,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      {
                        backgroundColor: earned ? badge.color + "22" : colors.border + "55",
                      },
                    ]}
                  >
                    <Feather
                      name={badge.icon as any}
                      size={22}
                      color={earned ? badge.color : colors.mutedForeground}
                    />
                  </View>
                  <Text
                    style={[
                      styles.badgeName,
                      {
                        color: earned ? colors.foreground : colors.mutedForeground,
                        fontFamily: font.semibold,
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {badge.name}
                  </Text>
                  <Text
                    style={[
                      styles.badgeDesc,
                      { color: colors.mutedForeground, fontFamily: font.regular },
                    ]}
                    numberOfLines={2}
                  >
                    {badge.desc}
                  </Text>
                  {earned && (
                    <View
                      style={[styles.earnedTag, { backgroundColor: badge.color + "18" }]}
                    >
                      <Feather name="check" size={9} color={badge.color} />
                      <Text
                        style={[
                          styles.earnedText,
                          { color: badge.color, fontFamily: font.semibold },
                        ]}
                      >
                        Earned
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.52)",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingTop: 12,
    maxHeight: "88%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
    gap: 12,
  },
  title: { fontSize: 22 },
  subtitle: { fontSize: 13, marginTop: 2 },
  pctBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  pctText: { fontSize: 16 },
  progressWrap: {
    height: 5,
    marginHorizontal: 20,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressFill: { height: "100%", borderRadius: 3 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    gap: 10,
    paddingTop: 2,
    paddingBottom: 8,
  },
  badgeCard: {
    width: "47%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
    alignItems: "flex-start",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeName: { fontSize: 13 },
  badgeDesc: { fontSize: 11, lineHeight: 15 },
  earnedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 2,
  },
  earnedText: { fontSize: 10 },
});
