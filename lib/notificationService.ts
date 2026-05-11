import { Platform } from "react-native";
import {
  scheduleHabitReminder,
  requestNotificationPermission,
  getNotificationSupport,
  cancelHabitReminder,
} from "./notifications";

export type NotifRecurrence = "once" | "twice" | "custom";

export interface NotificationPayload {
  id: string;
  name: string;
  reminderTime: string;
  recurrence?: NotifRecurrence;
  customIntervalH?: number;
  customIntervalM?: number;
}

/**
 * Centralized service for habit and routine notifications.
 * Handles permission checks and complex recurrence logic.
 */
export const notificationService = {
  /**
   * Schedules notifications based on recurrence settings.
   */
  async schedule(payload: NotificationPayload) {
    const {
      id,
      name,
      reminderTime,
      recurrence = "once",
      customIntervalH,
      customIntervalM,
    } = payload;

    const support = getNotificationSupport();
    if (support === "none") return false;

    const granted = await requestNotificationPermission();
    if (!granted) return false;

    // Always schedule the primary reminder
    await scheduleHabitReminder(id, name, reminderTime, 0);

    // Handle "Twice" recurrence (Primary + Midpoint to EOD)
    if (recurrence === "twice") {
      const [hh, mm] = reminderTime.split(":").map(Number);
      const remMin = hh * 60 + mm;
      // Midpoint between reminder time and 11:59 PM
      const midMin = Math.round((remMin + 23 * 60 + 59) / 2);
      const midHH = String(Math.floor(midMin / 60)).padStart(2, "0");
      const midMM = String(midMin % 60).padStart(2, "0");
      
      await scheduleHabitReminder(`${id}_2`, name, `${midHH}:${midMM}`, 0);
    } 
    
    // Handle "Custom" recurrence
    // Note: This is a placeholder for future complex interval scheduling.
    // Currently, expo-notifications daily trigger doesn't support "every X hours" 
    // natively without scheduling multiple specific times.
    if (recurrence === "custom" && (customIntervalH || customIntervalM)) {
      // In a real app, we'd calculate multiple slots here.
      // For now, we'll just stick to the primary one to avoid overwhelming the scheduler.
      console.log(`[NotificationService] Custom interval ${customIntervalH}h ${customIntervalM}m requested for ${id}`);
    }

    return true;
  },

  /**
   * Cancels all notifications associated with an ID.
   */
  async cancel(id: string) {
    await cancelHabitReminder(id);
    await cancelHabitReminder(`${id}_2`); // Cancel second slot if it exists
  },

  /**
   * Reschedules notifications for a list of active items.
   * Useful after app updates or data imports.
   */
  async sync(items: NotificationPayload[]) {
    for (const item of items) {
      await this.schedule(item);
    }
  }
};
