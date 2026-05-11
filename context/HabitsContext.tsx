import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StorageService, STORAGE_KEYS } from "@/lib/storage";
import { z } from "zod";
import { initializeNotifications, cancelHabitReminder } from "@/lib/notifications";
import { getBadge, type Badge } from "@/constants/badges";

// ── SCHEMAS ─────────────────────────────────────────────────────────────────

export const HabitCompletionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  completed: z.boolean(),
  value: z.number().optional(),
  duration: z.number().optional(),
  note: z.string().optional(),
  timestamp: z.number().optional(),
  skipReason: z.string().optional(),
  isMicro: z.boolean().optional(),
});

export const HabitSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.enum(["binary", "quantitative", "timed"]),
  category: z.enum(["physical", "mental", "academics", "creativity", "chores"]),
  icon: z.string(),
  color: z.string(),
  frequency: z.enum(["daily", "weekdays", "weekends", "custom"]),
  customDays: z.array(z.number()).optional(),
  targetValue: z.number().optional(),
  targetUnit: z.string().optional(),
  targetDuration: z.number().optional(),
  timeWindow: z.object({ start: z.string(), end: z.string() }).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  priority: z.enum(["low", "medium", "high"]),
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  notificationRecurrence: z.enum(["once", "twice", "custom"]).optional(),
  customNotifIntervalHours: z.number().optional(),
  customNotifIntervalMinutes: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  createdAt: z.number(),
  archived: z.boolean(),
  important: z.boolean().optional(),
  comebackUntil: z.string().optional(),
  prevStreak: z.number().optional(),
  completions: z.array(HabitCompletionSchema),
  streak: z.number(),
  longestStreak: z.number(),
  xpPoints: z.number(),
  order: z.number(),
});

export const RoutineSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  habitIds: z.array(z.string()),
  timeOfDay: z.enum(["morning", "afternoon", "evening", "night"]),
  createdAt: z.number(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  notificationRecurrence: z.enum(["once", "twice", "custom"]).optional(),
  customNotifIntervalHours: z.number().optional(),
  customNotifIntervalMinutes: z.number().optional(),
});

// ── TYPES ───────────────────────────────────────────────────────────────────

export type HabitType = z.infer<typeof HabitSchema>["type"];
export type HabitCategory = z.infer<typeof HabitSchema>["category"];
export type HabitFrequency = z.infer<typeof HabitSchema>["frequency"];
export type HabitDifficulty = z.infer<typeof HabitSchema>["difficulty"];
export type HabitCompletion = z.infer<typeof HabitCompletionSchema>;
export type Habit = z.infer<typeof HabitSchema>;
export type Routine = z.infer<typeof RoutineSchema>;

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

interface HabitsStateContextType {
  habits: Habit[];
  routines: Routine[];
  userStats: UserStats;
  pomodoroSessions: PomodoroSession[];
  stepsByDate: Record<string, number>;
  calendarEvents: CalendarEvent[];
  lastBadgeEarned: (Badge & { earnedAt: number }) | null;
  lastLevelUp: number | null;
  lastStreakMilestone: { habitName: string; habitColor: string; days: number } | null;
  loaded: boolean;
}

interface HabitsActionsContextType {
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
  clearLastBadgeEarned: () => void;
  clearLastLevelUp: () => void;
  clearLastStreakMilestone: () => void;
  addCalendarEvent: (ev: Omit<CalendarEvent, "id" | "createdAt">) => string;
  updateCalendarEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteCalendarEvent: (id: string) => void;
  toggleEventComplete: (id: string) => void;
}

const HabitsStateContext = createContext<HabitsStateContextType | null>(null);
const HabitsActionsContext = createContext<HabitsActionsContextType | null>(null);


function dedupeHabits(list: Habit[]): Habit[] {
  if (!Array.isArray(list)) return [];
  try {
    return Array.from(new Map(list.filter(h => h && typeof h === 'object' && h.id).map((habit) => [habit.id, habit])).values());
  } catch (e) {
    console.warn('[FOCUS] dedupeHabits failed:', e);
    return [];
  }
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
      if (i === 0) continue;
      graceDaysUsed++;
      if (graceDaysUsed > GRACE_DAYS) break;
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
  { id: "pom1", date: getTodayStr(), duration: 25 * 60, type: "work", completedAt: Date.now() - 45 * 60 * 1000 },
  { id: "pom2", date: getTodayStr(), duration: 5 * 60, type: "break", completedAt: Date.now() - 40 * 60 * 1000 },
  { id: "pom3", date: getTodayStr(), duration: 50 * 60, type: "work", completedAt: Date.now() - 2 * 60 * 60 * 1000 },
];

