import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GestureDetector } from 'react-native-gesture-handler';
import { useColors } from '@/hooks/useColors';
import { useFont } from '@/hooks/useFont';

interface CreateHeaderProps {
  onBack: () => void;
  onSave: () => void;
  canSave: boolean;
  accentColor: string;
  gesture?: any;
}

export const CreateHeader: React.FC<CreateHeaderProps> = ({
  onBack,
  onSave,
  canSave,
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
              styles.pageTitle,
              { color: colors.foreground, fontFamily: font.bold },
            ]}
          >
            New Habit
          </Text>
          <Text
            style={[
              styles.swipeHint,
              { color: colors.mutedForeground, fontFamily: font.regular },
            ]}
          >
            ← swipe to switch to Routine →
          </Text>
        </View>
      </GestureDetector>
      <TouchableOpacity
        onPress={onSave}
        disabled={!canSave}
        style={[
          styles.saveBtn,
          {
            backgroundColor: canSave ? accentColor : colors.muted,
            opacity: canSave ? 1 : 0.5,
          },
        ]}
      >
        <Feather name="check" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  backBtn: { padding: 4, width: 36 },
  titleArea: { flex: 1, alignItems: "center", paddingVertical: 4 },
  pageTitle: { fontSize: 18 },
  swipeHint: { fontSize: 10, marginTop: 2, opacity: 0.7 },
  saveBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
