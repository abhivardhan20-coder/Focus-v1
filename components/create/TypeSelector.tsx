import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useFont } from '@/hooks/useFont';

export type HabitType = "binary" | "quantitative";

interface TypeSelectorProps {
  value: HabitType;
  onChange: (type: HabitType) => void;
  accentColor: string;
}

export const TypeSelector: React.FC<TypeSelectorProps> = ({ value, onChange, accentColor }) => {
  const colors = useColors();
  const font = useFont();

  const types: { id: HabitType; label: string; sub: string; icon: string }[] = [
    { id: "binary", label: "Checkmark", sub: "Simple yes/no", icon: "check" },
    {
      id: "quantitative",
      label: "Number",
      sub: "Pages, cups, km...",
      icon: "hash",
    },
  ];

  return (
    <View style={styles.typeRow}>
      {types.map((t) => {
        const active = value === t.id;
        return (
          <TouchableOpacity
            key={t.id}
            onPress={() => onChange(t.id)}
            style={[
              styles.typeCard,
              {
                backgroundColor: active ? accentColor + "15" : colors.card,
                borderColor: active ? accentColor : colors.border,
                borderWidth: active ? 1.5 : 1,
              },
            ]}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.typeIconWrap,
                { backgroundColor: active ? accentColor + "20" : colors.secondary },
              ]}
            >
              <Feather
                name={t.icon as any}
                size={18}
                color={active ? accentColor : colors.mutedForeground}
              />
            </View>
            <Text
              style={[
                styles.typeLabel,
                {
                  color: active ? accentColor : colors.foreground,
                  fontFamily: font.semibold,
                },
              ]}
            >
              {t.label}
            </Text>
            <Text
              style={[
                styles.typeSub,
                { color: colors.mutedForeground, fontFamily: font.regular },
              ]}
            >
              {t.sub}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  typeRow: { flexDirection: "row", gap: 10 },
  typeCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  typeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  typeLabel: { fontSize: 14, textAlign: "center" },
  typeSub: { fontSize: 11, textAlign: "center" },
});
