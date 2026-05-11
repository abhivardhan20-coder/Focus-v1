import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useFont } from '@/hooks/useFont';
import { PILLAR_COLORS, PILLAR_LABELS, type HabitCategory } from '@/context/HabitsContext';

interface PillarSelectorProps {
  category: HabitCategory;
  onCategoryChange: (cat: HabitCategory) => void;
  color: string;
  onColorChange: (color: string) => void;
  icon: string;
  onIconChange: (icon: string) => void;
}

const CATEGORIES: HabitCategory[] = [
  "physical", "mental", "academics", "creativity", "chores",
];

const COLORS = [
  "#13EC5B", "#A855F7", "#3B82F6", "#F97316", "#06B6D4",
  "#FBBF24", "#EC4899", "#34D399", "#F87171", "#818CF8",
];

const ICONS = [
  "activity", "book-open", "coffee", "droplet", "heart", "wind",
  "music", "pen-tool", "sun", "moon", "zap", "target",
  "trending-up", "user", "watch", "anchor", "award", "briefcase",
];

export const PillarSelector: React.FC<PillarSelectorProps> = ({
  category,
  onCategoryChange,
  color,
  onColorChange,
  icon,
  onIconChange,
}) => {
  const colors = useColors();
  const font = useFont();

  return (
    <View style={styles.container}>
      {/* Categories */}
      <View style={styles.chipRow}>
        {CATEGORIES.map((cat) => {
          const active = category === cat;
          const catColor = PILLAR_COLORS[cat];
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => onCategoryChange(cat)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? catColor + "20" : colors.secondary,
                  borderColor: active ? catColor : colors.border,
                  borderWidth: 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: active ? catColor : colors.mutedForeground,
                    fontFamily: font.medium,
                  },
                ]}
              >
                {PILLAR_LABELS[cat]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Icon Grid */}
      <View style={styles.iconGrid}>
        {ICONS.map((ic) => {
          const active = icon === ic;
          return (
            <TouchableOpacity
              key={ic}
              onPress={() => onIconChange(ic)}
              style={[
                styles.iconOption,
                {
                  backgroundColor: active ? color + "20" : colors.secondary,
                  borderColor: active ? color : colors.border,
                  borderWidth: active ? 1.5 : 1,
                },
              ]}
            >
              <Feather
                name={ic as any}
                size={20}
                color={active ? color : colors.mutedForeground}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Color Swatches */}
      <View style={styles.colorRow}>
        {COLORS.map((c) => {
          const active = color === c;
          return (
            <TouchableOpacity
              key={c}
              onPress={() => onColorChange(c)}
              style={[
                styles.colorSwatch,
                { backgroundColor: c, borderColor: colors.background, borderWidth: active ? 3 : 0 },
              ]}
            >
              {active && <Feather name="check" size={16} color="#fff" />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 16 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  chipText: { fontSize: 13 },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