const SAMPLE_STEPS: Record<string, number> = {
  [getTodayStr()]: 8420,
  [daysAgoStr(1)]: 10650,
  [daysAgoStr(2)]: 7200,
};

const SAMPLE_EVENTS: CalendarEvent[] = [
  {
    id: "event1", title: "Team sync", description: "Weekly update", location: "Zoom", type: "event",
    date: getTodayStr(), startTime: "10:00", endTime: "10:30", allDay: false, color: "#3B82F6",
    recurrence: "weekly", recurrenceInterval: 1, reminders: [{ minutesBefore: 15 }], createdAt: Date.now() - 2 * 86400000,
  },
  {
    id: "event2", title: "Doctor appointment", description: "Annual checkup", location: "Clinic", type: "event",
    date: getTodayStr(), startTime: "15:30", endTime: "16:00", allDay: false, color: "#22C55E",
    recurrence: "none", reminders: [{ minutesBefore: 60 }], createdAt: Date.now() - 4 * 86400000,
  },
  {
    id: "task1", title: "Submit reading notes", type: "task", date: getTodayStr(), startTime: "18:00", endTime: "18:15",
    allDay: false, color: "#F97316", recurrence: "none", reminders: [{ minutesBefore: 30 }], completed: false, createdAt: Date.now() - 86400000,
  },
  {
    id: "task2", title: "Pay electricity bill", description: "Due this week", type: "task", date: daysAgoStr(1),
    startTime: "19:00", endTime: "19:20", allDay: false, color: "#F59E0B", recurrence: "none", reminders: [],
    completed: true, createdAt: Date.now() - 5 * 86400000,
  },
];

