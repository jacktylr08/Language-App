import {
  touchStreak,
  currentStreak,
  recordWordResult,
  getMistakeWordIds,
  loadProgress,
  recentActivity,
  placeLearnerAtWeek,
  isLessonDone,
  completeLessonLocal,
  knownWordCount,
  masteredWordCount,
} from '../progress';
import type { ProgressState } from '../progress';

const DAY = 24 * 60 * 60 * 1000;

function setNow(iso: string) {
  jest.setSystemTime(new Date(iso));
}

describe('streaks', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts a streak of 1 on the first day of activity', () => {
    setNow('2026-01-10T09:00:00.000Z');
    const state = touchStreak();
    expect(state.streak).toBe(1);
    expect(state.bestStreak).toBe(1);
    expect(currentStreak(state)).toBe(1);
  });

  it('extends the streak on consecutive days', () => {
    setNow('2026-01-10T09:00:00.000Z');
    touchStreak();
    setNow('2026-01-11T09:00:00.000Z');
    const state = touchStreak();
    expect(state.streak).toBe(2);
    expect(state.bestStreak).toBe(2);
  });

  it('resets the streak to 1 after a missed day', () => {
    setNow('2026-01-10T09:00:00.000Z');
    touchStreak();
    setNow('2026-01-13T09:00:00.000Z'); // skipped the 11th and 12th
    const state = touchStreak();
    expect(state.streak).toBe(1);
    expect(state.bestStreak).toBe(1); // the earlier streak of 1 isn't beaten
  });

  it('reports 0 once a day has been missed, without corrupting stored state', () => {
    setNow('2026-01-10T09:00:00.000Z');
    touchStreak();
    setNow('2026-01-13T09:00:00.000Z');
    const stale = loadProgress();
    expect(currentStreak(stale)).toBe(0);
    expect(stale.streak).toBe(1); // the raw stored value is untouched until they act again
  });

  it('does not bump the streak twice on the same day', () => {
    setNow('2026-01-10T09:00:00.000Z');
    touchStreak();
    const state = touchStreak();
    expect(state.streak).toBe(1);
  });
});

describe('recordWordResult', () => {
  beforeEach(() => localStorage.clear());

  it('increases strength (capped at 5) on repeated correct answers', () => {
    for (let i = 0; i < 8; i++) recordWordResult('hola', true);
    const state = loadProgress();
    expect(state.words.hola.strength).toBe(5);
    expect(state.words.hola.correct).toBe(8);
  });

  it('drops strength by 2 (floored at 0) on a wrong answer', () => {
    recordWordResult('hola', true); // strength -> 1
    recordWordResult('hola', false); // strength -> max(0, 1-2) = 0
    const state = loadProgress();
    expect(state.words.hola.strength).toBe(0);
    expect(state.words.hola.wrong).toBe(1);
  });

  it('schedules a real FSRS card, not a fixed lookup table', () => {
    recordWordResult('hola', true);
    const { fsrs, nextReview } = loadProgress().words.hola;
    expect(fsrs).toBeDefined();
    expect(fsrs!.reps).toBe(1);
    expect(new Date(nextReview).getTime()).toBeGreaterThan(Date.now() - DAY);
  });

  it('schedules a wrong answer sooner than a correct one, all else equal', () => {
    recordWordResult('correcto', true);
    recordWordResult('incorrecto', false);
    const state = loadProgress();
    const correctDue = new Date(state.words.correcto.nextReview).getTime();
    const wrongDue = new Date(state.words.incorrecto.nextReview).getTime();
    expect(wrongDue).toBeLessThanOrEqual(correctDue);
  });

  it('extends the interval further after consecutive correct reviews (real difficulty/stability modelling)', () => {
    recordWordResult('constante', true);
    const afterFirst = loadProgress().words.constante.fsrs!.stability;

    // Jump forward so the second review actually lands after the first is due,
    // matching how FSRS is meant to be driven (reviewing "on time").
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.now() + 2 * DAY));
    recordWordResult('constante', true);
    jest.useRealTimers();

    const afterSecond = loadProgress().words.constante.fsrs!.stability;
    expect(afterSecond).toBeGreaterThan(afterFirst);
  });

  it('keeps a lower-quality retry recall (firstTry=false) from scheduling as far out as a clean first-try', () => {
    recordWordResult('facil', true, true);
    const cleanDue = new Date(loadProgress().words.facil.nextReview).getTime();

    localStorage.clear();
    recordWordResult('dificil', true, false);
    const retryDue = new Date(loadProgress().words.dificil.nextReview).getTime();

    expect(retryDue).toBeLessThanOrEqual(cleanDue);
  });

  it('rates a clean first-try free recall as Easy, scheduling further out than the same result on a recognition exercise', () => {
    recordWordResult('recordado', true, true, 'recall');
    const recallDue = new Date(loadProgress().words.recordado.nextReview).getTime();

    localStorage.clear();
    recordWordResult('reconocido', true, true, 'recognition');
    const recognitionDue = new Date(loadProgress().words.reconocido.nextReview).getTime();

    expect(recallDue).toBeGreaterThan(recognitionDue);
  });

  it('defaults to the more conservative recognition rating when kind is unspecified', () => {
    recordWordResult('por-defecto', true, true);
    const defaultDue = new Date(loadProgress().words['por-defecto'].nextReview).getTime();

    localStorage.clear();
    recordWordResult('explicito', true, true, 'recognition');
    const explicitDue = new Date(loadProgress().words.explicito.nextReview).getTime();

    expect(defaultDue).toBe(explicitDue);
  });
});

