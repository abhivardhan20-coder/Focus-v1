import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useFont } from '@/hooks/useFont';
import { PILLAR_COLORS, PILLAR_LABELS, type Habit, type HabitCategory } from '@/context/HabitsContext';

interface HabitSelectionListProps {
  habits: Habit[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  catFilter: "all" | HabitCategory;
  onFilterChange: (cat: "all" | HabitCategory) => void;
}

const CATEGORY_FILTERS: ("all" | HabitCategory)[] = [
  "all", "physical", "mental", "academics", "creativity", "chores",
];

export const HabitSelectionList: React.FC<HabitSelectionListProps> = ({
  habits,
  selectedIds,
  onToggle,
  catFilter,
  onFilterChange,
}) => {
  const colors = useColors();
  const font = useFont();

  const filteredHabits = catFilter === "all" 
    ? habits 
    : habits.filter(h => h.category === catFilter);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catScroll}
        contentContainerStyle={styles.catScrollContent}
      >
        {CATEGORY_FILTERS.map((cat) => {
          const active = catFilter === cat;
          const catColor = cat === "all" ? colors.primary : PILLAR_COLORS[cat as HabitCategory];
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => onFilterChange(cat)}
              style={[
                styles.catChip,
                {
                  backgroundColor: active ? catColor + "22" : colors.secondary,
                  borderColor: active ? catColor : colors.border,
                  borderWidth: 1,
                },
              ]}
            >
              <Text style={[styles.catChipText, { color: active ? catColor : colors.mutedForeground, fontFamily: font.medium }]}>
                {cat === "all" ? "All" : PILLAR_LABELS[cat as HabitCategory]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {habits.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="inbox" size={28} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: font.regular }]}>
            No habits yet. Create some habits first.
          </Text>
        </View>
      ) : filteredHabits.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: font.regular }]}>
            No habits in this category
          </Text>
        </View>
      ) : (
        <View style={[styles.habitList, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {filteredHabits.map((habit, i) => {
            const selected = selectedIds.includes(habit.id);
            const habitColor = PILLAR_COLORS[habit.category];
            return (
              <TouchableOpacity
                key={habit.id}
                onPress={() => onToggle(habit.id)}
                style={[
                  styles.habitRow,
                  {
                    borderBottomColor: colors.border,
                    borderBottomWidth: i < filteredHabits.length - 1 ? 1 : 0,
                    backgroundColor: selected ? habitColor + "08" : "transparent",
                  },
                ]}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.checkbox,
                  { backgroundColor: selected ? habitColor : "transparent", borderColor: selected ? habitColor : colors.border },
                ]}>
                  {selected && <Feather name="check" size={12} color="#fff" />}
                </View>
                <View style={[styles.habitIcon, { backgroundColor: habitColor + "18" }]}>
                  <Feather name={habit.icon as any} size={15} color={habitColor} />
                </View>
                <View style={styles.habitInfo}>
                  <Text style={[styles.habitName, { color: colors.foreground, fontFamily: font.medium }]} numberOfLines={1}>
                    {habit.name}
                  </Text>
                  <View style={styles.habitMeta}>
                    <View style={[styles.catDot, { backgroundColor: habitColor }]} />
                    <Text style={[styles.habitCat, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                      {PILLAR_LABELS[habit.category]}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 12 },
  catScroll: { marginHorizontal: -16 },
  catScrollContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  catChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  catChipText: { fontSize: 13 },
  emptyBox: { borderRadius: 14, padding: 32, alignItems: "center", justifyContent: "center", gap: 12, borderWidth: 1, borderStyle: "dashed" },
  emptyText: { fontSize: 14, textAlign: "center" },
  habitList: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  habitRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  habitIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  habitInfo: { flex: 1 },
  habitName: { fontSize: 14 },
  habitMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  habitCat: { fontSize: 11 },
});
