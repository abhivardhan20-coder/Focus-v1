export interface Badge {
  id: string;
  name: string;
  desc: string;
  icon: string;
  color: string;
}

export const BADGES: Badge[] = [
  { id: "first_habit",   name: "First Step",        desc: "Complete your very first habit",              icon: "flag",         color: "#13EC5B" },
  { id: "streak_7",      name: "One Week",           desc: "Maintain a 7-day streak on any habit",        icon: "trending-up",  color: "#3B82F6" },
  { id: "streak_14",     name: "Two Weeks",          desc: "Maintain a 14-day streak on any habit",       icon: "trending-up",  color: "#06B6D4" },
  { id: "streak_30",     name: "Month Warrior",      desc: "Maintain a 30-day streak on any habit",       icon: "award",        color: "#F97316" },
  { id: "streak_60",     name: "Bimonthly Beast",    desc: "Maintain a 60-day streak on any habit",       icon: "shield",       color: "#A855F7" },
  { id: "streak_100",    name: "Century Club",       desc: "Maintain a 100-day streak on any habit",      icon: "hexagon",      color: "#FBBF24" },
  { id: "perfectionist", name: "Perfectionist",      desc: "Complete 100% of your habits on a full day",  icon: "check-circle", color: "#13EC5B" },
  { id: "xp_1000",       name: "XP Rookie",          desc: "Earn 1,000 total XP",                         icon: "zap",          color: "#06B6D4" },
  { id: "xp_5000",       name: "XP Warrior",         desc: "Earn 5,000 total XP",                         icon: "zap",          color: "#A855F7" },
  { id: "xp_10000",      name: "XP Legend",          desc: "Earn 10,000 total XP",                        icon: "zap",          color: "#F97316" },
  { id: "pomodoro_10",   name: "Focus Initiate",     desc: "Complete 10 Pomodoro sessions",               icon: "target",       color: "#13EC5B" },
  { id: "pomodoro_50",   name: "Deep Worker",        desc: "Complete 50 Pomodoro sessions",               icon: "target",       color: "#3B82F6" },
  { id: "habit_5",       name: "Habit Builder",      desc: "Have 5 active habits",                        icon: "plus-circle",  color: "#F97316" },
  { id: "habit_10",      name: "Habit Master",       desc: "Have 10 active habits",                       icon: "star",         color: "#FBBF24" },
  { id: "all_pillars",   name: "Pillar Master",      desc: "Have habits in all 5 life pillars",           icon: "layers",       color: "#EC4899" },
  { id: "level_5",       name: "Rising Star",        desc: "Reach Level 5",                               icon: "star",         color: "#F97316" },
  { id: "level_10",      name: "Veteran",            desc: "Reach Level 10",                              icon: "hexagon",      color: "#A855F7" },
  { id: "comeback",      name: "Comeback Kid",       desc: "Complete a habit while on Comeback Protocol", icon: "refresh-cw",   color: "#FBBF24" },
];

export function getBadge(id: string): Badge | undefined {
  return BADGES.find((b) => b.id === id);
}
