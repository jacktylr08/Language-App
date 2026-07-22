/**
 * Learner progress store — persisted in localStorage.
 * Tracks daily streak, lesson completion, and per-word memory strength so
 * the app adapts to the learner. Review scheduling (nextReview) runs on
 * FSRS — a modern, per-word difficulty/stability model that needs ~20-30%
 * fewer reviews than a fixed SM-2-style interval table for the same
 * retention (benchmarked across 500M+ real reviews). `strength` itself
 * stays a simple 0-5 indicator driving unrelated UI (known/mastered counts,
 * weakest-first sorting) — only the interval math changed.
 */
import { fsrs, createEmptyCard, Rating, type Card, type CardInput } from 'ts-fsrs';

const scheduler = fsrs();

/** Serializable subset of an FSRS Card — Dates stored as ISO strings for localStorage/JSON. */
export interface FsrsCardState {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review?: string;
}

export interface WordState {
  /** 0 = new, 5 = mastered */
  strength: number;
  correct: number;
  wrong: number;
  lastSeen: string; // ISO date
  nextReview: string; // ISO date — FSRS-scheduled
  /** FSRS scheduling state. Absent until the word's first recorded result. */
  fsrs?: FsrsCardState;
  /** Speaking-exercise attempts — the pronunciation signal. */
  pronCorrect?: number;
  pronWrong?: number;
}

export interface LessonRecord {
  completed: boolean;
  bestAccuracy: number; // 0-100
  timesCompleted: number;
  lastCompleted?: string;
  /**
   * True if this lesson was placed-out-of at onboarding (the learner said
   * they already knew this material) rather than actually completed in the
   * app. Distinct from `completed` on purpose: it still counts for unlocking
   * later lessons and for the tutor's sense of level/known vocab, but it
   * must NEVER be confused with a real completion — no stars, no accuracy,
   * no fake word-strength history. See placeLearnerAtWeek.
   */
  skipped?: boolean;
}

/** True if a lesson is behind the learner — really completed, or placed out of at onboarding. */
export function isLessonDone(rec?: LessonRecord): boolean {
  return !!(rec?.completed || rec?.skipped);
}

/** Highest course week behind the learner — done or placed-out-of. Default: week 1. */
export function weekReachedFor(state: ProgressState): number {
  let week = 1;
  for (const lesson of curriculum) {
    if (isLessonDone(state.lessons[lesson.slug])) week = Math.max(week, lesson.week);
  }
  return week;
}

export interface ProgressState {
  streak: number;
  bestStreak: number;
  lastActiveDay: string; // YYYY-MM-DD
  activeDays: string[]; // recent YYYY-MM-DD days (capped)
  lessons: Record<string, LessonRecord>; // slug -> record
  words: Record<string, WordState>; // vocab id -> state
}

import { PROGRESS_KEY } from './keys';
import { scheduleSync } from './sync';
import { curriculum } from './curriculum';

const KEY = PROGRESS_KEY;

/**
 * A fresh default state. This MUST be a factory (not a shared constant) —
 * callers go on to mutate the nested `words`/`lessons` objects
 * in-place (recordWordResult, completeLessonLocal, etc.) before saving. A
 * shared constant's nested objects would leak those mutations into every
 * future "no data yet" read for the lifetime of the page, until the first
 * save ever lands.
 */
function defaultState(): ProgressState {
  return {
    streak: 0,
    bestStreak: 0,
    lastActiveDay: '',
    activeDays: [],
    lessons: {},
    words: {},
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function loadProgress(): ProgressState {
  if (typeof window === 'undefined') return defaultState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

function save(state: ProgressState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    // Mirror the change to the account so it follows the learner across devices.
    scheduleSync();
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

/** Which of the last `days` days (oldest first, ending today) had activity — for a small streak strip. */
export function recentActivity(state: ProgressState, days = 14): boolean[] {
  const active = new Set(state.activeDays);
  const out: boolean[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(active.has(d.toISOString().slice(0, 10)));
  }
  return out;
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

/** Register today's activity for the streak — the only thing that persists across a session. */
export function touchStreak(): ProgressState {
  const state = loadProgress();
  touchToday(state);
  save(state);
  return state;
}

/**
 * Record the outcome of a vocab exercise and reschedule its next review via
 * FSRS. `firstTry` softens the rating for a word that was only got right on
 * a retry (still progress, just not as solid as a clean first-time recall) —
 * defaults to true so callers that don't track retries behave sensibly.
 */
export function recordWordResult(wordId: string, correct: boolean, firstTry = true): void {
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

  const now = new Date();
  const card: Card | CardInput = w.fsrs
    ? { ...w.fsrs, last_review: w.fsrs.last_review }
    : createEmptyCard(now);
  const rating = correct ? (firstTry ? Rating.Good : Rating.Hard) : Rating.Again;
  const { card: next } = scheduler.next(card, now, rating);

  w.fsrs = {
    due: next.due.toISOString(),
    stability: next.stability,
    difficulty: next.difficulty,
    elapsed_days: next.elapsed_days,
    scheduled_days: next.scheduled_days,
    learning_steps: next.learning_steps,
    reps: next.reps,
    lapses: next.lapses,
    state: next.state,
    last_review: next.last_review?.toISOString(),
  };
  w.nextReview = next.due.toISOString().slice(0, 10);

  state.words[wordId] = w;
  save(state);
}

/**
 * Record the outcome of a speaking exercise for a word — a separate signal
 * from vocab knowledge, so the tutor can tell "knows the word but mispronounces
 * it" from "doesn't know the word".
 */
export function recordPronunciationResult(wordId: string, correct: boolean): void {
  const state = loadProgress();
  const w: WordState = state.words[wordId] || {
    strength: 0,
    correct: 0,
    wrong: 0,
    lastSeen: '',
    nextReview: '',
  };
  if (correct) w.pronCorrect = (w.pronCorrect || 0) + 1;
  else w.pronWrong = (w.pronWrong || 0) + 1;
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

/**
 * Called once, at onboarding, when a learner self-reports being past
 * complete-beginner level. Marks every lesson strictly before `startWeek` as
 * `skipped` — never `completed` — so the lesson list stays honest about what
 * was actually done in the app, while unlocking, weekReached, and the
 * tutor's known-vocab all treat them as being genuinely at that point in the
 * course. A no-op for startWeek <= 1 (nothing to skip for a complete
 * beginner). Safe to call on an existing account: never overwrites a lesson
 * that's already really completed.
 */
export function placeLearnerAtWeek(startWeek: number): void {
  if (startWeek <= 1) return;
  const state = loadProgress();
  for (const lesson of curriculum) {
    if (lesson.week >= startWeek) continue;
    const existing = state.lessons[lesson.slug];
    if (existing?.completed) continue;
    state.lessons[lesson.slug] = existing
      ? { ...existing, skipped: true }
      : { completed: false, bestAccuracy: 0, timesCompleted: 0, skipped: true };
  }
  save(state);
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

/**
 * Words the learner has actually got wrong and not yet nailed down — the raw
 * material for a "review your mistakes" session. Sorted worst-first.
 */
export function getMistakeWordIds(limit = 40): string[] {
  const state = loadProgress();
  return Object.entries(state.words)
    .filter(([, w]) => w.wrong > 0 && w.strength < 4)
    .sort((a, b) => b[1].wrong - a[1].wrong || a[1].strength - b[1].strength)
    .map(([id]) => id)
    .slice(0, limit);
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
