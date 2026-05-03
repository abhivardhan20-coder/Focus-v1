import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { initializeNotifications } from "@/lib/notifications";
import { getBadge, type Badge } from "@/constants/badges";

export type HabitType = "binary" | "quantitative" | "timed";
export type HabitCategory =
  | "physical"
  | "mental"
  | "academics"
  | "creativity"
  | "chores";
export type HabitFrequency = "daily" | "weekdays" | "weekends" | "custom";
export type HabitDifficulty = "easy" | "medium" | "hard";

export const PILLAR_LABELS: Record<HabitCategory, string> = {
  physical: "Physical Health",
  mental: "Mental Health",
  academics: "Academics",
  creativity: "Creativity",
  chores: "Chores",
};

export const PILLAR_COLORS: Record<HabitCategory, string> = {
  physical: "#13EC5B",
  mental: "#A855F7",
  academics: "#3B82F6",
  creativity: "#F97316",
  chores: "#06B6D4",
};

export interface HabitCompletion {
  date: string;
  completed: boolean;
  value?: number;
  duration?: number;
  note?: string;
  timestamp?: number;
  skipReason?: string;
  isMicro?: boolean;
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  type: HabitType;
  category: HabitCategory;
  icon: string;
  color: string;
  frequency: HabitFrequency;
  customDays?: number[];
  targetValue?: number;
  targetUnit?: string;
  targetDuration?: number;
  timeWindow?: { start: string; end: string };
  difficulty: HabitDifficulty;
  priority: "low" | "medium" | "high";
  reminderTime?: string;
  notificationRecurrence?: "once" | "twice" | "custom";
  customNotifIntervalHours?: number;
  customNotifIntervalMinutes?: number;
  startDate?: string;
  endDate?: string;
  createdAt: number;
  archived: boolean;
  important?: boolean;
  comebackUntil?: string;
  prevStreak?: number;
  completions: HabitCompletion[];
  streak: number;
  longestStreak: number;
  xpPoints: number;
  order: number;
}

export interface Routine {
  id: string;
  name: string;
  habitIds: string[];
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  createdAt: number;
  startDate?: string;
  endDate?: string;
  reminderTime?: string;
  notificationRecurrence?: "once" | "twice" | "custom";
  customNotifIntervalHours?: number;
  customNotifIntervalMinutes?: number;
}

export interface UserStats {
  level: number;
  totalXP: number;
  totalCompleted: number;
  freezeTokens: number;
  badges: string[];
  joinDate: number;
  username: string;
  stepsGoal: number;
  strictMode: boolean;
  habitStacking: boolean;
  perfectDayStreak: number;
  viceStreak: number;
  abstinenceStreak: number;
  hapticPreset: "soft" | "standard" | "heavy";
}

export interface PomodoroSession {
  id: string;
  date: string;
  duration: number;
  type: "work" | "break";
  completedAt: number;
}

export interface CalendarEventReminder {
  minutesBefore: number;
}

export type RecurrenceType = "none" | "daily" | "weekly" | "monthly" | "annually" | "custom";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  type: "event" | "task";
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  color: string;
  recurrence: RecurrenceType;
  recurrenceInterval?: number;
  recurrenceDays?: number[];
  recurrenceEndDate?: string;
  reminders: CalendarEventReminder[];
  completed?: boolean;
  createdAt: number;
}

export function eventOccursOnDate(ev: CalendarEvent, date: string): boolean {
  if (date < ev.date) return false;
  if (ev.recurrenceEndDate && date > ev.recurrenceEndDate) return false;
  if (ev.recurrence === "none") return ev.date === date;
  const startD = new Date(ev.date + "T12:00:00");
  const targetD = new Date(date + "T12:00:00");
  const diffDays = Math.round((targetD.getTime() - startD.getTime()) / 86400000);
  if (ev.recurrence === "daily") {
    const interval = ev.recurrenceInterval ?? 1;
    return diffDays >= 0 && diffDays % interval === 0;
  }
  if (ev.recurrence === "weekly") {
    const wInterval = (ev.recurrenceInterval ?? 1) * 7;
    return startD.getDay() === targetD.getDay() && diffDays % wInterval === 0;
  }
  if (ev.recurrence === "monthly") {
    return startD.getDate() === targetD.getDate();
  }
  if (ev.recurrence === "annually") {
    return startD.getDate() === targetD.getDate() && startD.getMonth() === targetD.getMonth();
  }
  if (ev.recurrence === "custom") {
    return (ev.recurrenceDays ?? []).includes(targetD.getDay());
  }
  return false;
}

