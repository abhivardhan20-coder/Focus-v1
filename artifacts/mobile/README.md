# FOCUS — Behavioral Habit Intelligence App

FOCUS is a premium Expo / React Native habit app built around glassmorphism, streak intelligence, and fast daily action. It covers habits, routines, focus sessions, analytics, reminders, settings, and retroactive history editing — all backed by AsyncStorage.

## What the app does

- Track binary, quantitative, and timed habits
- Group habits into routines
- Mark items done, skipped, frozen, archived, or edited retroactively
- Log Pomodoro focus sessions
- View analytics through charts, heatmaps, and timelines
- Customize themes, fonts, graph styles, and reminders
- Import/export and clear app data

## Main screens

### Home
The home tab is the command center.

- Today’s habits grouped by pending, done, and skipped states
- Drag-to-reorder habit cards
- Long-press radial actions for complete, skip, freeze, and detail view
- Today progress, XP, streak, overdue, and focus summaries
- Week strip / saturation calendar for fast date switching
- Quick access to create habit and Pomodoro

### Analysis
A visual breakdown of habit consistency.

- Pillar-based analytics for physical, mental, academics, creativity, and chores
- Radar / pentagon style summaries
- Bar charts and timelines for streaks and completion trends
- Drill-down views by category and habit
- 1-year heatmap views for long-term pattern review

### History
A full history and retro-edit workspace.

- Calendar-based completion history
- Tap any past date to review and edit completions
- Retroactive changes recalculate streaks
- Clear visual distinction between completed, missed, skipped, and not-due days

### Settings
The control center for appearance, reminders, and data.

- Profile and level ring
- Theme picker
- Font picker
- Graph preference controls
- Reminder management per habit
- Import/export and reset actions
- About / privacy / terms links
- Demo data loader for testing the full app

### Habit detail
A deep dive for a single habit.

- Hero card with habit color, icon, and metadata
- Current streak, best streak, total done, and XP stats
- Completion rate ring and milestone progress
- Today action area for binary, quantitative, and timed habits
- 30-day timeline and longer heatmap views
- Reminder controls and edit form
- Archive and delete actions

### Create habit
A streamlined creation flow.

- Binary, quantitative, or timed habit types
- Categories, icons, colors, frequency, priority, and difficulty
- Quantitative targets and units
- Natural-language assisted parsing from the name field

### Routine creation
Create grouped habit routines.

- Bundle habits into a named routine
- Assign reminder time and schedule
- View and edit routine details later

### Pomodoro
A focus timer with analytics.

- Work, break, and custom timer modes
- Session logging and focus streak support
- Focus analytics with 7-day, 30-day, and 1-year heatmap views
- Clean timer-first UI with fast phase switching

## UX notes

- Dark, premium, glass-card visual style
- Strong color coding by category and state
- Smooth animations and haptic feedback on mobile
- Fast one-handed actions on the home screen
- Clear separation of pending, done, and skipped states
- Quantitative and timed habits only count as done when targets are actually reached

## Data model overview

The app stores:

- habits
- routines
- user stats
- Pomodoro sessions
- steps data
- calendar events

All data is persisted locally with AsyncStorage.

## Demo data

The app includes a demo loader that seeds sample habits, routines, stats, focus sessions, steps, and calendar items so you can verify most features quickly.

## Tech stack

- Expo / React Native
- Expo Router
- AsyncStorage
- React Native Animated / Reanimated
- SVG charts
- Feather icons
- Expo notifications
- Theme and font contexts

## Core behaviors

- Complete, skip, freeze, archive, and delete habits
- Reorder habits by drag and drop
- Track streaks and XP
- Edit past dates from History
- Sync and cancel reminders
- Export, import, and clear data
- Switch themes, fonts, and analytics styles
