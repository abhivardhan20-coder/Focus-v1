import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { soundscape } from "@/lib/soundscape";
import {
  Dimensions, Modal, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import Animated, {
  Extrapolation, interpolate,
  useAnimatedProps, useDerivedValue,
  useSharedValue, withTiming,
} from "react-native-reanimated";
import {
  Circle, ClipPath, Defs, Ellipse, G,
  LinearGradient as SvgGrad, Path,
  RadialGradient as SvgRadialGrad, Rect, Stop, Svg,
} from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useHabits, getTodayStr } from "@/context/HabitsContext";
import { NumericHeatmapChart } from "@/components/NumericHeatmapChart";

// ─── SVG viewport ───────────────────────────────────────────────────────────
const VB_W = 320;
const VB_H = 290;
const SCREEN_W = Dimensions.get("window").width;
const SCENE_W  = Math.min(SCREEN_W - 32, 340);
const SCENE_H  = SCENE_W * (VB_H / VB_W);

// ─── Ice cube geometry (viewbox units) ──────────────────────────────────────
// Front face: (62,72) → (258,72) → (258,220) → (62,220)  rx=12
// Top  face:  (62,72) → (258,72) → (278,50)  → (82,50)
// Right face: (258,72) → (278,50) → (278,198) → (258,220)
// LCD backdrop (inside front): x=84 y=102 w=152 h=68 rx=8

// ─── Animated SVG components ────────────────────────────────────────────────
const AnimRect    = Animated.createAnimatedComponent(Rect);
const AnimEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimPath    = Animated.createAnimatedComponent(Path);
const AnimG       = Animated.createAnimatedComponent(G);

// ─── App types / constants ──────────────────────────────────────────────────
type Phase = "work" | "short_break" | "long_break";
const DURATIONS: Record<Phase, number> = { work: 25*60, short_break: 5*60, long_break: 15*60 };
const SOUNDS = [
  { id: "silence",     label: "Silence",     icon: "volume-x"   },
  { id: "white_noise", label: "White Noise", icon: "wind"       },
  { id: "rain",        label: "Rain",        icon: "cloud-rain" },
  { id: "fire",        label: "Fireplace",   icon: "feather"    },
  { id: "cafe",        label: "Café",        icon: "coffee"     },
  { id: "deep",        label: "Deep Space",  icon: "radio"      },
];
function fmt(s: number) {
  return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
}