export function HabitsProvider({ children }: { children: React.ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const habitsRef = useRef<Habit[]>([]);
  habitsRef.current = habits;
  const [routines, setRoutines] = useState<Routine[]>([]);
  const routinesRef = useRef<Routine[]>([]);
  routinesRef.current = routines;
  const [userStats, setUserStats] = useState<UserStats>(DEFAULT_STATS);
  const userStatsRef = useRef<UserStats>(DEFAULT_STATS);
  userStatsRef.current = userStats;
  const [pomodoroSessions, setPomodoroSessions] = useState<PomodoroSession[]>([]);
  const [stepsByDate, setStepsByDate] = useState<Record<string, number>>({});
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const calendarEventsRef = useRef<CalendarEvent[]>([]);
  calendarEventsRef.current = calendarEvents;
  const [loaded, setLoaded] = useState(false);
  const [lastBadgeEarned, setLastBadgeEarned] = useState<(Badge & { earnedAt: number }) | null>(null);
  const [lastLevelUp, setLastLevelUp] = useState<number | null>(null);
  const [lastStreakMilestone, setLastStreakMilestone] = useState<{ habitName: string; habitColor: string; days: number } | null>(null);
  const badgeCheckRef = useRef({ totalXP: -1, totalCompleted: -1, level: -1, habitsLen: -1, pomodoroLen: -1 });

  useEffect(() => {
    (async () => {
      const data = await StorageService.multiGet(Object.values(STORAGE_KEYS));

      let loadedHabits: Habit[] = dedupeHabits(SAMPLE_HABITS);
      const hRaw = data[STORAGE_KEYS.HABITS];
      if (hRaw && Array.isArray(hRaw)) {
        try {
          loadedHabits = dedupeHabits(hRaw);
        } catch (e) {
          console.warn('[FOCUS] Failed to load habits from storage, using sample data:', e);
          loadedHabits = dedupeHabits(SAMPLE_HABITS);
        }
      }
      setHabits(loadedHabits);

      try {
        if (data[STORAGE_KEYS.ROUTINES] && Array.isArray(data[STORAGE_KEYS.ROUTINES])) setRoutines(data[STORAGE_KEYS.ROUTINES]);
        if (data[STORAGE_KEYS.STATS] && typeof data[STORAGE_KEYS.STATS] === 'object') setUserStats({ ...DEFAULT_STATS, ...data[STORAGE_KEYS.STATS] });
        if (data[STORAGE_KEYS.POMODORO] && Array.isArray(data[STORAGE_KEYS.POMODORO])) setPomodoroSessions(data[STORAGE_KEYS.POMODORO]);
        if (data[STORAGE_KEYS.STEPS] && typeof data[STORAGE_KEYS.STEPS] === 'object') setStepsByDate(data[STORAGE_KEYS.STEPS]);
        if (data[STORAGE_KEYS.CALENDAR] && Array.isArray(data[STORAGE_KEYS.CALENDAR])) setCalendarEvents(data[STORAGE_KEYS.CALENDAR]);
      } catch (e) {
        console.warn('[FOCUS] Failed to load some data from storage:', e);
      }

      try {
        await initializeNotifications(loadedHabits);
      } catch (e) {
        console.warn('[FOCUS] Failed to initialize notifications:', e);
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) StorageService.set(STORAGE_KEYS.HABITS, habits); }, [habits, loaded]);
  useEffect(() => { if (loaded) StorageService.set(STORAGE_KEYS.ROUTINES, routines); }, [routines, loaded]);
  useEffect(() => { if (loaded) StorageService.set(STORAGE_KEYS.STATS, userStats); }, [userStats, loaded]);
  useEffect(() => { if (loaded) StorageService.set(STORAGE_KEYS.POMODORO, pomodoroSessions); }, [pomodoroSessions, loaded]);
  useEffect(() => { if (loaded) StorageService.set(STORAGE_KEYS.STEPS, stepsByDate); }, [stepsByDate, loaded]);
  useEffect(() => { if (loaded) StorageService.set(STORAGE_KEYS.CALENDAR, calendarEvents); }, [calendarEvents, loaded]);

  useEffect(() => {
    if (!loaded) return;
    const { totalXP, totalCompleted, level } = userStats;
    const habitsLen = habits.length;
    const pomodoroLen = pomodoroSessions.length;
    const ref = badgeCheckRef.current;
    if (ref.totalXP === totalXP && ref.totalCompleted === totalCompleted && ref.level === level && ref.habitsLen === habitsLen && ref.pomodoroLen === pomodoroLen) return;
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
      setTimeout(() => { const def = getBadge(newBadges[0]); if (def) setLastBadgeEarned({ ...def, earnedAt: Date.now() }); }, 700);
      return { ...prev, badges: [...prev.badges, ...newBadges] };
    });
  }, [habits, pomodoroSessions, userStats.totalXP, userStats.level, userStats.totalCompleted, loaded]);

  const clearLastBadgeEarned = useCallback(() => setLastBadgeEarned(null), []);
  const clearLastLevelUp = useCallback(() => setLastLevelUp(null), []);
  const clearLastStreakMilestone = useCallback(() => setLastStreakMilestone(null), []);
  const logSteps = useCallback((date: string, count: number) => setStepsByDate((prev) => ({ ...prev, [date]: Math.max(0, count) })), []);
  const updateStepsGoal = useCallback((goal: number) => setUserStats((prev) => ({ ...prev, stepsGoal: Math.max(1, goal) })), []);
  const updateUsername = useCallback((name: string) => setUserStats((prev) => ({ ...prev, username: name.trim() || "FOCUS User" })), []);
  const updateUserStats = useCallback((updates: Partial<UserStats>) => setUserStats((prev) => ({ ...prev, ...updates })), []);

  const exportData = useCallback((): string => JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), habits, routines, userStats, pomodoroSessions, stepsByDate }, null, 2), [habits, routines, userStats, pomodoroSessions, stepsByDate]);

  const importData = useCallback(async (json: string): Promise<boolean> => {
    try {
      if (!json) return false;
      const data = JSON.parse(json);
      if (!data || typeof data !== "object") return false;
      if (data.habits && Array.isArray(data.habits)) { const dHabits = dedupeHabits(data.habits); setHabits(dHabits); habitsRef.current = dHabits; }
      if (data.routines && Array.isArray(data.routines)) { setRoutines(data.routines); routinesRef.current = data.routines; }
      if (data.userStats && typeof data.userStats === "object") { const stats = { ...DEFAULT_STATS, ...data.userStats }; setUserStats(stats); userStatsRef.current = stats; }
      if (data.pomodoroSessions && Array.isArray(data.pomodoroSessions)) setPomodoroSessions(data.pomodoroSessions);
      if (data.stepsByDate && typeof data.stepsByDate === "object") setStepsByDate(data.stepsByDate);
      return true;
    } catch { return false; }
  }, []);

  const addHabit = useCallback((habit: Omit<Habit, "id" | "createdAt" | "completions" | "streak" | "longestStreak" | "xpPoints" | "order">): string => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newHabit: Habit = { ...habit, id, createdAt: Date.now(), completions: [], streak: 0, longestStreak: 0, xpPoints: 0, order: habits.length };
    const validated = HabitSchema.safeParse(newHabit);
    if (!validated.success) { console.error("[FOCUS] addHabit validation failed", validated.error); throw new Error(validated.error.errors[0].message); }
    setHabits((prev) => dedupeHabits([...prev, newHabit]));
    return id;
  }, [habits.length]);

  const updateHabit = useCallback((id: string, updates: Partial<Habit>) => {
    setHabits((prev) => {
      const next = prev.map((h) => {
        if (h.id !== id) return h;
        const newHabit = { ...h, ...updates };
        if (updates.completions) {
          newHabit.streak = calcStreak(newHabit.completions, newHabit.frequency, newHabit.customDays);
          newHabit.longestStreak = Math.max(newHabit.longestStreak, newHabit.streak);
        }
        return newHabit;
      });
      habitsRef.current = next;
      return next;
    });
  }, []);

  const archiveHabit = useCallback((id: string) => { cancelHabitReminder(id); setHabits((prev) => { const next = prev.map((h) => (h.id === id ? { ...h, archived: true } : h)); habitsRef.current = next; return next; }); }, []);
  const unarchiveHabit = useCallback((id: string) => { setHabits((prev) => { const next = prev.map((h) => (h.id === id ? { ...h, archived: false } : h)); habitsRef.current = next; return next; }); }, []);
  const deleteHabit = useCallback((id: string) => { cancelHabitReminder(id); setHabits((prev) => { const next = prev.filter((h) => h.id !== id); habitsRef.current = next; return next; }); }, []);
  const getTodayCompletion = useCallback((habit: Habit) => habit.completions.find((c) => c.date === getTodayStr()), []);
  const getCompletionForDate = useCallback((habit: Habit, date: string) => habit.completions.find((c) => c.date === date), []);

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

  const completeHabit = useCallback((id: string, value?: number, duration?: number) => {
    const today = getTodayStr();
    setHabits((prev) => prev.map((h) => {
      if (h.id !== id) return h;
      const existing = h.completions.findIndex((c) => c.date === today);
      const alreadyCompleted = existing >= 0 && h.completions[existing].completed;
      const completed = isQuantitativeComplete(h, value, duration);
      let newCompletions = existing >= 0 ? h.completions.map((c, i) => i === existing ? { ...c, completed, value, duration, timestamp: Date.now() } : c) : [...h.completions, { date: today, completed, value, duration, timestamp: Date.now() }];
      const newStreak = calcStreak(newCompletions, h.frequency, h.customDays);
      const xpGain = (!!(h.comebackUntil && h.comebackUntil >= today)) ? (h.difficulty === "easy" ? 20 : h.difficulty === "medium" ? 40 : 60) : (h.difficulty === "easy" ? 10 : h.difficulty === "medium" ? 20 : 30);
      return { ...h, completions: newCompletions, streak: newStreak, longestStreak: Math.max(h.longestStreak, newStreak), xpPoints: h.xpPoints + (alreadyCompleted ? 0 : xpGain), comebackUntil: newStreak >= 5 ? undefined : h.comebackUntil };
    }));
    const habit = habitsRef.current.find((h) => h.id === id);
    if (habit) {
      const alreadyCompletedToday = !!habit.completions.find((c) => c.date === today && c.completed);
      if (!alreadyCompletedToday) {
        const xpGain = (!!(habit.comebackUntil && habit.comebackUntil >= today)) ? (habit.difficulty === "easy" ? 20 : habit.difficulty === "medium" ? 40 : 60) : (habit.difficulty === "easy" ? 10 : habit.difficulty === "medium" ? 20 : 30);
        setUserStats((prev) => {
          const newXP = prev.totalXP + xpGain;
          const newLevel = Math.floor(newXP / 500) + 1;
          if (newLevel > prev.level) setTimeout(() => setLastLevelUp(newLevel), 500);
          return { ...prev, totalXP: newXP, totalCompleted: prev.totalCompleted + 1, level: newLevel };
        });
      }
    }
  }, []);

  const uncompleteHabit = useCallback((id: string) => {
    const today = getTodayStr();
    setHabits((prev) => prev.map((h) => {
      if (h.id !== id) return h;
      const existing = h.completions.find((c) => c.date === today && c.completed);
      if (!existing) return h;
      const newCompletions = h.completions.map((c) => c.date === today && c.completed ? { ...c, completed: false } : c);
      return { ...h, completions: newCompletions, streak: calcStreak(newCompletions, h.frequency, h.customDays) };
    }));
    const habit = habitsRef.current.find((h) => h.id === id);
    if (habit) {
      if (!!habit.completions.find((c) => c.date === today && c.completed)) {
        const xpGain = (!!(habit.comebackUntil && habit.comebackUntil >= today)) ? (habit.difficulty === "easy" ? 20 : habit.difficulty === "medium" ? 40 : 60) : (habit.difficulty === "easy" ? 10 : habit.difficulty === "medium" ? 20 : 30);
        setUserStats((prev) => { const newXP = Math.max(0, prev.totalXP - xpGain); return { ...prev, totalXP: newXP, totalCompleted: Math.max(0, prev.totalCompleted - 1), level: Math.max(1, Math.floor(newXP / 500) + 1) }; });
      }
    }
  }, []);

  const skipHabit = useCallback((id: string, date?: string, reason?: string) => {
    const targetDate = date ?? getTodayStr();
    setHabits((prev) => prev.map((h) => {
      if (h.id !== id) return h;
      const existing = h.completions.findIndex((c) => c.date === targetDate);
      let newCompletions = existing >= 0 ? h.completions.map((c, i) => i === existing ? { ...c, completed: false, skipReason: reason || undefined } : c) : [...h.completions, { date: targetDate, completed: false, skipReason: reason || undefined }];
      const newStreak = calcStreak(newCompletions, h.frequency, h.customDays);
      let comebackUntil = h.comebackUntil;
      let prevStreak = h.prevStreak;
      if (h.streak > 7 && newStreak === 0 && !h.comebackUntil) {
        const d = new Date(); d.setDate(d.getDate() + 5);
        comebackUntil = d.toISOString().split("T")[0];
        prevStreak = h.streak;
      }
      return { ...h, completions: newCompletions, streak: newStreak, comebackUntil, prevStreak };
    }));
  }, []);

  const getTodayProgress = useCallback(() => {
    const dueHabits = habits.filter(isHabitDueToday);
    const completed = dueHabits.filter((h) => getTodayCompletion(h)?.completed);
    return { completed: completed.length, total: dueHabits.length };
  }, [habits, isHabitDueToday, getTodayCompletion]);

  const getProgressForDate = useCallback((dateStr: string) => {
    const dueHabits = habits.filter((h) => isHabitDueOnDate(h, dateStr));
    const completed = dueHabits.filter((h) => h.completions.find((comp) => comp.date === dateStr)?.completed);
    return { completed: completed.length, total: dueHabits.length };
  }, [habits, isHabitDueOnDate]);

  const getStreak = useCallback((habit: Habit) => calcStreak(habit.completions, habit.frequency, habit.customDays), []);
  const addRoutine = useCallback((routine: Omit<Routine, "id" | "createdAt">) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newRoutine: Routine = { ...routine, id, createdAt: Date.now() };
    const validated = RoutineSchema.safeParse(newRoutine);
    if (!validated.success) { console.error("[FOCUS] addRoutine validation failed", validated.error); throw new Error(validated.error.errors[0].message); }
    setRoutines((prev) => [...prev, newRoutine]);
  }, []);
  const deleteRoutine = useCallback((id: string) => setRoutines((prev) => prev.filter((r) => r.id !== id)), []);
  const updateRoutine = useCallback((id: string, updates: Partial<Omit<Routine, "id" | "createdAt">>) => setRoutines((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r))), []);

  const logPomodoroSession = useCallback((session: Omit<PomodoroSession, "id">) => {
    const newSession: PomodoroSession = { ...session, id: Date.now().toString() + Math.random().toString(36).substr(2, 9) };
    setPomodoroSessions((prev) => [newSession, ...prev].slice(0, 200));
    if (session.type === "work") {
      const xpGain = Math.floor(session.duration / 60) * 5;
      setUserStats((prev) => {
        const newXP = prev.totalXP + xpGain;
        const newLevel = Math.floor(newXP / 500) + 1;
        if (newLevel > prev.level) setTimeout(() => setLastLevelUp(newLevel), 500);
        return { ...prev, totalXP: newXP, level: newLevel };
      });
    }
  }, []);

  const completeMicroHabit = useCallback((id: string, microValue?: number) => {
    const today = getTodayStr();
    setHabits((prev) => prev.map((h) => {
      if (h.id !== id) return h;
      const existing = h.completions.findIndex((c) => c.date === today);
      const alreadyCompleted = existing >= 0 && h.completions[existing].completed;
      const newCompletions = existing >= 0 ? h.completions.map((c, i) => i === existing ? { ...c, completed: true, value: microValue, isMicro: true, timestamp: Date.now() } : c) : [...h.completions, { date: today, completed: true, value: microValue, isMicro: true, timestamp: Date.now() }];
      const newStreak = calcStreak(newCompletions, h.frequency, h.customDays);
      return { ...h, completions: newCompletions, streak: newStreak, longestStreak: Math.max(h.longestStreak, newStreak), xpPoints: h.xpPoints + (alreadyCompleted ? 0 : Math.ceil((h.difficulty === "easy" ? 10 : h.difficulty === "medium" ? 20 : 30) * 0.5)) };
    }));
    const habit = habitsRef.current.find((h) => h.id === id);
    if (habit && !habit.completions.find((c) => c.date === today && c.completed)) {
      setUserStats((prev) => { const newXP = prev.totalXP + Math.ceil((habit.difficulty === "easy" ? 10 : habit.difficulty === "medium" ? 20 : 30) * 0.5); return { ...prev, totalXP: newXP, totalCompleted: prev.totalCompleted + 1, level: Math.floor(newXP / 500) + 1 }; });
    }
  }, []);

  const freezeStreak = useCallback((id: string) => { skipHabit(id); setUserStats((prev) => ({ ...prev, freezeTokens: Math.max(0, prev.freezeTokens - 1) })); }, [skipHabit]);
  const retroactiveEdit = useCallback((id: string, date: string, completed: boolean) => {
    setHabits((prev) => prev.map((h) => {
      if (h.id !== id) return h;
      const existing = h.completions.findIndex((c) => c.date === date);
      let newCompletions = existing >= 0 ? h.completions.map((c, i) => i === existing ? { ...c, completed, timestamp: Date.now() } : c) : [...h.completions, { date, completed, timestamp: Date.now() }];
      const newStreak = calcStreak(newCompletions, h.frequency, h.customDays);
      return { ...h, completions: newCompletions, streak: newStreak, longestStreak: Math.max(h.longestStreak, newStreak) };
    }));
  }, []);

  const clearAllData = useCallback(async () => {
    setHabits([]); setRoutines([]); setUserStats(DEFAULT_STATS); setPomodoroSessions([]); setStepsByDate({}); setCalendarEvents([]);
    await StorageService.clearAll();
  }, []);

  const addCalendarEvent = useCallback((ev: Omit<CalendarEvent, "id" | "createdAt">): string => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newEv: CalendarEvent = { ...ev, id, createdAt: Date.now() };
    setCalendarEvents((prev) => [...prev, newEv]); return id;
  }, []);
  const updateCalendarEvent = useCallback((id: string, updates: Partial<CalendarEvent>) => setCalendarEvents((prev) => prev.map((ev) => (ev.id === id ? { ...ev, ...updates } : ev))), []);
  const deleteCalendarEvent = useCallback((id: string) => setCalendarEvents((prev) => prev.filter((ev) => ev.id !== id)), []);
  const toggleEventComplete = useCallback((id: string) => setCalendarEvents((prev) => prev.map((ev) => (ev.id === id ? { ...ev, completed: !ev.completed } : ev))), []);

  const loadMockData = useCallback(async () => {
    const hData = dedupeHabits(SAMPLE_HABITS); setHabits(hData); setRoutines(SAMPLE_ROUTINES); setUserStats(SAMPLE_USER_STATS); setPomodoroSessions(SAMPLE_POMODORO); setStepsByDate(SAMPLE_STEPS); setCalendarEvents(SAMPLE_EVENTS);
    await StorageService.multiSet({
      [STORAGE_KEYS.HABITS]: hData,
      [STORAGE_KEYS.ROUTINES]: SAMPLE_ROUTINES,
      [STORAGE_KEYS.STATS]: SAMPLE_USER_STATS,
      [STORAGE_KEYS.POMODORO]: SAMPLE_POMODORO,
      [STORAGE_KEYS.STEPS]: SAMPLE_STEPS,
      [STORAGE_KEYS.CALENDAR]: SAMPLE_EVENTS,
    });
  }, []);

  const stateValue = useMemo(() => ({
    habits, routines, userStats, pomodoroSessions, stepsByDate, calendarEvents,
    lastBadgeEarned, lastLevelUp, lastStreakMilestone, loaded
  }), [habits, routines, userStats, pomodoroSessions, stepsByDate, calendarEvents, lastBadgeEarned, lastLevelUp, lastStreakMilestone, loaded]);

  const actionsValue = useMemo(() => ({
    addHabit, updateHabit, archiveHabit, unarchiveHabit, deleteHabit, completeHabit, uncompleteHabit, completeMicroHabit,
    updateUserStats, skipHabit, getTodayCompletion, getCompletionForDate, isHabitDueToday, isHabitDueOnDate,
    getTodayProgress, getProgressForDate, getStreak, addRoutine, updateRoutine, deleteRoutine,
    logPomodoroSession, freezeStreak, retroactiveEdit, clearAllData, logSteps, updateStepsGoal,
    updateUsername, exportData, importData, loadMockData, clearLastBadgeEarned, clearLastLevelUp,
    clearLastStreakMilestone, addCalendarEvent, updateCalendarEvent, deleteCalendarEvent, toggleEventComplete
  }), [addHabit, updateHabit, archiveHabit, unarchiveHabit, deleteHabit, completeHabit, uncompleteHabit, completeMicroHabit, updateUserStats, skipHabit, getTodayCompletion, getCompletionForDate, isHabitDueToday, isHabitDueOnDate, getTodayProgress, getProgressForDate, getStreak, addRoutine, updateRoutine, deleteRoutine, logPomodoroSession, freezeStreak, retroactiveEdit, clearAllData, logSteps, updateStepsGoal, updateUsername, exportData, importData, loadMockData, clearLastBadgeEarned, clearLastLevelUp, clearLastStreakMilestone, addCalendarEvent, updateCalendarEvent, deleteCalendarEvent, toggleEventComplete]);

  return (
    <HabitsStateContext.Provider value={stateValue}>
      <HabitsActionsContext.Provider value={actionsValue}>
        {children}
      </HabitsActionsContext.Provider>
    </HabitsStateContext.Provider>
  );
}

export function useHabitsState() {
  const ctx = useContext(HabitsStateContext);
  if (!ctx) throw new Error("useHabitsState must be used within HabitsProvider");
  return ctx;
}

export function useHabitsActions() {
  const ctx = useContext(HabitsActionsContext);
  if (!ctx) throw new Error("useHabitsActions must be used within HabitsProvider");
  return ctx;
}

// ── DEPRECATED: For backward compatibility ──────────────────────────────────
export function useHabits() {
  const state = useHabitsState();
  const actions = useHabitsActions();
  return { ...state, ...actions };
}
