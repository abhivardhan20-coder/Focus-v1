import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useFont } from '@/hooks/useFont';
import { type Routine } from '@/context/HabitsContext';

interface RoutineSelectorProps {
  routines: Routine[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  accentColor: string;
  onNewRoutine: () => void;
}

export const RoutineSelector: React.FC<RoutineSelectorProps> = ({
  routines,
  selectedIds,
  onToggle,
  accentColor,
  onNewRoutine,
}) => {
  const colors = useColors();
  const font = useFont();

  if (routines.length === 0) {
    return (
      <TouchableOpacity
        onPress={onNewRoutine}
        style={[styles.routineEmptyBtn, { borderColor: colors.border }]}
      >
        <Feather name="plus-circle" size={18} color={colors.mutedForeground} />
        <Text style={[styles.routineEmptyText, { color: colors.mutedForeground, fontFamily: font.medium }]}>
          No routines yet. Tap to create one.
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.routineList, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {routines.map((r, i) => {
        const checked = selectedIds.includes(r.id);
        const timeColor =
          r.timeOfDay === "morning"
            ? "#F97316"
            : r.timeOfDay === "afternoon"
            ? "#FBBF24"
            : r.timeOfDay === "evening"
            ? "#A855F7"
            : "#3B82F6";
        const timeIcon =
          r.timeOfDay === "morning"
            ? "sunrise"
            : r.timeOfDay === "afternoon"
            ? "sun"
            : r.timeOfDay === "evening"
            ? "sunset"
            : "moon";
        return (
          <TouchableOpacity
            key={r.id}
            onPress={() => onToggle(r.id)}
            style={[
              styles.routineRow,
              {
                borderBottomWidth: i < routines.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
                backgroundColor: checked ? accentColor + "08" : "transparent",
              },
            ]}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.routineCheck,
                {
                  borderColor: checked ? accentColor : colors.border,
                  backgroundColor: checked ? accentColor : "transparent",
                },
              ]}
            >
              {checked && <Feather name="check" size={11} color="#fff" />}
            </View>
            <View style={[styles.routineTimeIcon, { backgroundColor: timeColor + "18" }]}>
              <Feather name={timeIcon as any} size={13} color={timeColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.routineName, { color: colors.foreground, fontFamily: font.medium }]}>
                {r.name}
              </Text>
              <Text style={[styles.routineMeta, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                {r.habitIds.length} habit{r.habitIds.length !== 1 ? "s" : ""} · {r.timeOfDay}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity
        onPress={onNewRoutine}
        style={[styles.routineAddBtn, { borderTopColor: colors.border }]}
      >
        <Feather name="plus" size={13} color={colors.primary} />
        <Text style={[styles.routineAddBtnText, { color: colors.primary, fontFamily: font.medium }]}>
          New Routine
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  routineEmptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  routineEmptyText: { fontSize: 14 },
  routineList: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  routineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  routineCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  routineTimeIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  routineName: { fontSize: 14 },
  routineMeta: { fontSize: 11, marginTop: 2 },
  routineAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  routineAddBtnText: { fontSize: 13 },
});
