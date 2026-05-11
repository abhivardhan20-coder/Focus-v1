import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, TextInput, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useFont } from '@/hooks/useFont';
import { formatReminderTime } from '@/lib/notifications';
import { NotifRecurrence } from '@/lib/notificationService';

interface ReminderSectionProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  reminderHH: string;
  setReminderHH: (v: string) => void;
  reminderMM: string;
  setReminderMM: (v: string) => void;
  recurrence: NotifRecurrence;
  onRecurrenceChange: (r: NotifRecurrence) => void;
  customIntervalH: string;
  setCustomIntervalH: (v: string) => void;
  customIntervalM: string;
  setCustomIntervalM: (v: string) => void;
  accentColor: string;
}

const QUICK_TIMES = [
  { label: "6 AM", value: "06:00" },
  { label: "7 AM", value: "07:00" },
  { label: "8 AM", value: "08:00" },
  { label: "9 AM", value: "09:00" },
  { label: "12 PM", value: "12:00" },
  { label: "3 PM", value: "15:00" },
  { label: "6 PM", value: "18:00" },
  { label: "9 PM", value: "21:00" },
];

export const ReminderSection: React.FC<ReminderSectionProps> = ({
  enabled,
  onToggle,
  reminderHH,
  setReminderHH,
  reminderMM,
  setReminderMM,
  recurrence,
  onRecurrenceChange,
  customIntervalH,
  setCustomIntervalH,
  customIntervalM,
  setCustomIntervalM,
  accentColor,
}) => {
  const colors = useColors();
  const font = useFont();
  const reminderTime = `${reminderHH.padStart(2, "0")}:${reminderMM.padStart(2, "0")}`;

  const RECURRENCE_ITEMS: { id: NotifRecurrence; label: string; desc: string }[] = [
    { id: "once", label: "Once", desc: "One notification daily" },
    { id: "twice", label: "Twice", desc: "Midday & evening reminders" },
    { id: "custom", label: "Custom", desc: "Repeat every few hours" },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.reminderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => onToggle(!enabled)}
          style={styles.reminderToggleRow}
          activeOpacity={0.75}
        >
          <View style={[styles.reminderIcon, { backgroundColor: enabled ? accentColor + "22" : colors.secondary }]}>
            <Feather name="bell" size={15} color={enabled ? accentColor : colors.mutedForeground} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.reminderTitle, { color: enabled ? accentColor : colors.foreground, fontFamily: font.medium }]}>
              {enabled ? `Reminder at ${formatReminderTime(reminderTime)}` : "Enable reminders"}
            </Text>
            <Text style={[styles.reminderSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
              Stay consistent with daily alerts
            </Text>
          </View>
          <View style={[styles.togglePill, { backgroundColor: enabled ? accentColor : colors.border }]}>
            <View style={[styles.toggleDot, { marginLeft: enabled ? 16 : 2 }]} />
          </View>
        </TouchableOpacity>

        {enabled && (
          <>
            <View style={[styles.reminderDivider, { backgroundColor: colors.border }]} />
            <View style={styles.quickTimeGrid}>
              {QUICK_TIMES.map((qt) => {
                const active = reminderTime === qt.value;
                return (
                  <TouchableOpacity
                    key={qt.value}
                    onPress={() => {
                      const [hh, mm] = qt.value.split(":");
                      setReminderHH(hh);
                      setReminderMM(mm);
                    }}
                    style={[
                      styles.quickTimeChip,
                      {
                        backgroundColor: active ? accentColor + "20" : colors.secondary,
                        borderColor: active ? accentColor : colors.border,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <Text style={[styles.quickTimeText, { color: active ? accentColor : colors.mutedForeground, fontFamily: font.medium }]}>
                      {qt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.customTimeRow}>
              <Text style={[styles.customTimeLabel, { color: colors.mutedForeground, fontFamily: font.regular }]}>Custom:</Text>
              <TextInput
                value={reminderHH}
                onChangeText={(v) => setReminderHH(v.replace(/\D/g, "").slice(0, 2))}
                onBlur={() => {
                  const clamped = Math.min(23, Math.max(0, parseInt(reminderHH) || 7));
                  setReminderHH(String(clamped).padStart(2, "0"));
                }}
                keyboardType="number-pad"
                maxLength={2}
                style={[styles.timeInput, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border, fontFamily: font.bold }]}
              />
              <Text style={[styles.timeColon, { color: colors.foreground, fontFamily: font.bold }]}>:</Text>
              <TextInput
                value={reminderMM}
                onChangeText={(v) => setReminderMM(v.replace(/\D/g, "").slice(0, 2))}
                onBlur={() => {
                  const clamped = Math.min(59, Math.max(0, parseInt(reminderMM) || 0));
                  setReminderMM(String(clamped).padStart(2, "0"));
                }}
                keyboardType="number-pad"
                maxLength={2}
                style={[styles.timeInput, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border, fontFamily: font.bold }]}
              />
            </View>
          </>
        )}
      </View>

      {enabled && (
        <View style={[styles.recurrenceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {RECURRENCE_ITEMS.map((item, i) => {
            const active = recurrence === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => onRecurrenceChange(item.id)}
                style={[
                  styles.recurrenceRow,
                  {
                    borderBottomWidth: i < RECURRENCE_ITEMS.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                    backgroundColor: active ? accentColor + "08" : "transparent",
                  },
                ]}
              >
                <View style={[styles.radio, { borderColor: active ? accentColor : colors.border, backgroundColor: active ? accentColor : "transparent" }]}>
                  {active && <View style={styles.radioDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.recurrenceLabel, { color: active ? accentColor : colors.foreground, fontFamily: font.semibold }]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.recurrenceSub, { color: colors.mutedForeground, fontFamily: font.regular }]}>
                    {item.desc}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
          {recurrence === "custom" && (
            <View style={[styles.intervalRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.intervalLabel, { color: colors.mutedForeground, fontFamily: font.regular }]}>Repeat every</Text>
              <TextInput
                value={customIntervalH}
                onChangeText={setCustomIntervalH}
                keyboardType="numeric"
                maxLength={2}
                style={[styles.intervalInput, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border, fontFamily: font.bold }]}
              />
              <Text style={[styles.intervalLabel, { color: colors.mutedForeground, fontFamily: font.regular }]}>h</Text>
              <TextInput
                value={customIntervalM}
                onChangeText={setCustomIntervalM}
                keyboardType="numeric"
                maxLength={2}
                style={[styles.intervalInput, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border, fontFamily: font.bold }]}
              />
              <Text style={[styles.intervalLabel, { color: colors.mutedForeground, fontFamily: font.regular }]}>min</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 14 },
  reminderCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  reminderToggleRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  reminderIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  reminderTitle: { fontSize: 14 },
  reminderSub: { fontSize: 11, marginTop: 2 },
  togglePill: { width: 38, height: 22, borderRadius: 11, justifyContent: "center" },
  toggleDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#fff" },
  reminderDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  quickTimeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 14, paddingTop: 12 },
  quickTimeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  quickTimeText: { fontSize: 13 },
  customTimeRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
  customTimeLabel: { fontSize: 13 },
  timeInput: { width: 52, textAlign: "center", borderRadius: 10, borderWidth: 1, paddingVertical: 8, fontSize: 17 },
  timeColon: { fontSize: 20 },
  recurrenceCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  recurrenceRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  recurrenceLabel: { fontSize: 14 },
  recurrenceSub: { fontSize: 11, marginTop: 2 },
  intervalRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderTopWidth: 1 },
  intervalLabel: { fontSize: 13 },
  intervalInput: { width: 46, textAlign: "center", borderRadius: 10, borderWidth: 1, paddingVertical: 8, fontSize: 16 },
});
