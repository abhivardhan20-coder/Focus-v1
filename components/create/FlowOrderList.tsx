import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useFont } from '@/hooks/useFont';
import { PILLAR_COLORS, type Habit } from '@/context/HabitsContext';
import { DraggableList } from '../DraggableList';

interface FlowOrderListProps {
  selectedHabits: Habit[];
  onReorder: (ids: string[]) => void;
  accentColor: string;
}

export const FlowOrderList: React.FC<FlowOrderListProps> = ({
  selectedHabits,
  onReorder,
  accentColor,
}) => {
  const colors = useColors();
  const font = useFont();

  return (
    <View style={[styles.orderList, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <DraggableList
        habits={selectedHabits}
        reorderMode={true}
        onReorder={onReorder}
        renderCard={(habit) => {
          const habitColor = PILLAR_COLORS[habit.category];
          const idx = selectedHabits.findIndex(h => h.id === habit.id);
          return (
            <View style={styles.orderRow}>
              <View style={[styles.stepNum, { backgroundColor: accentColor + "22", borderColor: accentColor }]}>
                <Text style={[styles.stepNumText, { color: accentColor, fontFamily: font.bold }]}>{idx + 1}</Text>
              </View>
              <View style={[styles.habitIcon, { backgroundColor: habitColor + "18" }]}>
                <Feather name={habit.icon as any} size={14} color={habitColor} />
              </View>
              <Text style={[styles.orderName, { color: colors.foreground, fontFamily: font.medium }]} numberOfLines={1}>
                {habit.name}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  orderList: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  orderRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  stepNum: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stepNumText: { fontSize: 11 },
  habitIcon: { width: 28, height: 28, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  orderName: { flex: 1, fontSize: 14 },
  reorderBtns: { flexDirection: "row", gap: 4 },
  reorderBtn: { padding: 4 },
});