interface HabitsContextType {
  habits: Habit[];
  routines: Routine[];
  userStats: UserStats;
  pomodoroSessions: PomodoroSession[];
  stepsByDate: Record<string, number>;
  calendarEvents: CalendarEvent[];
  addHabit: (habit: Omit<Habit, "id" | "createdAt" | "completions" | "streak" | "longestStreak" | "xpPoints" | "order">) => string;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  archiveHabit: (id: string) => void;
  unarchiveHabit: (id: string) => void;
  deleteHabit: (id: string) => void;
  completeHabit: (id: string, value?: number, duration?: number) => void;
  uncompleteHabit: (id: string) => void;
  completeMicroHabit: (id: string, microValue?: number) => void;
  updateUserStats: (updates: Partial<UserStats>) => void;
  skipHabit: (id: string, date?: string, reason?: string) => void;
  getTodayCompletion: (habit: Habit) => HabitCompletion | undefined;
  getCompletionForDate: (habit: Habit, date: string) => HabitCompletion | undefined;
  isHabitDueToday: (habit: Habit) => boolean;
  isHabitDueOnDate: (habit: Habit, date: string) => boolean;
  getTodayProgress: () => { completed: number; total: number };
  getProgressForDate: (date: string) => { completed: number; total: number };
  getStreak: (habit: Habit) => number;
  addRoutine: (routine: Omit<Routine, "id" | "createdAt">) => void;
  updateRoutine: (id: string, updates: Partial<Omit<Routine, "id" | "createdAt">>) => void;
  deleteRoutine: (id: string) => void;
  logPomodoroSession: (session: Omit<PomodoroSession, "id">) => void;
  freezeStreak: (id: string) => void;
  retroactiveEdit: (id: string, date: string, completed: boolean) => void;
  clearAllData: () => void;
  logSteps: (date: string, count: number) => void;
  updateStepsGoal: (goal: number) => void;
  updateUsername: (name: string) => void;
  exportData: () => string;
  importData: (json: string) => Promise<boolean>;
  loadMockData: () => Promise<void>;
  lastBadgeEarned: (Badge & { earnedAt: number }) | null;
  lastLevelUp: number | null;
  lastStreakMilestone: { habitName: string; habitColor: string; days: number } | null;
  clearLastBadgeEarned: () => void;
  clearLastLevelUp: () => void;
  clearLastStreakMilestone: () => void;
  addCalendarEvent: (ev: Omit<CalendarEvent, "id" | "createdAt">) => string;
  updateCalendarEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteCalendarEvent: (id: string) => void;
  toggleEventComplete: (id: string) => void;
}

const HabitsContext = createContext<HabitsContextType | null>(null);

const STORAGE_KEY = "@focus_habits_v3";
const ROUTINES_KEY = "@focus_routines";
const STATS_KEY = "@focus_stats";
const POMODORO_KEY = "@focus_pomodoro";
const STEPS_KEY = "@focus_steps";
const EVENTS_KEY = "@focus_calendar_events";
let saveQueue: Promise<void> = Promise.resolve();

function enqueueSave(task: () => Promise<void>) {
  saveQueue = saveQueue.then(task).catch(() => {});
  return saveQueue;
}

function dedupeHabits(list: Habit[]): Habit[] {
  return Array.from(new Map(list.map((habit) => [habit.id, habit])).values());
}

const DEFAULT_STATS: UserStats = {
  level: 1,
  totalXP: 0,
  totalCompleted: 0,
  freezeTokens: 3,
  badges: [],
  joinDate: Date.now(),
  username: "FOCUS User",
  stepsGoal: 10000,
  strictMode: false,
  habitStacking: false,
  perfectDayStreak: 0,
  viceStreak: 0,
  abstinenceStreak: 0,
  hapticPreset: "standard",
};

const GRACE_DAYS = 3;

export function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function getDayOfWeek(date?: Date) {
  return (date ?? new Date()).getDay();
}

export function calcStreak(
  completions: HabitCompletion[],
  frequency: HabitFrequency,
  customDays?: number[]
): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const completionMap = new Map<string, HabitCompletion>();
  completions.forEach((c) => completionMap.set(c.date, c));

  let streak = 0;
  let graceDaysUsed = 0;

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dow = d.getDay();

    let isDue = false;
    if (frequency === "daily") isDue = true;
    else if (frequency === "weekdays") isDue = dow >= 1 && dow <= 5;
    else if (frequency === "weekends") isDue = dow === 0 || dow === 6;
    else if (frequency === "custom") isDue = (customDays ?? []).includes(dow);

    if (!isDue) continue;

    const log = completionMap.get(dateStr);
    if (log?.completed) {
      streak++;
      graceDaysUsed = 0;
    } else {
      if (i === 0) continue; // today hasn't had a chance yet
      graceDaysUsed++;
      if (graceDaysUsed > GRACE_DAYS) break;
      // grace day: don't add to streak, but don't break it
    }
  }

  return streak;
}

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

