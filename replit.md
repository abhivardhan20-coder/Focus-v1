# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.
Contains a FOCUS habit-tracking mobile app (Expo/React Native) with glassmorphic UI.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## FOCUS Mobile App (`artifacts/mobile`)

**Stack**: Expo ~54, React Native 0.81, expo-router ~6, react-native-reanimated ~4, AsyncStorage only

### Architecture
- `app/(tabs)/` — tab screens: index (home), analysis, history, settings
- `app/habit/[id].tsx` — habit detail/analytics sheet
- `app/create.tsx` — habit creation modal
- `app/pomodoro.tsx` — Pomodoro timer
- `context/` — React Context providers (HabitsContext, ThemeContext, GraphPreferencesContext)
- `components/` — shared UI components (HabitCard, RadialMenu, charts, etc.)
- `constants/` — themes.ts (10 themes), fonts.ts (5 fonts), colors.ts
- `lib/` — notifications.ts, soundscape.ts
- `hooks/` — useColors.ts, useFont.ts

### Context Providers (loaded in `_layout.tsx`)
1. **ThemeProvider** (`context/ThemeContext.tsx`) — 10 themes, 5 fonts, `colorMode: "light"|"dark"|"system"` with light color generation. Persists to AsyncStorage.
2. **GraphPreferencesProvider** (`context/GraphPreferencesContext.tsx`) — Per-global/category/routine/habit graph type preferences (`bar|line|heatmap|ring|area`). Persists to AsyncStorage.
3. **HabitsProvider** (`context/HabitsContext.tsx`) — All habit/routine/stats data. AsyncStorage only (no backend).

### Features
- **Habits**: binary, timed, quantitative types; daily/weekday/weekend/custom frequencies
- **XP & Streaks**: difficulty-based XP, grace period streaks (3 days), freeze tokens
- **Pomodoro Timer**: work/break sessions, XP reward
- **Analytics**: WeeklyBarChart, HeatmapChart, ProgressRing, PentagonChart, CategoryDrillDown
- **Routines**: grouped habits
- **Step Tracking**: pedometer on native, manual on web
- **Notifications**: scheduled daily reminders, tap → navigate to habit (native), re-sync, test
- **10 Themes**: midnight, emerald, sunset, sand, cyber, ocean, graphite, mint, royal, rose
- **5 Fonts**: Inter, Space Grotesk, Outfit, Manrope, Plus Jakarta Sans
- **Color Modes**: Light / Dark / System (light mode generates per-theme light palette)
- **Graph Preferences**: global + per-category/routine/habit graph type overrides
- **Data Management**: full JSON export/import (includes appearance + graphPrefs), true clear-all (saves `[]`, not sample habits), sample JSON format viewer

### Settings Page Structure
1. Profile card (editable username, XP ring, level, badges)
2. Stats grid (active/done/frozen/archived)
3. **Color Mode** — Light / Dark / System toggle (default open)
4. **Theme & Typography** — 10 theme cards + 5 font cards
5. **Graph Preferences** — global default + per-category/routine/habit overrides + reset
6. **Notifications** — reminder management per habit
7. **Troubleshooting** — notification status, re-sync, test notification, step tracking info
8. **Data Management** — full export, full import (restores appearance), clear all, sample JSON
9. **About** — version, privacy, terms

### Notification tap behavior
`_layout.tsx` registers a `NotificationResponseHandler` component that listens for notification taps and calls `router.push('/habit/<habitId>')` on native.

### clearAllData behavior
`HabitsContext.clearAllData()` saves `[]` to `STORAGE_KEY` (instead of removing key), so on next load the empty array is found and sample habits are NOT reloaded. Sample habits only load on first-ever install (when `STORAGE_KEY` is null).
