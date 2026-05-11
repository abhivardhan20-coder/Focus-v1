import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GestureDetector } from 'react-native-gesture-handler';
import { useColors } from '@/hooks/useColors';
import { useFont } from '@/hooks/useFont';

interface RoutineHeaderProps {
  onBack: () => void;
  onSave: () => void;
  isEditMode: boolean;
  accentColor: string;
  gesture?: any;
}

export const RoutineHeader: React.FC<RoutineHeaderProps> = ({
  onBack,
  onSave,
  isEditMode,
  accentColor,
  gesture,
}) => {
  const colors = useColors();
  const font = useFont();

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Feather name="arrow-left" size={22} color={colors.foreground} />
      </TouchableOpacity>
      <GestureDetector gesture={gesture}>
        <View style={styles.titleArea}>
          <Text
            style={[
              styles.title,
              { color: colors.foreground, fontFamily: font.bold },
            ]}
          >
            {isEditMode ? "Edit Routine" : "New Routine"}
          </Text>
          {!isEditMode && (
            <Text
              style={[
                styles.swipeHint,
                { color: colors.mutedForeground, fontFamily: font.regular },
              ]}
            >
              ← swipe to switch to Habit →
            </Text>
          )}
        </View>
      </GestureDetector>
      <TouchableOpacity
        onPress={onSave}
        style={[styles.saveBtn, { backgroundColor: accentColor }]}
      >
        <Text style={[styles.saveBtnText, { color: "#fff", fontFamily: font.semibold }]}>
          {isEditMode ? "Save" : "Create"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: { padding: 4, width: 36 },
  titleArea: { flex: 1, alignItems: "center", paddingVertical: 4 },
  title: { fontSize: 18 },
  swipeHint: { fontSize: 10, marginTop: 2, opacity: 0.7 },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: "center",
  },
  saveBtnText: { fontSize: 14 },
});
