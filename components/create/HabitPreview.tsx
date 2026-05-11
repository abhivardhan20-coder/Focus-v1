import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useFont } from '@/hooks/useFont';
import { PILLAR_LABELS, type HabitCategory } from '@/context/HabitsContext';

interface HabitPreviewProps {
  name: string;
  category: HabitCategory;
  icon: string;
  color: string;
  priority: string;
}

export const HabitPreview: React.FC<HabitPreviewProps> = ({
  name,
  category,
  icon,
  color,
  priority,
}) => {
  const colors = useColors();
  const font = useFont();

  return (
    <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.previewIconWrap, { backgroundColor: color + "20" }]}>
        <Feather name={icon as any} size={28} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.previewName,
            { color: colors.foreground, fontFamily: font.bold },
          ]}
          numberOfLines={1}
        >
          {name.trim() || "New Habit"}
        </Text>
        <Text
          style={[
            styles.previewSub,
            { color: colors.mutedForeground, fontFamily: font.medium },
          ]}
        >
          {PILLAR_LABELS[category]} · {priority.toUpperCase()} PRIORITY
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  previewCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  previewIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  previewName: { fontSize: 17 },
  previewSub: { fontSize: 12, marginTop: 3 },
});