const SAMPLE_HABITS: Habit[] = [
  {
    id: "sample1",
    name: "Morning Meditation",
    description: "10 minutes of mindful breathing",
    type: "timed",
    category: "mental",
    icon: "wind",
    color: "#A855F7",
    frequency: "daily",
    targetDuration: 10,
    difficulty: "easy",
    priority: "high",
    createdAt: Date.now() - 30 * 86400000,
    archived: false,
    completions: [1,2,3,4,5,6,7].map((n) => ({ date: daysAgoStr(n), completed: true, timestamp: Date.now() - n * 86400000 })),
    streak: 7,
    longestStreak: 12,
    xpPoints: 70,
    order: 0,
  },
  {
    id: "sample2",
    name: "Workout",
    description: "30 min strength training",
    type: "binary",
    category: "physical",
    icon: "activity",
    color: "#13EC5B",
    frequency: "weekdays",
    difficulty: "hard",
    priority: "high",
    createdAt: Date.now() - 60 * 86400000,
    archived: false,
    completions: [],
    streak: 0,
    longestStreak: 21,
    xpPoints: 0,
    order: 1,
  },
  {
    id: "sample3",
    name: "Read",
    description: "30 pages of a book",
    type: "quantitative",
    category: "academics",
    icon: "book-open",
    color: "#3B82F6",
    frequency: "daily",
    targetValue: 30,
    targetUnit: "pages",
    difficulty: "medium",
    priority: "medium",
    createdAt: Date.now() - 14 * 86400000,
    archived: false,
    completions: [1,2,3,4,5].map((n) => ({ date: daysAgoStr(n), completed: true, timestamp: Date.now() - n * 86400000 })),
    streak: 5,
    longestStreak: 7,
    xpPoints: 100,
    order: 2,
  },
  {
    id: "sample4",
    name: "Drink Water",
    description: "8 glasses throughout the day",
    type: "quantitative",
    category: "physical",
    icon: "droplet",
    color: "#06B6D4",
    frequency: "daily",
    targetValue: 8,
    targetUnit: "glasses",
    difficulty: "easy",
    priority: "medium",
    createdAt: Date.now() - 7 * 86400000,
    archived: false,
    completions: [],
    streak: 0,
    longestStreak: 5,
    xpPoints: 0,
    order: 3,
  },
  {
    id: "sample5",
    name: "Journal",
    description: "Write 5 minutes of thoughts",
    type: "timed",
    category: "creativity",
    icon: "pen-tool",
    color: "#F97316",
    frequency: "daily",
    targetDuration: 5,
    difficulty: "easy",
    priority: "low",
    createdAt: Date.now() - 5 * 86400000,
    archived: false,
    completions: [1,2,3].map((n) => ({ date: daysAgoStr(n), completed: true, timestamp: Date.now() - n * 86400000 })),
    streak: 3,
    longestStreak: 4,
    xpPoints: 30,
    order: 4,
  },
  {
    id: "sample6",
    name: "Mindful Walk",
    description: "20 minute walk without distractions",
    type: "timed",
    category: "physical",
    icon: "navigation",
    color: "#22C55E",
    frequency: "daily",
    targetDuration: 20,
    difficulty: "medium",
    priority: "medium",
    createdAt: Date.now() - 9 * 86400000,
    archived: false,
    completions: [1, 2].map((n) => ({ date: daysAgoStr(n), completed: true, timestamp: Date.now() - n * 86400000 })),
    streak: 2,
    longestStreak: 6,
    xpPoints: 40,
    order: 5,
  },
  {
    id: "sample7",
    name: "Clean Desk",
    description: "Reset and organize workspace",
    type: "binary",
    category: "chores",
    icon: "trash-2",
    color: "#F59E0B",
    frequency: "weekdays",
    difficulty: "easy",
    priority: "low",
    createdAt: Date.now() - 12 * 86400000,
    archived: false,
    completions: [],
    streak: 0,
    longestStreak: 4,
    xpPoints: 0,
    order: 6,
  },
  {
    id: "sample8",
    name: "Study Block",
    description: "45 minute deep work session",
    type: "quantitative",
    category: "academics",
    icon: "cpu",
    color: "#8B5CF6",
    frequency: "daily",
    targetValue: 45,
    targetUnit: "min",
    difficulty: "hard",
    priority: "high",
    createdAt: Date.now() - 20 * 86400000,
    archived: false,
    completions: [1, 2, 4].map((n) => ({ date: daysAgoStr(n), completed: true, timestamp: Date.now() - n * 86400000 })),
    streak: 3,
    longestStreak: 8,
    xpPoints: 90,
    order: 7,
  },
];

const SAMPLE_ROUTINES: Routine[] = [
  {
    id: "routine1",
    name: "Morning Reset",
    habitIds: ["sample1", "sample4", "sample7"],
    timeOfDay: "morning",
    createdAt: Date.now() - 10 * 86400000,
    reminderTime: "07:30",
  },
  {
    id: "routine2",
    name: "Deep Work",
    habitIds: ["sample3", "sample8"],
    timeOfDay: "afternoon",
    createdAt: Date.now() - 8 * 86400000,
    reminderTime: "14:00",
  },
  {
    id: "routine3",
    name: "Evening Wind Down",
    habitIds: ["sample5", "sample6"],
    timeOfDay: "evening",
    createdAt: Date.now() - 6 * 86400000,
    reminderTime: "20:30",
  },
];

const SAMPLE_USER_STATS: UserStats = {
  level: 4,
  totalXP: 1620,
  totalCompleted: 54,
  freezeTokens: 2,
  badges: ["first_habit", "habit_5", "xp_1000"],
  joinDate: Date.now() - 75 * 86400000,
  username: "Demo User",
  stepsGoal: 12000,
  strictMode: false,
  habitStacking: true,
  perfectDayStreak: 6,
  viceStreak: 1,
  abstinenceStreak: 11,
  hapticPreset: "heavy",
};

const SAMPLE_POMODORO: PomodoroSession[] = [
  {
    id: "pom1",
    date: getTodayStr(),
    duration: 25 * 60,
    type: "work",
    completedAt: Date.now() - 45 * 60 * 1000,
  },
  {
    id: "pom2",
    date: getTodayStr(),
    duration: 5 * 60,
    type: "break",
    completedAt: Date.now() - 40 * 60 * 1000,
  },
  {
    id: "pom3",
    date: getTodayStr(),
    duration: 50 * 60,
    type: "work",
    completedAt: Date.now() - 2 * 60 * 60 * 1000,
  },
];

const SAMPLE_STEPS: Record<string, number> = {
  [getTodayStr()]: 8420,
  [daysAgoStr(1)]: 10650,
  [daysAgoStr(2)]: 7200,
};