describe('knownWordCount / masteredWordCount (real FSRS state, not the separate strength counter)', () => {
  beforeEach(() => localStorage.clear());

  it('does not count a brand-new word as known even though strength can be nonzero', () => {
    recordWordResult('nuevo', true); // strength 1, FSRS state still New after one rep
    const state = loadProgress();
    expect(knownWordCount(state)).toBe(0);
  });

  it('counts a word as known once FSRS has graduated it into a real review cycle', () => {
    recordWordResult('graduado', true, true, 'recall'); // Easy can graduate straight to Review
    const state = loadProgress();
    expect(knownWordCount(state)).toBe(1);
  });

  it('does not count a known word as mastered until FSRS stability clears the long-retention bar', () => {
    recordWordResult('conocido', true, true, 'recall');
    const state = loadProgress();
    // Freshly graduated: known, but nowhere near the 21-day mastery bar yet.
    expect(knownWordCount(state)).toBe(1);
    expect(masteredWordCount(state)).toBe(0);
  });
});

describe('getMistakeWordIds', () => {
  beforeEach(() => localStorage.clear());

  it('excludes words that have since been practised back up to strength', () => {
    recordWordResult('hola', false); // stays weak -> included
    for (let i = 0; i < 8; i++) recordWordResult('gracias', true); // never wrong -> excluded

    const ids = getMistakeWordIds();
    expect(ids).toContain('hola');
    expect(ids).not.toContain('gracias');
  });

  it('drops a word once it recovers to strength 4+, even if it was once wrong', () => {
    recordWordResult('adios', false);
    for (let i = 0; i < 5; i++) recordWordResult('adios', true); // climbs back to strength 5

    expect(getMistakeWordIds()).not.toContain('adios');
  });

  it('sorts the most-missed word first', () => {
    recordWordResult('hola', false);
    recordWordResult('hola', false);
    recordWordResult('adios', false);

    expect(getMistakeWordIds()[0]).toBe('hola');
  });
});

describe('recentActivity', () => {
  function state(activeDays: string[]): ProgressState {
    return { streak: 0, bestStreak: 0, lastActiveDay: '', activeDays, lessons: {}, words: {} };
  }

  it('returns one entry per day, oldest first, ending today', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-10T12:00:00.000Z'));

    const days = recentActivity(state(['2026-01-10', '2026-01-08']), 5);

    // 2026-01-06, 07, 08, 09, 10
    expect(days).toEqual([false, false, true, false, true]);
    jest.useRealTimers();
  });

  it('reports all-inactive for a brand-new learner with no activity yet', () => {
    expect(recentActivity(state([]), 7)).toEqual(new Array(7).fill(false));
  });
});

describe('placeLearnerAtWeek', () => {
  beforeEach(() => localStorage.clear());

  it('does nothing for a complete beginner (week 1 — nothing to skip)', () => {
    placeLearnerAtWeek(1);
    const state = loadProgress();
    expect(state.lessons['greetings-essentials']).toBeUndefined();
  });

  it('marks every lesson before the starting week as skipped, never completed', () => {
    placeLearnerAtWeek(5); // "beginner" level — skip Phase 1 (weeks 1-4)

    const state = loadProgress();
    // Week 1-4 lessons: skipped, not completed.
    expect(isLessonDone(state.lessons['greetings-essentials'])).toBe(true);
    expect(state.lessons['greetings-essentials'].completed).toBe(false);
    expect(state.lessons['greetings-essentials'].skipped).toBe(true);
    expect(state.lessons['week-review'].skipped).toBe(true);

    // Week 5+ lessons: untouched — still locked/undone, not skipped ahead too.
    expect(state.lessons['ar-verbs']).toBeUndefined();
  });

  it('never overwrites a lesson the learner actually completed for real', () => {
    completeLessonLocal('greetings-essentials', 92);
    placeLearnerAtWeek(5);

    const state = loadProgress();
    expect(state.lessons['greetings-essentials'].completed).toBe(true);
    expect(state.lessons['greetings-essentials'].bestAccuracy).toBe(92);
    // Real completion — never relabeled as a placement skip.
    expect(state.lessons['greetings-essentials'].skipped).toBeUndefined();
  });
});
