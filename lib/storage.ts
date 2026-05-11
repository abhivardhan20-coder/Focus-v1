import AsyncStorage from "@react-native-async-storage/async-storage";

export const STORAGE_KEYS = {
  HABITS: "@focus_habits_v3",
  ROUTINES: "@focus_routines",
  STATS: "@focus_stats",
  POMODORO: "@focus_pomodoro",
  STEPS: "@focus_steps",
  CALENDAR: "@focus_calendar_events",
  STREAK_FREEZE: "@focus_streak_freeze",
};

export class StorageService {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (e) {
      console.error(`Error reading key ${key}:`, e);
      return null;
    }
  }

  static async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error saving key ${key}:`, e);
    }
  }

  static async multiGet(keys: string[]): Promise<Record<string, any>> {
    try {
      const pairs = await AsyncStorage.multiGet(keys);
      return pairs.reduce((acc, [key, value]) => {
        acc[key] = value ? JSON.parse(value) : null;
        return acc;
      }, {} as Record<string, any>);
    } catch (e) {
      console.error("Error multi-reading keys:", e);
      return {};
    }
  }

  static async multiSet(pairs: Record<string, any>): Promise<void> {
    try {
      const entries = Object.entries(pairs).map(([key, value]) => [
        key,
        JSON.stringify(value),
      ]) as [string, string][];
      await AsyncStorage.multiSet(entries);
    } catch (e) {
      console.error("Error multi-saving keys:", e);
    }
  }

  static async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.error(`Error removing key ${key}:`, e);
    }
  }

  static async clearAll(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (e) {
      console.error("Error clearing storage:", e);
    }
  }
}