const SAMPLE_EVENTS: CalendarEvent[] = [
  {
    id: "event1",
    title: "Team sync",
    description: "Weekly update",
    location: "Zoom",
    type: "event",
    date: getTodayStr(),
    startTime: "10:00",
    endTime: "10:30",
    allDay: false,
    color: "#3B82F6",
    recurrence: "weekly",
    recurrenceInterval: 1,
    reminders: [{ minutesBefore: 15 }],
    createdAt: Date.now() - 2 * 86400000,
  },
  {
    id: "event2",
    title: "Doctor appointment",
    description: "Annual checkup",
    location: "Clinic",
    type: "event",
    date: getTodayStr(),
    startTime: "15:30",
    endTime: "16:00",
    allDay: false,
    color: "#22C55E",
    recurrence: "none",
    reminders: [{ minutesBefore: 60 }],
    createdAt: Date.now() - 4 * 86400000,
  },
  {
    id: "task1",
    title: "Submit reading notes",
    type: "task",
    date: getTodayStr(),
    startTime: "18:00",
    endTime: "18:15",
    allDay: false,
    color: "#F97316",
    recurrence: "none",
    reminders: [{ minutesBefore: 30 }],
    completed: false,
    createdAt: Date.now() - 86400000,
  },
  {
    id: "task2",
    title: "Pay electricity bill",
    description: "Due this week",
    type: "task",
    date: daysAgoStr(1),
    startTime: "19:00",
    endTime: "19:20",
    allDay: false,
    color: "#F59E0B",
    recurrence: "none",
    reminders: [],
    completed: true,
    createdAt: Date.now() - 5 * 86400000,
  },
];