export default function PomodoroScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { logPomodoroSession, pomodoroSessions } = useHabits();

  const [phase,         setPhase        ] = useState<Phase>("work");
  const [timeLeft,      setTimeLeft     ] = useState(DURATIONS.work);
  const [isRunning,     setIsRunning    ] = useState(false);
  const [sessions,      setSessions     ] = useState(0);
  const [selectedSound, setSelectedSound] = useState("silence");
  const [volume,        setVolume       ] = useState(0.45);
  const [customWorkMin, setCustomWorkMin] = useState(25);
  const [customBreakMin, setCustomBreakMin] = useState(5);
  const [selectedPreset, setSelectedPreset] = useState<"work" | "custom">("work");
  const [customModalVisible, setCustomModalVisible] = useState(false);

  const intervalRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef        = useRef<Phase>("work");
  phaseRef.current      = phase;
  const milestoneFired  = useRef<Set<string>>(new Set());

  const activeDurations = useMemo(() => {
    if (selectedPreset === "work") return DURATIONS;
    return {
      work: Math.max(60, customWorkMin * 60),
      short_break: Math.max(60, customBreakMin * 60),
      long_break: Math.max(60, customBreakMin * 60),
    };
  }, [customWorkMin, customBreakMin, selectedPreset]);
  const totalDuration   = activeDurations[phase];
  const progress        = 1 - timeLeft / totalDuration;

  // ── Shared progress value (drives all SVG animation) ────────────────────
  const progressSV = useSharedValue(0);
  useEffect(() => {
    progressSV.value = withTiming(progress, { duration: 950 });
  }, [progress]);

  // ── Completion burst value (drives celebration ripple burst) ─────────────
  const burstSV = useSharedValue(0);
  const [justCompleted, setJustCompleted] = useState(false);

  // ── Milestone haptics ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning || Platform.OS === "web") return;
    for (const [key, thr] of [["25pct",0.25],["50pct",0.50],["75pct",0.75]] as [string,number][]) {
      if (progress >= thr && !milestoneFired.current.has(key)) {
        milestoneFired.current.add(key);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    }
  }, [progress, isRunning]);
  useEffect(() => { milestoneFired.current.clear(); }, [phase]);

  // ── Soundscape: play when running, stop when paused/reset ───────────────
  useEffect(() => {
    if (isRunning && selectedSound !== "silence") {
      soundscape.play(selectedSound as any, volume);
    } else {
      soundscape.stop();
    }
  }, [isRunning, selectedSound]);

  // ── Volume changes apply immediately if running ──────────────────────────
  useEffect(() => {
    soundscape.setVolume(volume);
  }, [volume]);

  // ── Stop soundscape when unmounting ─────────────────────────────────────
  useEffect(() => {
    return () => { soundscape.stop(); };
  }, []);

  // ── Ice drip opacity (teardrops appear progressively) ───────────────────
  const drip1Props = useAnimatedProps(() => ({
    opacity: interpolate(progressSV.value, [0.04, 0.18], [0, 1], Extrapolation.CLAMP),
  }));
  const drip2Props = useAnimatedProps(() => ({
    opacity: interpolate(progressSV.value, [0.16, 0.32], [0, 1], Extrapolation.CLAMP),
  }));
  const drip3Props = useAnimatedProps(() => ({
    opacity: interpolate(progressSV.value, [0.28, 0.46], [0, 1], Extrapolation.CLAMP),
  }));

  // ── Melt puddle (grows as ice melts) ─────────────────────────────────────
  const puddleProps = useAnimatedProps(() => ({
    rx: interpolate(progressSV.value, [0, 1], [5,  122], Extrapolation.CLAMP),
    ry: interpolate(progressSV.value, [0, 1], [3,   18], Extrapolation.CLAMP),
    opacity: interpolate(progressSV.value, [0, 0.05, 0.92, 1], [0, 1, 0.85, 0.60], Extrapolation.CLAMP),
  }));

  // ── Melt bulge — bottom edge of cube deforms into dripping waves ─────────
  const meltBulgeD = useDerivedValue(() => {
    const p = progressSV.value;
    const b = 220; // cube bottom y
    // Three bumps grow independently with slightly offset start points
    const d1 = interpolate(p, [0.02, 1], [0, 22], Extrapolation.CLAMP);
    const d2 = interpolate(p, [0.08, 1], [0, 28], Extrapolation.CLAMP);
    const d3 = interpolate(p, [0.05, 1], [0, 20], Extrapolation.CLAMP);
    return (
      `M 62 ${b}` +
      ` C 78 ${b} 88 ${(b + d1 * 0.55).toFixed(1)} 100 ${(b + d1).toFixed(1)}` +
      ` C 111 ${(b + d1 * 1.18).toFixed(1)} 120 ${(b + d1).toFixed(1)} 132 ${b}` +
      ` C 143 ${b} 151 ${(b + d2 * 0.55).toFixed(1)} 162 ${(b + d2).toFixed(1)}` +
      ` C 173 ${(b + d2 * 1.18).toFixed(1)} 183 ${(b + d2).toFixed(1)} 194 ${b}` +
      ` C 204 ${b} 210 ${(b + d3 * 0.55).toFixed(1)} 218 ${(b + d3).toFixed(1)}` +
      ` C 226 ${(b + d3 * 1.18).toFixed(1)} 235 ${(b + d3).toFixed(1)} 246 ${b}` +
      ` C 252 ${b} 258 ${b} 258 ${b}` +
      ` L 258 ${b - 14} L 62 ${b - 14} Z`
    );
  });
  const meltBulgeProps = useAnimatedProps(() => ({ d: meltBulgeD.value }));

  // ── Fissure cracks (appear at 25 / 50 / 75% milestones) ─────────────────
  const fissure1Props = useAnimatedProps(() => ({
    strokeOpacity: interpolate(progressSV.value, [0.22, 0.30, 0.56, 0.66], [0, 0.88, 0.88, 0], Extrapolation.CLAMP),
  }));
  const fissure2Props = useAnimatedProps(() => ({
    strokeOpacity: interpolate(progressSV.value, [0.45, 0.53, 0.72, 0.82], [0, 0.78, 0.78, 0], Extrapolation.CLAMP),
  }));
  const fissure3Props = useAnimatedProps(() => ({
    strokeOpacity: interpolate(progressSV.value, [0.68, 0.76, 0.90, 1.00], [0, 0.70, 0.70, 0], Extrapolation.CLAMP),
  }));

  // ── Ice cube: corners round & cube fades as it dissolves ─────────────────
  const iceFrontProps = useAnimatedProps(() => ({
    rx: interpolate(progressSV.value, [0, 0.45, 0.82, 1], [12, 22, 40, 65], Extrapolation.CLAMP),
    opacity: interpolate(progressSV.value, [0, 0.72, 0.90, 1], [1, 0.91, 0.60, 0.0], Extrapolation.CLAMP),
  }));
  const iceSideProps = useAnimatedProps(() => ({
    opacity: interpolate(progressSV.value, [0, 0.78, 0.92, 1], [1, 0.86, 0.45, 0.0], Extrapolation.CLAMP),
  }));

  // ── Frost clouds inside ice (more visible as ice weakens) ────────────────
  const frostProps = useAnimatedProps(() => ({
    opacity: interpolate(progressSV.value, [0, 0.18, 0.72], [0.05, 0.30, 0.62], Extrapolation.CLAMP),
  }));

  // ── Puddle: outer diffuse glow ───────────────────────────────────────────
  const puddleOuterProps = useAnimatedProps(() => ({
    rx: interpolate(progressSV.value, [0, 1], [8, 152], Extrapolation.CLAMP),
    ry: interpolate(progressSV.value, [0, 1], [4, 22], Extrapolation.CLAMP),
    opacity: interpolate(progressSV.value, [0, 0.06, 0.88, 1], [0, 0.52, 0.40, 0.28], Extrapolation.CLAMP),
  }));

  // ── Puddle: inner deep reflection ────────────────────────────────────────
  const puddleInnerProps = useAnimatedProps(() => ({
    rx: interpolate(progressSV.value, [0.03, 1], [3, 72], Extrapolation.CLAMP),
    ry: interpolate(progressSV.value, [0.03, 1], [2, 9], Extrapolation.CLAMP),
    opacity: interpolate(progressSV.value, [0.03, 0.14, 0.86, 1], [0, 0.80, 0.70, 0.44], Extrapolation.CLAMP),
  }));

  // ── Caustic light spots in puddle ────────────────────────────────────────
  const caustic1Props = useAnimatedProps(() => ({
    rx: interpolate(progressSV.value, [0.10, 0.85], [0, 15], Extrapolation.CLAMP),
    ry: interpolate(progressSV.value, [0.10, 0.85], [0, 5], Extrapolation.CLAMP),
    opacity: interpolate(progressSV.value, [0.10, 0.22, 0.76, 0.90], [0, 0.55, 0.55, 0.0], Extrapolation.CLAMP),
  }));
  const caustic2Props = useAnimatedProps(() => ({
    rx: interpolate(progressSV.value, [0.28, 0.92], [0, 10], Extrapolation.CLAMP),
    ry: interpolate(progressSV.value, [0.28, 0.92], [0, 3], Extrapolation.CLAMP),
    opacity: interpolate(progressSV.value, [0.28, 0.40, 0.84, 0.97], [0, 0.45, 0.45, 0.0], Extrapolation.CLAMP),
  }));

  // ── Puddle ripple rings ───────────────────────────────────────────────────
  const ripple1Props = useAnimatedProps(() => ({
    rx: interpolate(progressSV.value, [0.10, 0.44], [5, 70], Extrapolation.CLAMP),
    ry: interpolate(progressSV.value, [0.10, 0.44], [2, 9], Extrapolation.CLAMP),
    strokeOpacity: interpolate(progressSV.value, [0.10, 0.26, 0.44], [0, 0.50, 0.0], Extrapolation.CLAMP),
  }));
  const ripple2Props = useAnimatedProps(() => ({
    rx: interpolate(progressSV.value, [0.40, 0.74], [5, 84], Extrapolation.CLAMP),
    ry: interpolate(progressSV.value, [0.40, 0.74], [2, 11], Extrapolation.CLAMP),
    strokeOpacity: interpolate(progressSV.value, [0.40, 0.57, 0.74], [0, 0.38, 0.0], Extrapolation.CLAMP),
  }));
  const ripple3Props = useAnimatedProps(() => ({
    rx: interpolate(progressSV.value, [0.65, 0.95], [5, 92], Extrapolation.CLAMP),
    ry: interpolate(progressSV.value, [0.65, 0.95], [2, 12], Extrapolation.CLAMP),
    strokeOpacity: interpolate(progressSV.value, [0.65, 0.80, 0.95], [0, 0.30, 0.0], Extrapolation.CLAMP),
  }));

  // ── Extra drip drops 4 & 5 (appear later in timer) ───────────────────────
  const drip4Props = useAnimatedProps(() => ({
    opacity: interpolate(progressSV.value, [0.40, 0.56], [0, 1], Extrapolation.CLAMP),
  }));
  const drip5Props = useAnimatedProps(() => ({
    opacity: interpolate(progressSV.value, [0.55, 0.70], [0, 1], Extrapolation.CLAMP),
  }));

  // ── Completion burst — three expanding celebration ripple rings ───────────
  const burst1Props = useAnimatedProps(() => ({
    rx: interpolate(burstSV.value, [0, 1], [14, 170], Extrapolation.CLAMP),
    ry: interpolate(burstSV.value, [0, 1], [4, 25], Extrapolation.CLAMP),
    strokeOpacity: interpolate(burstSV.value, [0, 0.22, 1], [0, 0.90, 0.0], Extrapolation.CLAMP),
  }));
  const burst2Props = useAnimatedProps(() => ({
    rx: interpolate(burstSV.value, [0.08, 1], [10, 145], Extrapolation.CLAMP),
    ry: interpolate(burstSV.value, [0.08, 1], [3, 21], Extrapolation.CLAMP),
    strokeOpacity: interpolate(burstSV.value, [0.08, 0.32, 1], [0, 0.70, 0.0], Extrapolation.CLAMP),
  }));
  const burst3Props = useAnimatedProps(() => ({
    rx: interpolate(burstSV.value, [0.18, 1], [8, 118], Extrapolation.CLAMP),
    ry: interpolate(burstSV.value, [0.18, 1], [2, 17], Extrapolation.CLAMP),
    strokeOpacity: interpolate(burstSV.value, [0.18, 0.42, 1], [0, 0.52, 0.0], Extrapolation.CLAMP),
  }));
  const burstFillProps = useAnimatedProps(() => ({
    rx: interpolate(burstSV.value, [0, 0.35], [0, 155], Extrapolation.CLAMP),
    ry: interpolate(burstSV.value, [0, 0.35], [0, 22], Extrapolation.CLAMP),
    opacity: interpolate(burstSV.value, [0, 0.12, 0.35, 1], [0, 0.30, 0.0, 0.0], Extrapolation.CLAMP),
  }));

  // ── Timer logic ──────────────────────────────────────────────────────────
  const clearTimer = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  const handlePhaseComplete = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // ── Fire completion burst ──────────────────────────────────────────────
    burstSV.value = 0;
    burstSV.value = withTiming(1, { duration: 2000 });
    setJustCompleted(true);
    setTimeout(() => setJustCompleted(false), 2600);
    const elapsed = activeDurations[phaseRef.current] - Math.max(0, timeLeft - 1);
    logPomodoroSession({ date: getTodayStr(), duration: elapsed, type: phaseRef.current === "work" ? "work" : "break", completedAt: Date.now() });
    if (phaseRef.current === "work") {
      setSessions(prev => {
        const next = prev + 1;
        setPhase("short_break");
        setTimeLeft(activeDurations.short_break);
        return next;
      });
    } else { setPhase("work"); setTimeLeft(activeDurations.work); }
  }, [timeLeft, logPomodoroSession, activeDurations]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => { if (prev <= 1) { handlePhaseComplete(); return 0; } return prev - 1; });
      }, 1000);
    } else { clearTimer(); }
    return clearTimer;
  }, [isRunning, handlePhaseComplete]);

  const togglePlay = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRunning(prev => !prev);
  };
  const reset = () => {
    clearTimer(); setIsRunning(false); setTimeLeft(activeDurations[phase]); milestoneFired.current.clear();
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const switchPhase = (p: "work" | "short_break") => {
    clearTimer(); setIsRunning(false); setPhase(p); setTimeLeft(activeDurations[p]); milestoneFired.current.clear();
  };
  const applyPreset = (preset: "work" | "custom") => {
    if (preset === "work") {
      setCustomWorkMin(25);
      setCustomBreakMin(5);
      setSelectedPreset("work");
      clearTimer();
      setIsRunning(false);
      setTimeLeft(DURATIONS[phase]);
      return;
    }
    clearTimer();
    setIsRunning(false);
    setSelectedPreset("custom");
  };
  const applyCustomDurations = () => {
    setSelectedPreset("custom");
    clearTimer();
    setIsRunning(false);
    setTimeLeft(phase === "work" ? Math.max(60, customWorkMin * 60) : Math.max(60, customBreakMin * 60));
    setCustomModalVisible(false);
  };

  const todayMinutes  = pomodoroSessions.filter(s => s.date === getTodayStr() && s.type === "work").reduce((a,s) => a + Math.floor(s.duration/60), 0);
  const todaySessions = pomodoroSessions.filter(s => s.date === getTodayStr() && s.type === "work").length;
  const phaseColor    = phase === "work" ? colors.primary : phase === "short_break" ? colors.accent : colors.info;

  const [analyticsView, setAnalyticsView] = useState<"7d" | "30d" | "heat">("7d");
  const chartW = SCREEN_W - 80;

  const heatData = useMemo<Record<string, number>>(() => {
    const result: Record<string, number> = {};
    pomodoroSessions.filter(s => s.type === "work").forEach(s => {
      result[s.date] = (result[s.date] ?? 0) + Math.floor(s.duration / 60);
    });
    return result;
  }, [pomodoroSessions]);

  const { daysBars, maxMinutes } = useMemo(() => {
    const n = analyticsView === "heat" ? 0 : analyticsView === "7d" ? 7 : 30;
    if (n === 0) return { daysBars: [], maxMinutes: 1 };
    const today = new Date();
    const todayS = getTodayStr();
    const bars = Array.from({ length: n }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (n - 1 - i));
      const ds = d.toISOString().split("T")[0];
      const workSessions = pomodoroSessions.filter(s => s.date === ds && s.type === "work");
      return {
        date: ds,
        label: d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2),
        minutes: workSessions.reduce((a, s) => a + Math.floor(s.duration / 60), 0),
        sessions: workSessions.length,
        isToday: ds === todayS,
      };
    });
    return { daysBars: bars, maxMinutes: Math.max(...bars.map(d => d.minutes), 1) };
  }, [pomodoroSessions, analyticsView]);
  const puddleColor   = phase === "work" ? "#00CCEE" : phase === "short_break" ? "#A855F7" : "#3B82F6";
  const ledColor      = phase === "work" ? "#00E8FF" : phase === "short_break" ? "#D8A0FF" : "#88B8FF";
  const topPadding    = Platform.OS === "web" ? Math.max(insets.top, 67) + 16 : insets.top + 16;

  // Pixel position of LCD display center within the scene view
  const lcdCenterTop  = (136 / VB_H) * SCENE_H; // y=102+34=136 in viewbox

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPadding, paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Deep Focus</Text>
        <View style={styles.sessionsChip}>
          <Feather name="target" size={14} color={phaseColor} />
          <Text style={[styles.sessionsText, { color: phaseColor }]}>{sessions}</Text>
        </View>
      </View>

      <View style={[styles.modeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => switchPhase("work")}
          style={[styles.modeBtn, { backgroundColor: phase === "work" ? phaseColor + "22" : colors.secondary, borderColor: phase === "work" ? phaseColor : colors.border }]}
        >
          <Text style={[styles.modeText, { color: phase === "work" ? phaseColor : colors.mutedForeground }]}>Work</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => switchPhase("short_break")}
          style={[styles.modeBtn, { backgroundColor: phase === "short_break" ? phaseColor + "22" : colors.secondary, borderColor: phase === "short_break" ? phaseColor : colors.border }]}
        >
          <Text style={[styles.modeText, { color: phase === "short_break" ? phaseColor : colors.mutedForeground }]}>Break</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setCustomModalVisible(true)}
          style={[styles.modeBtn, { backgroundColor: selectedPreset === "custom" ? phaseColor + "22" : colors.secondary, borderColor: selectedPreset === "custom" ? phaseColor : colors.border }]}
        >
          <Text style={[styles.modeText, { color: selectedPreset === "custom" ? phaseColor : colors.mutedForeground }]}>Custom</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={customModalVisible} transparent animationType="fade" onRequestClose={() => setCustomModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Custom timer</Text>
            <View style={styles.modalGrid}>
              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Work</Text>
                <TextInput
                  value={String(customWorkMin)}
                  onChangeText={(v) => setCustomWorkMin(Math.max(1, parseInt(v || "0") || 1))}
                  keyboardType="number-pad"
                  style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                />
              </View>
              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Break</Text>
                <TextInput
                  value={String(customBreakMin)}
                  onChangeText={(v) => setCustomBreakMin(Math.max(1, parseInt(v || "0") || 1))}
                  keyboardType="number-pad"
                  style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                />
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setCustomModalVisible(false)} style={[styles.modalBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={[styles.modalBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={applyCustomDurations} style={[styles.modalBtn, { backgroundColor: phaseColor, borderColor: phaseColor }]}>
                <Text style={[styles.modalBtnText, { color: colors.background }]}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════
          ICE CUBE SCENE
      ═══════════════════════════════════════════════ */}
      <View style={[styles.cubeScene, { width: SCENE_W, height: SCENE_H }]}>

        {/* Ambient glow beneath cube */}
        <View
          style={[styles.ambientGlow, { backgroundColor: phaseColor + "20" }]}
          pointerEvents="none"
        />

        <Svg viewBox={`0 0 ${VB_W} ${VB_H}`} width={SCENE_W} height={SCENE_H}>
          <Defs>
            {/* ── Ice face gradients ── */}
            <SvgGrad id="iceFront" x1="0.12" y1="0" x2="0.88" y2="1">
              <Stop offset="0"    stopColor="#C8EEFF" stopOpacity="0.96" />
              <Stop offset="0.28" stopColor="#96CCED" stopOpacity="0.93" />
              <Stop offset="0.60" stopColor="#60A8D8" stopOpacity="0.90" />
              <Stop offset="1"    stopColor="#3880BC" stopOpacity="0.87" />
            </SvgGrad>
            <SvgGrad id="iceTop" x1="0.3" y1="0" x2="0.7" y2="1">
              <Stop offset="0"   stopColor="#F0FDFF" stopOpacity="0.99" />
              <Stop offset="0.4" stopColor="#D4F0FF" stopOpacity="0.95" />
              <Stop offset="1"   stopColor="#9ACFEE" stopOpacity="0.90" />
            </SvgGrad>
            <SvgGrad id="iceRight" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0"   stopColor="#5EA8C8" stopOpacity="0.92" />
              <Stop offset="0.5" stopColor="#4488B4" stopOpacity="0.89" />
              <Stop offset="1"   stopColor="#2A68A0" stopOpacity="0.86" />
            </SvgGrad>

            {/* ── Subsurface scattering — milky interior glow ── */}
            <SvgRadialGrad id="subsurface" cx="48%" cy="44%" r="46%" gradientUnits="objectBoundingBox">
              <Stop offset="0"   stopColor="#ECFAFF" stopOpacity="0.60" />
              <Stop offset="0.5" stopColor="#C4E8FF" stopOpacity="0.25" />
              <Stop offset="1"   stopColor="#90CAEF" stopOpacity="0.00" />
            </SvgRadialGrad>

            {/* ── Specular highlight — radial for realism ── */}
            <SvgRadialGrad id="gloss" cx="28%" cy="22%" r="52%" gradientUnits="objectBoundingBox">
              <Stop offset="0"   stopColor="#FFFFFF" stopOpacity="0.85" />
              <Stop offset="0.35" stopColor="#FFFFFF" stopOpacity="0.48" />
              <Stop offset="0.65" stopColor="#FFFFFF" stopOpacity="0.15" />
              <Stop offset="1"   stopColor="#FFFFFF" stopOpacity="0.00" />
            </SvgRadialGrad>

            {/* ── Frost cloud patches — air bubbles trapped in ice ── */}
            <SvgRadialGrad id="frost" cx="50%" cy="50%" r="50%" gradientUnits="objectBoundingBox">
              <Stop offset="0"   stopColor="#FFFFFF" stopOpacity="0.75" />
              <Stop offset="0.6" stopColor="#E0F8FF" stopOpacity="0.30" />
              <Stop offset="1"   stopColor="#C0E8FF" stopOpacity="0.00" />
            </SvgRadialGrad>

            {/* ── LCD backdrop ── */}
            <SvgGrad id="lcdBg" x1="0.5" y1="0" x2="0.5" y2="1">
              <Stop offset="0"   stopColor="#000C18" stopOpacity="0.90" />
              <Stop offset="1"   stopColor="#001C38" stopOpacity="0.82" />
            </SvgGrad>

            {/* ── Puddle layers ── */}
            <SvgRadialGrad id="puddleOuter" cx="50%" cy="38%" r="50%" gradientUnits="objectBoundingBox">
              <Stop offset="0"   stopColor={puddleColor} stopOpacity="0.58" />
              <Stop offset="0.55" stopColor="#44AACC"    stopOpacity="0.28" />
              <Stop offset="1"   stopColor="#22A0C8"     stopOpacity="0.04" />
            </SvgRadialGrad>
            <SvgRadialGrad id="puddleMid" cx="45%" cy="32%" r="48%" gradientUnits="objectBoundingBox">
              <Stop offset="0"   stopColor="#B0E4FF" stopOpacity="0.78" />
              <Stop offset="0.5" stopColor="#70C0E8" stopOpacity="0.48" />
              <Stop offset="1"   stopColor="#40A0D8" stopOpacity="0.10" />
            </SvgRadialGrad>

            {/* ── Photorealistic droplet — dark top, bright center, lit bottom ── */}
            <SvgRadialGrad id="dropGrad" cx="35%" cy="28%" r="68%" gradientUnits="objectBoundingBox">
              <Stop offset="0"    stopColor="#FFFFFF"  stopOpacity="0.88" />
              <Stop offset="0.28" stopColor="#C8EEFF"  stopOpacity="0.72" />
              <Stop offset="0.60" stopColor="#64B4DC"  stopOpacity="0.82" />
              <Stop offset="0.85" stopColor="#2880B8"  stopOpacity="0.90" />
              <Stop offset="1"    stopColor="#1060A0"  stopOpacity="0.88" />
            </SvgRadialGrad>
            <SvgGrad id="dropShadow" x1="0.5" y1="0" x2="0.5" y2="1">
              <Stop offset="0"   stopColor="#0A3860" stopOpacity="0.45" />
              <Stop offset="0.5" stopColor="#0A3860" stopOpacity="0.10" />
              <Stop offset="1"   stopColor="#0A3860" stopOpacity="0.00" />
            </SvgGrad>

            {/* ── Clips ── */}
            <ClipPath id="frontClip">
              <Rect x={62} y={72} width={196} height={148} rx={12} />
            </ClipPath>
            <ClipPath id="topClip">
              <Path d="M 62 72 L 258 72 L 278 50 L 82 50 Z" />
            </ClipPath>
          </Defs>

          {/* ════ PUDDLE SYSTEM ════ */}

          {/* Outermost soft glow */}
          <AnimEllipse cx={160} cy={257} animatedProps={puddleOuterProps} fill="url(#puddleOuter)" />

          {/* Main puddle body */}
          <AnimEllipse cx={160} cy={256} animatedProps={puddleProps} fill="url(#puddleOuter)" />

          {/* Inner deep reflection */}
          <AnimEllipse cx={156} cy={254} animatedProps={puddleInnerProps} fill="url(#puddleMid)" />

          {/* Caustic light spots — bright patches from ice lens effect */}
          <AnimEllipse cx={144} cy={252} animatedProps={caustic1Props} fill="rgba(210,246,255,0.60)" />
          <AnimEllipse cx={175} cy={258} animatedProps={caustic2Props} fill="rgba(190,238,255,0.48)" />

          {/* Ripple rings — expand outward as drops fall */}
          <AnimEllipse cx={160} cy={256} animatedProps={ripple1Props}
            fill="none" stroke="rgba(120,200,235,0.55)" strokeWidth="1.2" />
          <AnimEllipse cx={160} cy={256} animatedProps={ripple2Props}
            fill="none" stroke="rgba(100,185,225,0.38)" strokeWidth="0.9" />
          <AnimEllipse cx={160} cy={256} animatedProps={ripple3Props}
            fill="none" stroke="rgba(80,170,215,0.25)" strokeWidth="0.7" />

          {/* ════ COMPLETION BURST — celebration ripple rings ════ */}
          {/* Flash fill — brief flash of bright water */}
          <AnimEllipse cx={160} cy={257} animatedProps={burstFillProps}
            fill="rgba(180,240,255,0.80)" />
          {/* Ring 1 — fastest, most opaque */}
          <AnimEllipse cx={160} cy={257} animatedProps={burst1Props}
            fill="none" stroke="rgba(80,210,255,0.90)" strokeWidth="2.0" />
          {/* Ring 2 — slightly delayed */}
          <AnimEllipse cx={160} cy={257} animatedProps={burst2Props}
            fill="none" stroke="rgba(60,195,245,0.72)" strokeWidth="1.5" />
          {/* Ring 3 — outermost, faintest */}
          <AnimEllipse cx={160} cy={257} animatedProps={burst3Props}
            fill="none" stroke="rgba(40,180,235,0.52)" strokeWidth="1.0" />

          {/* ════ ICE CUBE FACES ════ */}

          {/* Right face — shadow side */}
          <AnimPath
            d="M 258 72 L 278 50 L 278 198 L 258 220 Z"
            fill="url(#iceRight)"
            stroke="rgba(30,90,160,0.32)"
            strokeWidth="1"
            animatedProps={iceSideProps}
          />

          {/* Top face — highly reflective, catches cool overhead light */}
          <AnimPath
            d="M 62 72 L 258 72 L 278 50 L 82 50 Z"
            fill="url(#iceTop)"
            stroke="rgba(210,240,255,0.52)"
            strokeWidth="1"
            animatedProps={iceSideProps}
          />
          {/* Top face specular sheen */}
          <Path
            d="M 90 68 Q 170 56 268 62"
            stroke="rgba(255,255,255,0.70)"
            strokeWidth="2.5"
            fill="none"
            clipPath="url(#topClip)"
          />

          {/* Front face body — progressively rounds as it melts */}
          <AnimRect
            x={62} y={72} width={196} height={148}
            fill="url(#iceFront)"
            stroke="rgba(110,185,235,0.42)"
            strokeWidth="1.5"
            animatedProps={iceFrontProps}
          />

          {/* Subsurface scattering — milky cloud glow through ice body */}
          <Rect
            x={62} y={72} width={196} height={148} rx={12}
            fill="url(#subsurface)"
            clipPath="url(#frontClip)"
          />

          {/* ════ MELT BULGE — wavy dripping bottom ════ */}
          <AnimPath
            animatedProps={meltBulgeProps}
            fill="rgba(100,185,228,0.90)"
            stroke="rgba(75,155,205,0.38)"
            strokeWidth="1"
          />

          {/* ════ ICE TEXTURE LAYERS ════ */}

          {/* Refraction lines — light bending through crystal planes */}
          <Path
            d="M 90 76 L 64 102 M 132 72 L 64 140 M 180 72 L 64 188 M 232 72 L 90 214 M 258 94 L 144 220 M 258 146 L 192 220"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1"
            fill="none"
            clipPath="url(#frontClip)"
          />

          {/* Secondary refraction layer — adds depth */}
          <Path
            d="M 80 72 L 200 220 M 110 72 L 258 176 M 62 100 L 200 200"
            stroke="rgba(180,230,255,0.09)"
            strokeWidth="1.5"
            fill="none"
            clipPath="url(#frontClip)"
          />

          {/* Frost cloud patches — trapped air bubbles, intensify during melt */}
          <AnimEllipse cx={122} cy={126} rx={30} ry={19} fill="url(#frost)" animatedProps={frostProps} clipPath="url(#frontClip)" />
          <AnimEllipse cx={212} cy={158} rx={22} ry={14} fill="url(#frost)" animatedProps={frostProps} clipPath="url(#frontClip)" />
          <AnimEllipse cx={85}  cy={168} rx={17} ry={11} fill="url(#frost)" animatedProps={frostProps} clipPath="url(#frontClip)" />
          <AnimEllipse cx={175} cy={100} rx={14} ry={9}  fill="url(#frost)" animatedProps={frostProps} clipPath="url(#frontClip)" />

          {/* Water run streaks on face */}
          <Path
            d="M 112 72 Q 110 135 108 180 M 222 72 Q 224 130 226 175"
            stroke="rgba(145,215,248,0.32)"
            strokeWidth="1.5"
            fill="none"
            clipPath="url(#frontClip)"
          />

          {/* ════ LCD DISPLAY ════ */}
          <Rect x={84} y={102} width={152} height={68} rx={8} fill="url(#lcdBg)" stroke="rgba(0,165,228,0.38)" strokeWidth="1" />
          {/* LCD bezel inner glow */}
          <Rect x={87} y={105} width={146} height={62} rx={6} fill="none" stroke="rgba(0,225,255,0.22)" strokeWidth="1" />
          {/* Scan-line texture */}
          <Path d="M 87 113 L 233 113 M 87 121 L 233 121 M 87 129 L 233 129 M 87 137 L 233 137 M 87 145 L 233 145 M 87 153 L 233 153 M 87 161 L 233 161"
            stroke="rgba(0,40,80,0.20)" strokeWidth="0.5" fill="none" clipPath="url(#frontClip)" />

          {/* ════ SPECULAR HIGHLIGHTS ════ */}

          {/* Large top-left gloss patch — main specular */}
          <Ellipse cx={112} cy={106} rx={44} ry={29} fill="url(#gloss)" clipPath="url(#frontClip)" />

          {/* Top edge bright streak */}
          <Path d="M 74 76 Q 160 69 252 76" stroke="rgba(255,255,255,0.68)" strokeWidth="2.5" fill="none" clipPath="url(#frontClip)" />

          {/* Left rim lighting — bounce light from puddle below */}
          <Path d="M 66 86 Q 62 152 68 218" stroke="rgba(255,255,255,0.48)" strokeWidth="2.2" fill="none" clipPath="url(#frontClip)" />

          {/* Right rim — slight cool reflection */}
          <Path d="M 255 82 Q 258 152 253 218" stroke="rgba(200,238,255,0.22)" strokeWidth="1.5" fill="none" clipPath="url(#frontClip)" />

          {/* Small bright bottom rim — upward reflected light from puddle */}
          <Path d="M 70 218 Q 160 225 250 218" stroke="rgba(160,220,255,0.30)" strokeWidth="1" fill="none" clipPath="url(#frontClip)" />

          {/* ════ FISSURE CRACKS ════ */}
          {/* Crack 1 — 25% milestone */}
          <AnimPath
            d="M 108 120 L 118 136 M 118 136 L 107 152 M 118 136 L 134 148 M 134 148 L 140 158"
            stroke="rgba(255,255,255,0.94)" strokeWidth="1.4" fill="none" strokeLinecap="round"
            animatedProps={fissure1Props}
          />
          {/* Crack 2 — 50% milestone */}
          <AnimPath
            d="M 200 106 L 212 126 M 212 126 L 200 142 M 212 126 L 228 136 M 200 142 L 196 156"
            stroke="rgba(255,255,255,0.84)" strokeWidth="1.4" fill="none" strokeLinecap="round"
            animatedProps={fissure2Props}
          />
          {/* Crack 3 — 75% milestone */}
          <AnimPath
            d="M 80 160 L 94 180 M 94 180 L 82 194 M 94 180 L 110 186 M 82 194 L 78 204"
            stroke="rgba(255,255,255,0.74)" strokeWidth="1.1" fill="none" strokeLinecap="round"
            animatedProps={fissure3Props}
          />

          {/* ════ PHOTOREALISTIC DRIP SYSTEM ════ */}

          {/* Drip 1 — left, large (first to appear) */}
          <AnimG animatedProps={drip1Props}>
            <Path d="M 112 220 C 106 235 102 250 112 265 C 122 250 118 235 112 220 Z" fill="url(#dropGrad)" />
            <Path d="M 112 220 C 108 228 106 234 112 238 C 118 234 116 228 112 220 Z" fill="url(#dropShadow)" />
            <Ellipse cx={108} cy={232} rx={3.5} ry={5.5} fill="rgba(255,255,255,0.78)" />
            <Circle  cx={113} cy={258} r={1.8} fill="rgba(200,240,255,0.70)" />
          </AnimG>

          {/* Drip 2 — center-left, tallest (second) */}
          <AnimG animatedProps={drip2Props}>
            <Path d="M 155 220 C 149 237 145 254 155 272 C 165 254 161 237 155 220 Z" fill="url(#dropGrad)" />
            <Path d="M 155 220 C 151 229 149 235 155 240 C 161 235 159 229 155 220 Z" fill="url(#dropShadow)" />
            <Ellipse cx={151} cy={234} rx={3.5} ry={5.5} fill="rgba(255,255,255,0.76)" />
            <Circle  cx={156} cy={265} r={1.8} fill="rgba(200,240,255,0.68)" />
          </AnimG>

          {/* Drip 3 — center-right (third) */}
          <AnimG animatedProps={drip3Props}>
            <Path d="M 202 220 C 196 233 193 246 202 259 C 211 246 208 233 202 220 Z" fill="url(#dropGrad)" />
            <Path d="M 202 220 C 198 228 196 234 202 238 C 208 234 206 228 202 220 Z" fill="url(#dropShadow)" />
            <Ellipse cx={198} cy={232} rx={3} ry={4.8} fill="rgba(255,255,255,0.74)" />
            <Circle  cx={203} cy={252} r={1.5} fill="rgba(200,240,255,0.65)" />
          </AnimG>

          {/* Drip 4 — far right (fourth, smaller) */}
          <AnimG animatedProps={drip4Props}>
            <Path d="M 238 220 C 233 231 230 242 238 253 C 246 242 243 231 238 220 Z" fill="url(#dropGrad)" />
            <Path d="M 238 220 C 234 227 232 232 238 236 C 244 232 242 227 238 220 Z" fill="url(#dropShadow)" />
            <Ellipse cx={234} cy={230} rx={2.8} ry={4.5} fill="rgba(255,255,255,0.72)" />
          </AnimG>

          {/* Drip 5 — far left (fifth, smallest) */}
          <AnimG animatedProps={drip5Props}>
            <Path d="M 82 220 C 77 230 74 240 82 250 C 90 240 87 230 82 220 Z" fill="url(#dropGrad)" />
            <Path d="M 82 220 C 78 227 76 232 82 235 C 88 232 86 227 82 220 Z" fill="url(#dropShadow)" />
            <Ellipse cx={78} cy={229} rx={2.5} ry={4} fill="rgba(255,255,255,0.70)" />
          </AnimG>
        </Svg>

        {/* ── LED Timer Display — positioned over LCD backdrop ─────────── */}
        <View
          style={{
            position: "absolute",
            top: lcdCenterTop - 36,
            left: 0, right: 0,
            alignItems: "center",
          }}
          pointerEvents="none"
        >
          <Text
            style={[
              styles.timerText,
              {
                color: justCompleted ? "#00FFAA" : ledColor,
                textShadowColor: justCompleted ? "#00FFAA" : ledColor,
                textShadowRadius: justCompleted ? 24 : 14,
                textShadowOffset: { width: 0, height: 0 },
              },
            ]}
          >
            {justCompleted ? "00:00" : fmt(timeLeft)}
          </Text>
          <Text style={[styles.timerSub, { color: justCompleted ? "#00FFAACC" : ledColor + "99" }]}>
            {justCompleted ? "session complete!" : isRunning ? "melting…" : timeLeft === totalDuration ? "peak condition" : "paused"}
          </Text>
        </View>
      </View>

      {/* Session progress dots */}
      <View style={styles.sessionDots}>
        {Array.from({ length: 4 }).map((_,i) => (
          <View key={i} style={[styles.sessionDot, { backgroundColor: i < sessions % 4 ? phaseColor : colors.border }]} />
        ))}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          onPress={reset}
          style={[styles.ctrlBtn, { backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1 }]}
        >
          <Feather name="rotate-ccw" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        {/* Play/Pause — morphs into glowing ✓ on session complete */}
        <View style={styles.playBtnWrapper}>
          {justCompleted && (
            <View
              style={[
                styles.completionRing,
                { borderColor: "#00FFAA", shadowColor: "#00FFAA" },
              ]}
            />
          )}
          <TouchableOpacity
            onPress={justCompleted ? undefined : togglePlay}
            activeOpacity={justCompleted ? 1 : 0.8}
            style={[
              styles.playBtn,
              {
                backgroundColor: justCompleted ? "#00BB77" : phaseColor,
                shadowColor: justCompleted ? "#00FFAA" : phaseColor,
                shadowOpacity: justCompleted ? 0.9 : 0.45,
                shadowRadius: justCompleted ? 22 : 10,
                shadowOffset: { width: 0, height: 0 },
              },
            ]}
          >
            <Feather
              name={justCompleted ? "check" : isRunning ? "pause" : "play"}
              size={28}
              color={colors.background}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => switchPhase(phase === "work" ? "short_break" : "work")}
          style={[styles.ctrlBtn, { backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1 }]}
        >
          <Feather name="skip-forward" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="clock" size={18} color={phaseColor} />
          <Text style={[styles.statVal, { color: colors.foreground }]}>{todayMinutes}</Text>
          <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>Min today</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="target" size={18} color={colors.accent} />
          <Text style={[styles.statVal, { color: colors.foreground }]}>{todaySessions}</Text>
          <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>Sessions</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="zap" size={18} color={colors.warning} />
          <Text style={[styles.statVal, { color: colors.foreground }]}>{sessions}</Text>
          <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>Total today</Text>
        </View>
      </View>

      {/* Sound card */}
      <View style={[styles.soundCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.soundHeader}>
          <Feather name="headphones" size={16} color={selectedSound !== "silence" && isRunning ? phaseColor : colors.primary} />
          <Text style={[styles.soundTitle, { color: colors.foreground }]}>Focus Soundscape</Text>
          {selectedSound !== "silence" && isRunning && (
            <View style={[styles.liveChip, { backgroundColor: phaseColor + "22", borderColor: phaseColor }]}>
              <View style={[styles.liveDot, { backgroundColor: phaseColor }]} />
              <Text style={[styles.liveText, { color: phaseColor }]}>live</Text>
            </View>
          )}
        </View>

        {/* Sound selector grid */}
        <View style={styles.soundGrid}>
          {SOUNDS.map(s => {
            const active = selectedSound === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => {
                  setSelectedSound(s.id);
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.soundBtn,
                  {
                    backgroundColor: active ? phaseColor + "22" : colors.secondary,
                    borderColor: active ? phaseColor : colors.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <Feather name={s.icon as any} size={15} color={active ? phaseColor : colors.mutedForeground} />
                <Text style={[styles.soundLabel, { color: active ? phaseColor : colors.mutedForeground }]}>{s.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Volume control — only when a non-silence sound is selected */}
        {selectedSound !== "silence" && (
          <View style={styles.volumeRow}>
            <Feather name="volume" size={14} color={colors.mutedForeground} />
            <View style={styles.volumeTrack}>
              {[0.15, 0.30, 0.45, 0.60, 0.75, 0.90].map((v, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setVolume(v)}
                  style={[
                    styles.volumeSeg,
                    {
                      backgroundColor: volume >= v ? phaseColor : colors.border,
                      height: 6 + i * 2,
                    },
                  ]}
                />
              ))}
            </View>
            <Feather name="volume-2" size={14} color={colors.mutedForeground} />
            <Text style={[styles.volumePct, { color: colors.mutedForeground }]}>
              {Math.round(volume * 100)}%
            </Text>
          </View>
        )}

        {selectedSound === "silence" && (
          <Text style={[styles.soundHint, { color: colors.mutedForeground }]}>
            Select a soundscape to play while you focus
          </Text>
        )}
      </View>

      {/* Focus Analytics */}
      <View style={[styles.analyticsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Header + tab switcher */}
        <View style={styles.analyticsHeader}>
          <Text style={[styles.analyticsTitle, { color: colors.foreground }]}>Focus Analytics</Text>
          <View style={styles.analyticsTabs}>
            {(["7d", "30d", "heat"] as const).map((v) => {
              const active = analyticsView === v;
              return (
                <TouchableOpacity
                  key={v}
                  onPress={() => {
                    setAnalyticsView(v);
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.analyticsTab,
                    {
                      backgroundColor: active ? phaseColor + "22" : colors.secondary,
                      borderColor: active ? phaseColor : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.analyticsTabText, { color: active ? phaseColor : colors.mutedForeground }]}>
                    {v === "heat" ? "1Y" : v.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 7-day bar chart */}
        {analyticsView === "7d" && (
          <View style={{ gap: 8 }}>
            <View style={styles.barChart7}>
              {daysBars.map((day, i) => {
                const barH = Math.max(4, (day.minutes / maxMinutes) * 76);
                const bc   = day.isToday ? phaseColor : day.minutes > 0 ? phaseColor + "99" : colors.border;
                return (
                  <View key={i} style={styles.barCol7}>
                    {day.minutes > 0 && (
                      <Text style={[styles.barVal7, { color: day.isToday ? phaseColor : colors.mutedForeground }]}>
                        {day.minutes}m
                      </Text>
                    )}
                    <View style={{ flex: 1, justifyContent: "flex-end" }}>
                      <View style={[styles.barFill7, { height: barH, backgroundColor: bc }]} />
                    </View>
                    <Text style={[styles.barLabel7, { color: day.isToday ? phaseColor : colors.mutedForeground, fontFamily: day.isToday ? "Inter_700Bold" : "Inter_400Regular" }]}>
                      {day.label}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View style={styles.analyticsFooter}>
              <Text style={[styles.analyticsStat, { color: colors.mutedForeground }]}>
                {daysBars.reduce((a, d) => a + d.minutes, 0)} min total
              </Text>
              <Text style={[styles.analyticsStat, { color: colors.mutedForeground }]}>
                {daysBars.reduce((a, d) => a + d.sessions, 0)} sessions
              </Text>
            </View>
          </View>
        )}

        {/* 30-day SVG bar chart */}
        {analyticsView === "30d" && (
          <View style={{ gap: 8 }}>
            <Svg width={chartW} height={80}>
              {daysBars.map((day, i) => {
                const bw   = (chartW - 30) / 30;
                const barH = Math.max(2, (day.minutes / maxMinutes) * 66);
                const bc   = day.isToday ? phaseColor : day.minutes > 0 ? phaseColor + "AA" : phaseColor + "22";
                return (
                  <Rect
                    key={i}
                    x={i * (bw + 1)}
                    y={66 - barH}
                    width={bw}
                    height={barH}
                    rx={2}
                    fill={bc}
                  />
                );
              })}
            </Svg>
            <View style={styles.analyticsFooter}>
              <Text style={[styles.analyticsStat, { color: colors.mutedForeground }]}>
                {daysBars.reduce((a, d) => a + d.minutes, 0)} min total
              </Text>
              <Text style={[styles.analyticsStat, { color: colors.mutedForeground }]}>
                Avg {Math.round(daysBars.reduce((a, d) => a + d.minutes, 0) / 30)} min/day
              </Text>
              <Text style={[styles.analyticsStat, { color: colors.mutedForeground }]}>
                Best {Math.max(...daysBars.map(d => d.minutes), 0)} min
              </Text>
            </View>
          </View>
        )}

        {/* 1-year heatmap */}
        {analyticsView === "heat" && (
          <NumericHeatmapChart
            data={heatData}
            maxVal={Math.max(60, ...Object.values(heatData), 1)}
            color={phaseColor}
            weeks={52}
            label="min"
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 18, alignItems: "center" },

  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%" },
  backBtn: { padding: 4 },
  pageTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sessionsChip: { flexDirection: "row", alignItems: "center", gap: 5 },
  sessionsText: { fontSize: 15, fontFamily: "Inter_700Bold" },

  phaseSelector: { flexDirection: "row", gap: 8, width: "100%" },
  phaseBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  phaseBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  modeRow: { flexDirection: "row", flexWrap: "nowrap", width: "100%", gap: 4 },
  modeBtn: { flexGrow: 1, flexBasis: 0, minWidth: 0, borderRadius: 12, paddingVertical: 8, alignItems: "center", borderWidth: 1 },
  modeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 20 },
  modalCard: { width: "100%", maxWidth: 360, borderRadius: 18, padding: 16, borderWidth: 1, gap: 14 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  modalGrid: { flexDirection: "row", gap: 10 },
  modalField: { flex: 1, gap: 6 },
  modalLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  modalInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, textAlign: "center" },
  modalActions: { flexDirection: "row", gap: 10 },
  modalBtn: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center", borderWidth: 1 },
  modalBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },

  cubeScene: { position: "relative", alignItems: "center", justifyContent: "center" },
  ambientGlow: {
    position: "absolute",
    width: "78%",
    height: "40%",
    borderRadius: 180,
    bottom: 0,
    alignSelf: "center",
    opacity: 0.45,
  },
  timerText: { fontSize: 44, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  timerSub: { fontSize: 10, fontFamily: "Inter_400Regular", letterSpacing: 1.6, marginTop: 1 },

  sessionDots: { flexDirection: "row", gap: 8 },
  sessionDot: { width: 8, height: 8, borderRadius: 4 },

  controls: { flexDirection: "row", alignItems: "center", gap: 20 },
  ctrlBtn: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  playBtnWrapper: { position: "relative", alignItems: "center", justifyContent: "center" },
  completionRing: {
    position: "absolute", width: 92, height: 92, borderRadius: 46,
    borderWidth: 2, shadowOpacity: 1, shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  playBtn: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },

  statsRow: { flexDirection: "row", gap: 12, width: "100%" },
  statBox: { flex: 1, borderRadius: 14, padding: 14, alignItems: "center", gap: 4, borderWidth: 1 },
  statVal: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLbl: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },

  soundCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12, width: "100%" },
  soundHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  soundTitle: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  soundGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  soundBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  soundLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  soundHint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 4 },

  liveChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },

  volumeRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  volumeTrack: { flex: 1, flexDirection: "row", alignItems: "flex-end", gap: 4, height: 24 },
  volumeSeg: { flex: 1, borderRadius: 3 },
  volumePct: { fontSize: 11, fontFamily: "Inter_500Medium", width: 34, textAlign: "right" },

  analyticsCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12, width: "100%" },
  analyticsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  analyticsTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  analyticsTabs: { flexDirection: "row", gap: 4 },
  analyticsTab: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  analyticsTabText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  barChart7: { flexDirection: "row", alignItems: "flex-end", height: 100, gap: 4 },
  barCol7: { flex: 1, alignItems: "center", gap: 3, height: 100 },
  barVal7: { fontSize: 9, fontFamily: "Inter_500Medium", textAlign: "center" },
  barFill7: { width: "72%", borderRadius: 4 },
  barLabel7: { fontSize: 10, textAlign: "center" },
  analyticsFooter: { flexDirection: "row", justifyContent: "space-between", gap: 4 },
  analyticsStat: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
