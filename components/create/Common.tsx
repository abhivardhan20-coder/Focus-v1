import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useFont } from '@/hooks/useFont';

interface DateSegInputProps {
  value: string;
  onChange: (v: string) => void;
  colors: any;
}

export const DateSegInput: React.FC<DateSegInputProps> = ({
  value,
  onChange,
  colors,
}) => {
  const parts = value.split("-");
  const y = parts[0] ?? "";
  const m = parts[1] ?? "";
  const d = parts[2] ?? "";
  const update = (ny: string, nm: string, nd: string) =>
    onChange(`${ny}-${nm}-${nd}`);

  const seg = (
    width: number,
    val: string,
    ph: string,
    onChange2: (v: string) => void,
    max: number
  ) => (
    <TextInput
      value={val}
      onChangeText={(v) => onChange2(v.replace(/\D/g, "").slice(0, max))}
      placeholder={ph}
      placeholderTextColor={colors.mutedForeground}
      keyboardType="number-pad"
      maxLength={max}
      style={[
        styles.dateSeg,
        {
          width,
          backgroundColor: colors.secondary,
          color: colors.foreground,
          borderColor: colors.border,
        },
      ]}
    />
  );
  return (
    <View style={styles.dateSegRow}>
      {seg(54, y, "YYYY", (v) => update(v, m, d), 4)}
      <Text style={[styles.dateSep, { color: colors.mutedForeground }]}>/</Text>
      {seg(36, m, "MM", (v) => update(y, v, d), 2)}
      <Text style={[styles.dateSep, { color: colors.mutedForeground }]}>/</Text>
      {seg(36, d, "DD", (v) => update(y, m, v), 2)}
    </View>
  );
};

interface SectionLabelProps {
  iconName: string;
  title: string;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({ iconName, title }) => {
  const colors = useColors();
  const font = useFont();
  return (
    <View style={styles.sectionLabelRow}>
      <Feather name={iconName as any} size={13} color={colors.mutedForeground} />
      <Text
        style={[
          styles.sectionLabel,
          { color: colors.mutedForeground, fontFamily: font.semibold },
        ]}
      >
        {title.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  dateSegRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateSeg: {
    textAlign: "center",
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 6,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  dateSep: { fontSize: 14 },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: -4,
  },
  sectionLabel: { fontSize: 11, letterSpacing: 0.8 },
});