export function HabitsProvider({ children }: { children: React.ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const habitsRef = useRef<Habit[]>([]);
  habitsRef.current = habits;
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [userStats, setUserStats] = useState<UserStats>(DEFAULT_STATS);
  const [pomodoroSessions, setPomodoroSessions] = useState<PomodoroSession[]>([]);
  const [stepsByDate, setStepsByDate] = useState<Record<string, number>>({});
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [lastBadgeEarned, setLastBadgeEarned] = useState<(Badge & { earnedAt: number }) | null>(null);
  const [lastLevelUp, setLastLevelUp] = useState<number | null>(null);
  const [lastStreakMilestone, setLastStreakMilestone] = useState<{ habitName: string; habitColor: string; days: number } | null>(null);
  const badgeCheckRef = useRef({ totalXP: -1, totalCompleted: -1, level: -1, habitsLen: -1, pomodoroLen: -1 });

  useEffect(() => {
    (async () => {
      const [hRaw, rRaw, sRaw, pRaw, stRaw, evRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(ROUTINES_KEY),
        AsyncStorage.getItem(STATS_KEY),
        AsyncStorage.getItem(POMODORO_KEY),
        AsyncStorage.getItem(STEPS_KEY),
        AsyncStorage.getItem(EVENTS_KEY),
      ]).catch(() => [null, null, null, null, null, null] as const);

      // Each key is parsed independently so one corrupted entry never
      // silently wipes the rest of the user's data.
      let loadedHabits: Habit[] = dedupeHabits(SAMPLE_HABITS);
      if (hRaw) {
        try {
          loadedHabits = dedupeHabits(JSON.parse(hRaw));
        } catch {
          console.warn("[FOCUS] habits storage corrupted — falling back to sample data");
        }
      }
      setHabits(loadedHabits);

      if (rRaw) {
        try { setRoutines(JSON.parse(rRaw)); } catch {
          console.warn("[FOCUS] routines storage corrupted — skipping");
        }
      }
      if (sRaw) {
        try {
          const parsed = JSON.parse(sRaw);
          setUserStats({ ...DEFAULT_STATS, ...parsed });
        } catch {
          console.warn("[FOCUS] userStats storage corrupted — using defaults");
        }
      }
      if (pRaw) {
        try { setPomodoroSessions(JSON.parse(pRaw)); } catch {
          console.warn("[FOCUS] pomodoroSessions storage corrupted — skipping");
        }
      }
      if (stRaw) {
        try { setStepsByDate(JSON.parse(stRaw)); } catch {
          console.warn("[FOCUS] stepsByDate storage corrupted — skipping");
        }
      }
      if (evRaw) {
        try { setCalendarEvents(JSON.parse(evRaw)); } catch {
          console.warn("[FOCUS] calendarEvents storage corrupted — skipping");
        }
      }

      // Reschedule any habit reminders that were lost (e.g. app reinstall)
      initializeNotifications(loadedHabits).catch(() => {});
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    enqueueSave(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(habits)));
  }, [habits, loaded]);

  useEffect(() => {
    if (!loaded) return;
    enqueueSave(() => AsyncStorage.setItem(ROUTINES_KEY, JSON.stringify(routines)));
  }, [routines, loaded]);

  useEffect(() => {
    if (!loaded) return;
    enqueueSave(() => AsyncStorage.setItem(STATS_KEY, JSON.stringify(userStats)));
  }, [userStats, loaded]);

  useEffect(() => {
    if (!loaded) return;
    enqueueSave(() => AsyncStorage.setItem(POMODORO_KEY, JSON.stringify(pomodoroSessions)));
  }, [pomodoroSessions, loaded]);

  useEffect(() => {
    if (!loaded) return;
    enqueueSave(() => AsyncStorage.setItem(STEPS_KEY, JSON.stringify(stepsByDate)));
  }, [stepsByDate, loaded]);

  useEffect(() => {
    if (!loaded) return;
    enqueueSave(() => AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(calendarEvents)));
  }, [calendarEvents, loaded]);

  useEffect(() => {
    if (!loaded) return;
    const { totalXP, totalCompleted, level } = userStats;
    const habitsLen = habits.length;
    const pomodoroLen = pomodoroSessions.length;
    const ref = badgeCheckRef.current;
    if (
      ref.totalXP === totalXP &&
      ref.totalCompleted === totalCompleted &&
      ref.level === level &&
      ref.habitsLen === habitsLen &&
      ref.pomodoroLen === pomodoroLen
    ) return;
    badgeCheckRef.current = { totalXP, totalCompleted, level, habitsLen, pomodoroLen };

    setUserStats((prev) => {
      const earned = new Set(prev.badges);
      const newBadges: string[] = [];
      const activeHabits = habits.filter((h) => !h.archived);
      const maxStreak = activeHabits.length > 0 ? Math.max(...activeHabits.map((h) => h.streak)) : 0;
      const workSessionCount = pomodoroSessions.filter((s) => s.type === "work").length;
      const activePillars = new Set(activeHabits.map((h) => h.category));

      if (!earned.has("first_habit") && prev.totalCompleted >= 1) newBadges.push("first_habit");
      if (!earned.has("streak_7") && maxStreak >= 7) newBadges.push("streak_7");
      if (!earned.has("streak_14") && maxStreak >= 14) newBadges.push("streak_14");
      if (!earned.has("streak_30") && maxStreak >= 30) newBadges.push("streak_30");
      if (!earned.has("streak_60") && maxStreak >= 60) newBadges.push("streak_60");
      if (!earned.has("streak_100") && maxStreak >= 100) newBadges.push("streak_100");
      if (!earned.has("xp_1000") && prev.totalXP >= 1000) newBadges.push("xp_1000");
      if (!earned.has("xp_5000") && prev.totalXP >= 5000) newBadges.push("xp_5000");
      if (!earned.has("xp_10000") && prev.totalXP >= 10000) newBadges.push("xp_10000");
      if (!earned.has("pomodoro_10") && workSessionCount >= 10) newBadges.push("pomodoro_10");
      if (!earned.has("pomodoro_50") && workSessionCount >= 50) newBadges.push("pomodoro_50");
      if (!earned.has("habit_5") && activeHabits.length >= 5) newBadges.push("habit_5");
      if (!earned.has("habit_10") && activeHabits.length >= 10) newBadges.push("habit_10");
      if (!earned.has("all_pillars") && activePillars.size >= 5) newBadges.push("all_pillars");
      if (!earned.has("level_5") && prev.level >= 5) newBadges.push("level_5");
      if (!earned.has("level_10") && prev.level >= 10) newBadges.push("level_10");

      if (newBadges.length === 0) return prev;

      setTimeout(() => {
        const def = getBadge(newBadges[0]);
        if (def) setLastBadgeEarned({ ...def, earnedAt: Date.now() });
      }, 700);

      return { ...prev, badges: [...prev.badges, ...newBadges] };
    });
  }, [habits, pomodoroSessions, userStats.totalXP, userStats.level, userStats.totalCompleted, loaded]);

  const clearLastBadgeEarned = useCallback(() => setLastBadgeEarned(null), []);
  const clearLastLevelUp = useCallback(() => setLastLevelUp(null), []);
  const clearLastStreakMilestone = useCallback(() => setLastStreakMilestone(null), []);

  const logSteps = useCallback((date: string, count: number) => {
    setStepsByDate((prev) => ({ ...prev, [date]: Math.max(0, count) }));
  }, []);

  const updateStepsGoal = useCallback((goal: number) => {
    setUserStats((prev) => ({ ...prev, stepsGoal: Math.max(1, goal) }));
  }, []);

  const updateUsername = useCallback((name: string) => {
    setUserStats((prev) => ({ ...prev, username: name.trim() || "FOCUS User" }));
  }, []);

  const updateUserStats = useCallback((updates: Partial<UserStats>) => {
    setUserStats((prev) => ({ ...prev, ...updates }));
  }, []);

  const exportData = useCallback((): string => {
    return JSON.stringify({
      version: 2,
      exportedAt: new Date().toISOString(),
      habits,
      routines,
      userStats,
      pomodoroSessions,
      stepsByDate,
    }, null, 2);
  }, [habits, routines, userStats, pomodoroSessions, stepsByDate]);

  const importData = useCallback(async (json: string): Promise<boolean> => {
    try {
      const data = JSON.parse(json);
      if (data.habits && Array.isArray(data.habits)) setHabits(dedupeHabits(data.habits));
      if (data.routines && Array.isArray(data.routines)) setRoutines(data.routines);
      if (data.userStats && typeof data.userStats === "object") setUserStats({ ...DEFAULT_STATS, ...data.userStats });
      if (data.pomodoroSessions && Array.isArray(data.pomodoroSessions)) setPomodoroSessions(data.pomodoroSessions);
      if (data.stepsByDate && typeof data.stepsByDate === "object") setStepsByDate(data.stepsByDate);
      return true;
    } catch {
      return false;
    }
  }, []);

  const addHabit = useCallback(
    (habit: Omit<Habit, "id" | "createdAt" | "completions" | "streak" | "longestStreak" | "xpPoints" | "order">): string => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const newHabit: Habit = {
        ...habit,
        id,
        createdAt: Date.now(),
        completions: [],
        streak: 0,
        longestStreak: 0,
        xpPoints: 0,
        order: habits.length,
      };
      setHabits((prev) => dedupeHabits([...prev, newHabit]));
      return id;
    },
    [habits.length]
  );

  const updateHabit = useCallback((id: string, updates: Partial<Habit>) => {
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, ...updates } : h)));
  }, []);

  const archiveHabit = useCallback((id: string) => {
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, archived: true } : h)));
  }, []);

  const unarchiveHabit = useCallback((id: string) => {
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, archived: false } : h)));
  }, []);

  const deleteHabit = useCallback((id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const getTodayCompletion = useCallback((habit: Habit) => {
    const today = getTodayStr();
    return habit.completions.find((c) => c.date === today);
  }, []);

  const getCompletionForDate = useCallback((habit: Habit, date: string) => {
    return habit.completions.find((c) => c.date === date);
  }, []);

  const isHabitDueToday = useCallback((habit: Habit) => {
    if (habit.archived) return false;
    const dow = getDayOfWeek();
    if (habit.frequency === "daily") return true;
    if (habit.frequency === "weekdays") return dow >= 1 && dow <= 5;
    if (habit.frequency === "weekends") return dow === 0 || dow === 6;
    if (habit.frequency === "custom") return (habit.customDays ?? []).includes(dow);
    return true;
  }, []);

  const isHabitDueOnDate = useCallback((habit: Habit, dateStr: string) => {
    if (habit.archived) return false;
    const d = new Date(dateStr + "T12:00:00");
    const dow = d.getDay();
    if (habit.frequency === "daily") return true;
    if (habit.frequency === "weekdays") return dow >= 1 && dow <= 5;
    if (habit.frequency === "weekends") return dow === 0 || dow === 6;
    if (habit.frequency === "custom") return (habit.customDays ?? []).includes(dow);
    return true;
  }, []);

  const isQuantitativeComplete = (habit: Habit, value?: number, duration?: number) => {
    if (habit.type === "quantitative" && habit.targetValue != null) return (value ?? 0) >= habit.targetValue;
    if (habit.type === "timed" && habit.targetDuration != null) return (duration ?? 0) >= habit.targetDuration;
    return true;
  };

  const completeHabit = useCallback(
    (id: string, value?: number, duration?: number) => {
      const today = getTodayStr();
      setHabits((prev) =>
        prev.map((h) => {
          if (h.id !== id) return h;
          const existing = h.completions.findIndex((c) => c.date === today);
          // ✅ Read alreadyCompleted from prev (fresh state), not stale closure
          const alreadyCompleted = existing >= 0 && h.completions[existing].completed;
          const completed = isQuantitativeComplete(h, value, duration);
          let newCompletions: HabitCompletion[];
          if (existing >= 0) {
            newCompletions = h.completions.map((c, i) =>
              i === existing
                ? {
                    ...c,
                    completed,
                    value,
                    duration,
                    timestamp: Date.now(),
                  }
                : c
            );
          } else {
            newCompletions = [
              ...h.completions,
              {
                date: today,
                completed,
                value,
                duration,
                timestamp: Date.now(),
              },
            ];
          }
          const newStreak = calcStreak(newCompletions, h.frequency, h.customDays);
          const newLongest = Math.max(h.longestStreak, newStreak);
          const isInComeback = !!(h.comebackUntil && h.comebackUntil >= today);
          const xpBase = h.difficulty === "easy" ? 10 : h.difficulty === "medium" ? 20 : 30;
          const xpGain = isInComeback ? xpBase * 2 : xpBase;
          const newComebackUntil = newStreak >= 5 ? undefined : h.comebackUntil;
          return {
            ...h,
            completions: newCompletions,
            streak: newStreak,
            longestStreak: newLongest,
            // ✅ Only add XP if not already completed — prevents double-increment on rapid taps
            xpPoints: h.xpPoints + (alreadyCompleted ? 0 : xpGain),
            comebackUntil: newComebackUntil,
          };
        })
      );
      // ✅ Read from ref (latest committed state) instead of stale closure
      const habit = habitsRef.current.find((h) => h.id === id);
      if (habit) {
        const today2 = getTodayStr();

        const existingIdx = habit.completions.findIndex((c) => c.date === today2);
        const projectedCompletions = existingIdx >= 0
          ? habit.completions.map((c, i) => i === existingIdx ? { ...c, completed: true, value, duration, timestamp: Date.now() } : c)
          : [...habit.completions, { date: today2, completed: true, value, duration, timestamp: Date.now() }];
        const projectedStreak = calcStreak(projectedCompletions, habit.frequency, habit.customDays);
        for (const m of [7, 14, 30, 60, 100]) {
          if (habit.streak < m && projectedStreak >= m) {
            setTimeout(() => setLastStreakMilestone({ habitName: habit.name, habitColor: habit.color, days: m }), 350);
            break;
          }
        }

        const isInComeback = !!(habit.comebackUntil && habit.comebackUntil >= today2);
        const alreadyCompletedToday = !!habit.completions.find((c) => c.date === today2 && c.completed);
        if (isInComeback && !alreadyCompletedToday) {
          setUserStats((prev) => {
            if (prev.badges.includes("comeback")) return prev;
            setTimeout(() => {
              const def = getBadge("comeback");
              if (def) setLastBadgeEarned({ ...def, earnedAt: Date.now() });
            }, 600);
            return { ...prev, badges: [...prev.badges, "comeback"] };
          });
        }

        // ✅ Only update userStats if the habit wasn't already completed today
        if (!alreadyCompletedToday) {
          const xpBase = habit.difficulty === "easy" ? 10 : habit.difficulty === "medium" ? 20 : 30;
          const xpGain = isInComeback ? xpBase * 2 : xpBase;
          setUserStats((prev) => {
            const newXP = prev.totalXP + xpGain;
            const newLevel = Math.floor(newXP / 500) + 1;
            if (newLevel > prev.level) {
              setTimeout(() => setLastLevelUp(newLevel), 500);
            }
            return { ...prev, totalXP: newXP, totalCompleted: prev.totalCompleted + 1, level: newLevel };
          });
        }
      }
    },
    [] // ✅ No stale closure dependency — reads from habitsRef and functional prev
  );

  const uncompleteHabit = useCallback(
    (id: string) => {
      const today = getTodayStr();
      setHabits((prev) =>
        prev.map((h) => {
          if (h.id !== id) return h;
          const existing = h.completions.find((c) => c.date === today && c.completed);
          if (!existing) return h;
          const newCompletions = h.completions.map((c) =>
            c.date === today && c.completed ? { ...c, completed: false } : c
          );
          const newStreak = calcStreak(newCompletions, h.frequency, h.customDays);
          return { ...h, completions: newCompletions, streak: newStreak };
        })
      );
      // ✅ Read from ref instead of stale closure
      const habit = habitsRef.current.find((h) => h.id === id);
      if (habit) {
        const today2 = getTodayStr();
        // ✅ Only deduct XP if the habit was actually completed today
        const wasCompletedToday = !!habit.completions.find((c) => c.date === today2 && c.completed);
        if (wasCompletedToday) {
          const isInComeback = !!(habit.comebackUntil && habit.comebackUntil >= today2);
          const xpBase = habit.difficulty === "easy" ? 10 : habit.difficulty === "medium" ? 20 : 30;
          const xpGain = isInComeback ? xpBase * 2 : xpBase;
          setUserStats((prev) => {
            const newXP = Math.max(0, prev.totalXP - xpGain);
            return {
              ...prev,
              totalXP: newXP,
              totalCompleted: Math.max(0, prev.totalCompleted - 1),
              level: Math.max(1, Math.floor(newXP / 500) + 1),
            };
          });
        }
      }
    },
    [] // ✅ No stale closure dependency
  );

  const skipHabit = useCallback((id: string, date?: string, reason?: string) => {
    const targetDate = date ?? getTodayStr();
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const prevStreakVal = h.streak;
        const existing = h.completions.findIndex((c) => c.date === targetDate);
        let newCompletions: HabitCompletion[];
        if (existing >= 0) {
          newCompletions = h.completions.map((c, i) =>
            i === existing ? { ...c, completed: false, skipReason: reason || undefined } : c
          );
        } else {
          newCompletions = [
            ...h.completions,
            { date: targetDate, completed: false, skipReason: reason || undefined },
          ];
        }
        const newStreak = calcStreak(newCompletions, h.frequency, h.customDays);
        let comebackUntil = h.comebackUntil;
        let prevStreak = h.prevStreak;
        if (prevStreakVal > 7 && newStreak === 0 && !h.comebackUntil) {
          const d = new Date();
          d.setDate(d.getDate() + 5);
          comebackUntil = d.toISOString().split("T")[0];
          prevStreak = prevStreakVal;
        }
        return { ...h, completions: newCompletions, streak: newStreak, comebackUntil, prevStreak };
      })
    );
  }, []);

  const getTodayProgress = useCallback(() => {
    const dueHabits = habits.filter(isHabitDueToday);
    const completed = dueHabits.filter((h) => {
      const c = getTodayCompletion(h);
      return c?.completed;
    });
    return { completed: completed.length, total: dueHabits.length };
  }, [habits, isHabitDueToday, getTodayCompletion]);

  const getProgressForDate = useCallback(
    (dateStr: string) => {
      const dueHabits = habits.filter((h) => isHabitDueOnDate(h, dateStr));
      const completed = dueHabits.filter((h) => {
        const c = h.completions.find((comp) => comp.date === dateStr);
        return c?.completed;
      });
      return { completed: completed.length, total: dueHabits.length };
    },
    [habits, isHabitDueOnDate]
  );

  const getStreak = useCallback((habit: Habit) => {
    return calcStreak(habit.completions, habit.frequency, habit.customDays);
  }, []);

  const addRoutine = useCallback(
    (routine: Omit<Routine, "id" | "createdAt">) => {
      setRoutines((prev) => [
        ...prev,
        { ...routine, id: Date.now().toString() + Math.random().toString(36).substr(2, 9), createdAt: Date.now() },
      ]);
    },
    []
  );

  const deleteRoutine = useCallback((id: string) => {
    setRoutines((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateRoutine = useCallback(
    (id: string, updates: Partial<Omit<Routine, "id" | "createdAt">>) => {
      setRoutines((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    },
    []
  );

  const logPomodoroSession = useCallback((session: Omit<PomodoroSession, "id">) => {
    const newSession: PomodoroSession = {
      ...session,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    setPomodoroSessions((prev) => [newSession, ...prev].slice(0, 200));
    if (session.type === "work") {
      const xpGain = Math.floor(session.duration / 60) * 5;
      setUserStats((prev) => {
        const newXP = prev.totalXP + xpGain;
        const newLevel = Math.floor(newXP / 500) + 1;
        if (newLevel > prev.level) {
          setTimeout(() => setLastLevelUp(newLevel), 500);
        }
        return { ...prev, totalXP: newXP, level: newLevel };
      });
    }
  }, []);

  const completeMicroHabit = useCallback((id: string, microValue?: number) => {
    const today = getTodayStr();
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        // ✅ Read alreadyCompleted from prev (fresh state), not stale closure
        const existing = h.completions.findIndex((c) => c.date === today);
        const alreadyCompleted = existing >= 0 && h.completions[existing].completed;
        const microComp: HabitCompletion = {
          date: today,
          completed: true,
          value: microValue,
          isMicro: true,
          timestamp: Date.now(),
        };
        const newCompletions =
          existing >= 0
            ? h.completions.map((c, i) => (i === existing ? microComp : c))
            : [...h.completions, microComp];
        const newStreak = calcStreak(newCompletions, h.frequency, h.customDays);
        const newLongest = Math.max(h.longestStreak, newStreak);
        const xpBase = h.difficulty === "easy" ? 10 : h.difficulty === "medium" ? 20 : 30;
        const xpGain = Math.ceil(xpBase * 0.5);
        return {
          ...h,
          completions: newCompletions,
          streak: newStreak,
          longestStreak: newLongest,
          // ✅ Only add XP if not already completed — prevents double-increment on rapid taps
          xpPoints: h.xpPoints + (alreadyCompleted ? 0 : xpGain),
        };
      })
    );
    // ✅ Read from ref instead of stale closure
    const habit = habitsRef.current.find((h) => h.id === id);
    if (habit) {
      const today2 = getTodayStr();
      // ✅ Only award userStats XP if habit wasn't already completed today
      const alreadyCompletedToday = !!habit.completions.find((c) => c.date === today2 && c.completed);
      if (!alreadyCompletedToday) {
        const xpBase = habit.difficulty === "easy" ? 10 : habit.difficulty === "medium" ? 20 : 30;
        const xpGain = Math.ceil(xpBase * 0.5);
        setUserStats((prev) => {
          const newXP = prev.totalXP + xpGain;
          return { ...prev, totalXP: newXP, totalCompleted: prev.totalCompleted + 1, level: Math.floor(newXP / 500) + 1 };
        });
      }
    }
  }, []); // ✅ No stale closure dependency

  const freezeStreak = useCallback((id: string) => {
    skipHabit(id);
    setUserStats((prev) => ({
      ...prev,
      freezeTokens: Math.max(0, prev.freezeTokens - 1),
    }));
  }, [skipHabit]);

  const retroactiveEdit = useCallback((id: string, date: string, completed: boolean) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const existing = h.completions.findIndex((c) => c.date === date);
        let newCompletions: HabitCompletion[];
        if (existing >= 0) {
          newCompletions = h.completions.map((c, i) =>
            i === existing ? { ...c, completed, timestamp: Date.now() } : c
          );
        } else {
          newCompletions = [
            ...h.completions,
            { date, completed, timestamp: Date.now() },
          ];
        }
        const newStreak = calcStreak(newCompletions, h.frequency, h.customDays);
        const newLongest = Math.max(h.longestStreak, newStreak);
        return { ...h, completions: newCompletions, streak: newStreak, longestStreak: newLongest };
      })
    );
  }, []);

  const clearAllData = useCallback(async () => {
    setHabits([]);
    setRoutines([]);
    setUserStats(DEFAULT_STATS);
    setPomodoroSessions([]);
    setStepsByDate({});
    setCalendarEvents([]);
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([])),
      AsyncStorage.setItem(ROUTINES_KEY, JSON.stringify([])),
      AsyncStorage.removeItem(STATS_KEY),
      AsyncStorage.removeItem(POMODORO_KEY),
      AsyncStorage.removeItem(STEPS_KEY),
      AsyncStorage.removeItem(EVENTS_KEY),
    ]);
  }, []);

  const addCalendarEvent = useCallback((ev: Omit<CalendarEvent, "id" | "createdAt">): string => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newEv: CalendarEvent = { ...ev, id, createdAt: Date.now() };
    setCalendarEvents((prev) => [...prev, newEv]);
    return id;
  }, []);

  const updateCalendarEvent = useCallback((id: string, updates: Partial<CalendarEvent>) => {
    setCalendarEvents((prev) => prev.map((ev) => (ev.id === id ? { ...ev, ...updates } : ev)));
  }, []);

  const deleteCalendarEvent = useCallback((id: string) => {
    setCalendarEvents((prev) => prev.filter((ev) => ev.id !== id));
  }, []);

  const toggleEventComplete = useCallback((id: string) => {
    setCalendarEvents((prev) => prev.map((ev) => (ev.id === id ? { ...ev, completed: !ev.completed } : ev)));
  }, []);

  const loadMockData = useCallback(async () => {
    const habitsData = dedupeHabits(SAMPLE_HABITS);
    setHabits(habitsData);
    setRoutines(SAMPLE_ROUTINES);
    setUserStats(SAMPLE_USER_STATS);
    setPomodoroSessions(SAMPLE_POMODORO);
    setStepsByDate(SAMPLE_STEPS);
    setCalendarEvents(SAMPLE_EVENTS);
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(habitsData)),
      AsyncStorage.setItem(ROUTINES_KEY, JSON.stringify(SAMPLE_ROUTINES)),
      AsyncStorage.setItem(STATS_KEY, JSON.stringify(SAMPLE_USER_STATS)),
      AsyncStorage.setItem(POMODORO_KEY, JSON.stringify(SAMPLE_POMODORO)),
      AsyncStorage.setItem(STEPS_KEY, JSON.stringify(SAMPLE_STEPS)),
      AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(SAMPLE_EVENTS)),
    ]);
  }, []);

  return (
    <HabitsContext.Provider
      value={{
        habits,
        routines,
        userStats,
        pomodoroSessions,
        stepsByDate,
        calendarEvents,
        addCalendarEvent,
        updateCalendarEvent,
        deleteCalendarEvent,
        toggleEventComplete,
        loadMockData,
        addHabit,
        updateHabit,
        archiveHabit,
        unarchiveHabit,
        deleteHabit,
        completeHabit,
        uncompleteHabit,
        completeMicroHabit,
        skipHabit,
        getTodayCompletion,
        getCompletionForDate,
        isHabitDueToday,
        isHabitDueOnDate,
        getTodayProgress,
        getProgressForDate,
        getStreak,
        addRoutine,
        updateRoutine,
        deleteRoutine,
        logPomodoroSession,
        freezeStreak,
        retroactiveEdit,
        clearAllData,
        logSteps,
        updateStepsGoal,
        updateUsername,
        updateUserStats,
        exportData,
        importData,
        lastBadgeEarned,
        lastLevelUp,
        lastStreakMilestone,
        clearLastBadgeEarned,
        clearLastLevelUp,
        clearLastStreakMilestone,
      }}
    >
      {children}
    </HabitsContext.Provider>
  );
}

export function useHabits() {
  const ctx = useContext(HabitsContext);
  if (!ctx) throw new Error("useHabits must be used within HabitsProvider");
  return ctx;
}
