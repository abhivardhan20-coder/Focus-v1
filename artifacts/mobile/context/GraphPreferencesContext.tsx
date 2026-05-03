import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type GraphType = "bar" | "line" | "heatmap" | "ring" | "area";

export const GRAPH_TYPE_LABELS: Record<GraphType, string> = {
  bar:     "Bar Chart",
  line:    "Line Chart",
  heatmap: "Heatmap",
  ring:    "Progress Ring",
  area:    "Area Chart",
};

export const GRAPH_TYPE_ICONS: Record<GraphType, string> = {
  bar:     "bar-chart-2",
  line:    "trending-up",
  heatmap: "grid",
  ring:    "pie-chart",
  area:    "activity",
};

export const GRAPH_TYPES: GraphType[] = ["bar", "line", "heatmap", "ring", "area"];

export interface GraphPreferences {
  global:     GraphType;
  byCategory: Record<string, GraphType>;
  byRoutine:  Record<string, GraphType>;
  byHabit:    Record<string, GraphType>;
}

export const DEFAULT_GRAPH_PREFS: GraphPreferences = {
  global:     "bar",
  byCategory: {},
  byRoutine:  {},
  byHabit:    {},
};

const GRAPH_PREFS_KEY = "@focus_graph_prefs";

interface GraphPrefsContextType {
  graphPrefs:           GraphPreferences;
  setGlobalGraphType:   (type: GraphType) => void;
  setCategoryGraphType: (category: string, type: GraphType) => void;
  setRoutineGraphType:  (routineId: string, type: GraphType) => void;
  setHabitGraphType:    (habitId: string, type: GraphType) => void;
  resetGraphPrefs:      () => void;
  loadGraphPrefs:       (prefs: Partial<GraphPreferences>) => void;
  getGraphTypeFor:      (scope: "global" | "category" | "routine" | "habit", id?: string) => GraphType;
}

const GraphPrefsContext = createContext<GraphPrefsContextType>({
  graphPrefs:           DEFAULT_GRAPH_PREFS,
  setGlobalGraphType:   () => {},
  setCategoryGraphType: () => {},
  setRoutineGraphType:  () => {},
  setHabitGraphType:    () => {},
  resetGraphPrefs:      () => {},
  loadGraphPrefs:       () => {},
  getGraphTypeFor:      () => "bar",
});

function persist(prefs: GraphPreferences) {
  AsyncStorage.setItem(GRAPH_PREFS_KEY, JSON.stringify(prefs)).catch(() => {});
}

export function GraphPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<GraphPreferences>(DEFAULT_GRAPH_PREFS);

  useEffect(() => {
    AsyncStorage.getItem(GRAPH_PREFS_KEY).then((raw) => {
      if (raw) {
        try { setPrefs({ ...DEFAULT_GRAPH_PREFS, ...JSON.parse(raw) }); } catch {}
      }
    });
  }, []);

  const setGlobalGraphType = useCallback((type: GraphType) => {
    setPrefs((prev) => { const n = { ...prev, global: type }; persist(n); return n; });
  }, []);

  const setCategoryGraphType = useCallback((category: string, type: GraphType) => {
    setPrefs((prev) => {
      const n = { ...prev, byCategory: { ...prev.byCategory, [category]: type } };
      persist(n); return n;
    });
  }, []);

  const setRoutineGraphType = useCallback((routineId: string, type: GraphType) => {
    setPrefs((prev) => {
      const n = { ...prev, byRoutine: { ...prev.byRoutine, [routineId]: type } };
      persist(n); return n;
    });
  }, []);

  const setHabitGraphType = useCallback((habitId: string, type: GraphType) => {
    setPrefs((prev) => {
      const n = { ...prev, byHabit: { ...prev.byHabit, [habitId]: type } };
      persist(n); return n;
    });
  }, []);

  const resetGraphPrefs = useCallback(() => {
    setPrefs(DEFAULT_GRAPH_PREFS);
    persist(DEFAULT_GRAPH_PREFS);
  }, []);

  const loadGraphPrefs = useCallback((incoming: Partial<GraphPreferences>) => {
    setPrefs((prev) => {
      const n = { ...prev, ...incoming };
      persist(n); return n;
    });
  }, []);

  const getGraphTypeFor = useCallback(
    (scope: "global" | "category" | "routine" | "habit", id?: string): GraphType => {
      if (scope === "global")   return prefs.global;
      if (scope === "category" && id) return prefs.byCategory[id] ?? prefs.global;
      if (scope === "routine"  && id) return prefs.byRoutine[id]  ?? prefs.global;
      if (scope === "habit"    && id) return prefs.byHabit[id]    ?? prefs.global;
      return prefs.global;
    },
    [prefs]
  );

  return (
    <GraphPrefsContext.Provider value={{
      graphPrefs: prefs, setGlobalGraphType, setCategoryGraphType,
      setRoutineGraphType, setHabitGraphType, resetGraphPrefs,
      loadGraphPrefs, getGraphTypeFor,
    }}>
      {children}
    </GraphPrefsContext.Provider>
  );
}

export function useGraphPrefs() {
  return useContext(GraphPrefsContext);
}
