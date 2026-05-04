import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { router, Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="analysis">
        <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
        <Label>Analysis</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <Icon sf={{ default: "calendar", selected: "calendar.fill" as any }} />
        <Label>History</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "gear", selected: "gear.fill" as any }} />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function CreateSheet({ onClose }: { onClose: () => void }) {
  const colors = useColors();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <TouchableOpacity style={sheetStyles.backdrop} onPress={onClose} activeOpacity={1}>
        <View style={[sheetStyles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[sheetStyles.handle, { backgroundColor: colors.border }]} />
          <Text style={[sheetStyles.sheetTitle, { color: colors.foreground }]}>Add to FOCUS</Text>

          <TouchableOpacity
            style={[sheetStyles.option, { backgroundColor: colors.primary + "15", borderColor: colors.primary }]}
            onPress={() => { onClose(); setTimeout(() => router.push("/create"), 120); }}
          >
            <View style={[sheetStyles.optionIcon, { backgroundColor: colors.primary + "22" }]}>
              <Feather name="activity" size={22} color={colors.primary} />
            </View>
            <View style={sheetStyles.optionText}>
              <Text style={[sheetStyles.optionTitle, { color: colors.foreground }]}>New Habit</Text>
              <Text style={[sheetStyles.optionSub, { color: colors.mutedForeground }]}>
                Track a single daily behaviour
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[sheetStyles.option, { backgroundColor: colors.accent + "15", borderColor: colors.accent }]}
            onPress={() => { onClose(); setTimeout(() => router.push("/create-routine" as any), 120); }}
          >
            <View style={[sheetStyles.optionIcon, { backgroundColor: colors.accent + "22" }]}>
              <Feather name="layers" size={22} color={colors.accent} />
            </View>
            <View style={sheetStyles.optionText}>
              <Text style={[sheetStyles.optionTitle, { color: colors.foreground }]}>New Routine</Text>
              <Text style={[sheetStyles.optionSub, { color: colors.mutedForeground }]}>
                Sequence multiple habits into a flow
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>

          <TouchableOpacity style={sheetStyles.cancelBtn} onPress={onClose}>
            <Text style={[sheetStyles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    padding: 20, paddingBottom: 36, gap: 12,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  sheetTitle: { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 4 },
  option: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: 16, borderWidth: 1, padding: 14,
  },
  optionIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  optionText: { flex: 1, gap: 2 },
  optionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  optionSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cancelBtn: { alignItems: "center", paddingVertical: 10 },
  cancelText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});

function ClassicTabLayout() {
  const colors = useColors();
  const { theme } = useTheme();
  const isDark = theme.isDark;
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const [showSheet, setShowSheet] = useState(false);

  return (
    <>
    {showSheet && <CreateSheet onClose={() => setShowSheet(false)} />}
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={24} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="analysis"
        options={{
          title: "Analysis",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="chart.bar" tintColor={color} size={24} />
            ) : (
              <Feather name="bar-chart-2" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="create-tab"
        options={{
          title: "",
          tabBarButton: () => (
            <TouchableOpacity
              onPress={() => setShowSheet(true)}
              activeOpacity={0.85}
              style={styles.createBtnWrap}
            >
              <View style={[styles.createBtn, { backgroundColor: colors.primary }]}>
                <Feather name="plus" size={24} color={colors.background} />
              </View>
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="calendar" tintColor={color} size={24} />
            ) : (
              <Feather name="calendar" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="gear" tintColor={color} size={24} />
            ) : (
              <Feather name="settings" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
    </>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  createBtnWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: Platform.OS === "web" ? 10 : 4,
  },
  createBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    marginTop: -10,
  },
});
