import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import type { Habit } from "@/context/HabitsContext";

// ── Storage keys ────────────────────────────────────────────────────────────
const REMINDER_KEY = "@focus_reminders";
const NOTIF_ID_KEY = "@focus_notif_ids";

// ── Lazy import for expo-notifications (native only) ────────────────────────
// We do this lazily to avoid crashing on web where the module has limited support.
async function getNotifications() {
  if (Platform.OS === "web") return null;
  return await import("expo-notifications");
}

// ── Persistence helpers ──────────────────────────────────────────────────────
async function saveReminderMeta(habitId: string, time: string, habitName: string) {
  try {
    const raw = await AsyncStorage.getItem(REMINDER_KEY);
    let all: Record<string, { time: string; habitName: string }> = {};
    if (raw) {
      try { all = JSON.parse(raw); } catch { all = {}; }
    }
    all[habitId] = { time, habitName };
    await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify(all));
  } catch (e) {
    console.error("saveReminderMeta failed:", e);
  }
}

async function removeReminderMeta(habitId: string) {
  try {
    const raw = await AsyncStorage.getItem(REMINDER_KEY);
    if (!raw) return;
    let all: Record<string, { time: string; habitName: string }>;
    try { all = JSON.parse(raw); } catch { return; }
    if (all && all[habitId]) {
      delete all[habitId];
      await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify(all));
    }
  } catch {}
}

async function saveNotifId(habitId: string, notifId: string) {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_ID_KEY);
    let all: Record<string, string> = {};
    if (raw) {
      try { all = JSON.parse(raw); } catch { all = {}; }
    }
    all[habitId] = notifId;
    await AsyncStorage.setItem(NOTIF_ID_KEY, JSON.stringify(all));
  } catch {}
}

async function getNotifId(habitId: string): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_ID_KEY);
    if (!raw) return null;
    let all: Record<string, string>;
    try { all = JSON.parse(raw); } catch { return null; }
    return all[habitId] ?? null;
  } catch {
    return null;
  }
}

async function removeNotifId(habitId: string) {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_ID_KEY);
    if (!raw) return;
    let all: Record<string, string>;
    try { all = JSON.parse(raw); } catch { return; }
    if (all && all[habitId]) {
      delete all[habitId];
      await AsyncStorage.setItem(NOTIF_ID_KEY, JSON.stringify(all));
    }
  } catch {}
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Returns "full" on native, "web" if browser supports Notification API, "none" otherwise. */
export function getNotificationSupport(): "full" | "web" | "none" {
  if (Platform.OS !== "web") return "full";
  if (typeof window !== "undefined" && "Notification" in window) return "web";
  return "none";
}

/** Request notification permission from the OS (or browser). Returns true if granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    if (window.Notification.permission === "granted") return true;
    if (window.Notification.permission === "denied") return false;
    const result = await window.Notification.requestPermission();
    return result === "granted";
  }

  const Notifications = await getNotifications();
  if (!Notifications) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/** Schedule a daily repeating reminder for a habit. */
export async function scheduleHabitReminder(
  habitId: string,
  habitName: string,
  time: string,
  streak: number
): Promise<void> {
  await saveReminderMeta(habitId, time, habitName);

  const [hh, mm] = time.split(":").map(Number);
  const body =
    streak > 0
      ? `Don't break your ${streak}-day streak! Complete it now.`
      : "Time to build your habit. Let's go!";

  if (Platform.OS === "web") {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (window.Notification.permission !== "granted") return;

    const timerKey = `focus_timer_${habitId}`;
    const existingId = (window as any)[timerKey];
    if (existingId) clearTimeout(existingId);

    const now = new Date();
    const target = new Date();
    target.setHours(hh, mm, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const delay = target.getTime() - now.getTime();

    const timerId = setTimeout(() => {
      try {
        new window.Notification(`FOCUS · ${habitName}`, {
          body,
          icon: "/icon.png",
          tag: `habit-${habitId}`,
        });
      } catch {}
      // Re-schedule for tomorrow
      scheduleHabitReminder(habitId, habitName, time, streak);
    }, delay);

    (window as any)[timerKey] = timerId;
    return;
  }

  // Native — expo-notifications
  const Notifications = await getNotifications();
  if (!Notifications) return;

  // Cancel any existing scheduled notification for this habit
  const existingId = await getNotifId(habitId);
  if (existingId) {
    try { await Notifications.cancelScheduledNotificationAsync(existingId); } catch {}
  }

  try {
    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `FOCUS · ${habitName}`,
        body,
        data: { habitId },
        sound: true,
      },
      trigger: {
        hour: hh,
        minute: mm,
        repeats: true,
      },
    });
    await saveNotifId(habitId, notifId);
  } catch (e) {
    // Scheduling can fail in Expo Go simulator — silently ignore
  }
}

/** Cancel a scheduled reminder for a habit. */
export async function cancelHabitReminder(habitId: string): Promise<void> {
  await removeReminderMeta(habitId);

  if (Platform.OS === "web") {
    const timerKey = `focus_timer_${habitId}`;
    const existingId = (window as any)[timerKey];
    if (existingId) {
      clearTimeout(existingId);
      delete (window as any)[timerKey];
    }
    return;
  }

  const Notifications = await getNotifications();
  if (!Notifications) return;

  const notifId = await getNotifId(habitId);
  if (notifId) {
    try { await Notifications.cancelScheduledNotificationAsync(notifId); } catch {}
    await removeNotifId(habitId);
  }
}

/**
 * Called once on app startup.
 * Sets up the foreground notification handler and reschedules any habits
 * that have a reminderTime but whose notification was lost (e.g. after reinstall).
 */
export async function initializeNotifications(habits: Habit[]): Promise<void> {
  const habitsWithReminder = habits.filter((h) => !h.archived && h.reminderTime);
  if (habitsWithReminder.length === 0) return;

  if (Platform.OS === "web") {
    if (typeof window === "undefined" || window.Notification?.permission !== "granted") return;
    for (const h of habitsWithReminder) {
      await scheduleHabitReminder(h.id, h.name, h.reminderTime!, h.streak);
    }
    return;
  }

  const Notifications = await getNotifications();
  if (!Notifications) return;

  // Check permission first — don't request here, just silently skip if not granted
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;

  // Find which habits already have a live scheduled notification
  let scheduled: { identifier: string; content: { data?: Record<string, unknown> | null } }[] = [];
  try {
    scheduled = await Notifications.getAllScheduledNotificationsAsync();
  } catch {}

  const scheduledHabitIds = new Set<string>(
    scheduled
      .map((n) => n.content.data?.["habitId"] as string | undefined)
      .filter((id): id is string => typeof id === "string")
  );

  // Reschedule only missing ones
  for (const h of habitsWithReminder) {
    if (!scheduledHabitIds.has(h.id)) {
      await scheduleHabitReminder(h.id, h.name, h.reminderTime!, h.streak);
    }
  }
}

/** Format "HH:MM" → "7:30 AM" */
export function formatReminderTime(time: string): string {
  const [hh, mm] = time.split(":").map(Number);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h = hh % 12 || 12;
  return `${h}:${mm.toString().padStart(2, "0")} ${ampm}`;
}
