/**
 * Learner progress store — persisted in localStorage.
 * Tracks XP, daily streak, lesson completion, and per-word memory strength
 * (a lightweight SM-2 spaced-repetition model) so the app adapts to the learner.
 */

export interface WordState {
  /** 0 = new, 5 = mastered */
  strength: number;
  correct: number;
  wrong: number;
  lastSeen: string; // ISO date
  nextReview: string; // ISO date
}

export interface LessonRecord {
  completed: boolean;
  bestAccuracy: number; // 0-100
  timesCompleted: number;
  lastCompleted?: string;
}

export interface ProgressState {
  xp: number;
  streak: number;
  bestStreak: number;
  lastActiveDay: string; // YYYY-MM-DD
  activeDays: string[]; // recent YYYY-MM-DD days (capped)
  dailyXp: Record<string, number>; // YYYY-MM-DD -> xp earned that day
  dailyGoal: number;
  lessons: Record<string, LessonRecord>; // slug -> record
  words: Record<string, WordState>; // vocab id -> state
}

const KEY = 'aprende-progress-v1';

const DEFAULT_STATE: ProgressState = {
  xp: 0,
  streak: 0,
  bestStreak: 0,
  lastActiveDay: '',
  activeDays: [],
  dailyXp: {},
  dailyGoal: 30,
  lessons: {},
  words: {},
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function loadProgress(): ProgressState {
  if (typeof window === 'undefined') return { ...DEFAULT_STATE };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_STATE };
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function save(state: ProgressState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable — progress just won't persist */
  }
}

/** Streak as it should display right now (0 if the chain is broken). */
export function currentStreak(state: ProgressState): number {
  if (state.lastActiveDay === today() || state.lastActiveDay === yesterday()) {
    return state.streak;
  }
  return 0;
}

/** Register activity today: maintains the streak chain. Mutates + saves. */
function touchToday(state: ProgressState): void {
  const t = today();
  if (state.lastActiveDay === t) return;
  if (state.lastActiveDay === yesterday()) {
    state.streak += 1;
  } else {
    state.streak = 1;
  }
  state.bestStreak = Math.max(state.bestStreak, state.streak);
  state.lastActiveDay = t;
  if (!state.activeDays.includes(t)) {
    state.activeDays.push(t);
    if (state.activeDays.length > 60) state.activeDays = state.activeDays.slice(-60);
  }
}

export function addXp(amount: number): ProgressState {
  const state = loadProgress();
  touchToday(state);
  state.xp += amount;
  const t = today();
  state.dailyXp[t] = (state.dailyXp[t] || 0) + amount;
  // Keep dailyXp map small
  const keys = Object.keys(state.dailyXp).sort();
  if (keys.length > 60) {
    for (const k of keys.slice(0, keys.length - 60)) delete state.dailyXp[k];
  }
  save(state);
  return state;
}

export function todaysXp(state: ProgressState): number {
  return state.dailyXp[today()] || 0;
}

/** SM-2-lite intervals (days) by strength level */
const INTERVALS = [0, 1, 3, 7, 14, 30];

export function recordWordResult(wordId: string, correct: boolean): void {
  const state = loadProgress();
  const w: WordState = state.words[wordId] || {
    strength: 0,
    correct: 0,
    wrong: 0,
    lastSeen: '',
    nextReview: '',
  };
  if (correct) {
    w.strength = Math.min(5, w.strength + 1);
    w.correct += 1;
  } else {
    w.strength = Math.max(0, w.strength - 2);
    w.wrong += 1;
  }
  w.lastSeen = today();
  const next = new Date();
  next.setDate(next.getDate() + INTERVALS[w.strength]);
  w.nextReview = next.toISOString().slice(0, 10);
  state.words[wordId] = w;
  save(state);
}

export function completeLessonLocal(slug: string, accuracy: number): ProgressState {
  const state = loadProgress();
  touchToday(state);
  const rec: LessonRecord = state.lessons[slug] || {
    completed: false,
    bestAccuracy: 0,
    timesCompleted: 0,
  };
  rec.completed = true;
  rec.bestAccuracy = Math.max(rec.bestAccuracy, accuracy);
  rec.timesCompleted += 1;
  rec.lastCompleted = new Date().toISOString();
  state.lessons[slug] = rec;
  save(state);
  return state;
}

/** Words due for review (or the weakest known words if nothing is due). */
export function getReviewWordIds(limit = 12): { due: string[]; weak: string[] } {
  const state = loadProgress();
  const t = today();
  const known = Object.entries(state.words).filter(([, w]) => w.correct + w.wrong > 0);
  const due = known
    .filter(([, w]) => w.nextReview && w.nextReview <= t)
    .sort((a, b) => a[1].strength - b[1].strength)
    .map(([id]) => id);
  const weak = known
    .sort((a, b) => a[1].strength - b[1].strength || b[1].wrong - a[1].wrong)
    .map(([id]) => id);
  return { due: due.slice(0, limit), weak: weak.slice(0, limit) };
}

export function knownWordCount(state: ProgressState): number {
  return Object.values(state.words).filter((w) => w.strength >= 2).length;
}

export function masteredWordCount(state: ProgressState): number {
  return Object.values(state.words).filter((w) => w.strength >= 5).length;
}

/** Stars (0-3) earned for a lesson based on best accuracy */
export function lessonStars(rec?: LessonRecord): number {
  if (!rec || !rec.completed) return 0;
  if (rec.bestAccuracy >= 95) return 3;
  if (rec.bestAccuracy >= 80) return 2;
  return 1;
}
